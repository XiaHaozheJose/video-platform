import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message, MessageType, MessageStatus, MessagePriority } from '../entities/message.entity';
import { CreateMessageDto, MarkReadDto } from '../dto/message.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../user/services/mail.service';
import { MessageTemplateService } from './message-template.service';
import { AuthService } from '../../user/services/auth.service';

interface MessageMetadata {
  relatedId?: string;
  relatedType?: string;
  link?: string;
  extra?: any;
  status?: string;
  result?: any;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private eventEmitter: EventEmitter2,
    private mailService: MailService,
    private templateService: MessageTemplateService,
    private authService: AuthService,
    private readonly logger: Logger,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const message = this.messageRepository.create({
      sender: createMessageDto.senderId ? { id: createMessageDto.senderId } : null,
      receiver: { id: createMessageDto.receiverId },
      ...createMessageDto,
    });

    const savedMessage = await this.messageRepository.save(message);

    // 发送消息创建事件
    this.eventEmitter.emit('message.created', savedMessage);

    // 如果需要发送邮件通知
    if (createMessageDto.sendEmail) {
      await this.sendEmailNotification(savedMessage);
    }

    return savedMessage;
  }

  private async sendEmailNotification(message: Message): Promise<void> {
    // 获取接收者信息
    const receiver = await this.authService.findUserById(message.receiver.id);
    if (!receiver?.email) return;

    // 根据消息类型获取邮件模板
    let templateKey: string;
    switch (message.type) {
      case MessageType.REPORT:
        templateKey = message.metadata?.status ? 'report.processed' : 'report.created';
        break;
      case MessageType.COMMENT:
        templateKey = 'comment.reply';
        break;
      default:
        templateKey = 'default';
    }

    // 生成邮件内容
    const content = this.templateService.getMessageContent(templateKey, {
      ...message.metadata,
      title: message.title,
      content: message.content,
      time: new Date().toLocaleString(),
    });

    // 发送邮件
    await this.mailService.sendEmail({
      to: receiver.email,
      subject: message.title,
      html: content,
    });
  }

  // 批量创建系统消息
  async createSystemMessages(
    userIds: string[],
    title: string,
    content: string,
    metadata?: any,
    sendEmail: boolean = false
  ): Promise<void> {
    const messages = userIds.map(userId => ({
      type: MessageType.SYSTEM,
      receiver: { id: userId },
      title,
      content,
      metadata,
      priority: MessagePriority.NORMAL,
    }));

    const savedMessages = await this.messageRepository.save(messages);

    if (sendEmail) {
      // 异步发送邮件通知
      Promise.all(
        savedMessages.map(message => this.sendEmailNotification(message))
      ).catch(error => {
        this.logger.error('Failed to send email notifications', error.stack);
      });
    }
  }

  // 监听举报事件
  @OnEvent('report.created')
  async handleReportCreated(report: any) {
    // 发送消息给管理员
    await this.createSystemMessages(
      ['admin'], // 这里应该是获取所有管理员ID
      '新举报处理',
      `收到一个新的${report.type}举报，请及时处理`,
      {
        relatedId: report.id,
        relatedType: 'report',
        link: `/admin/reports/${report.id}`
      }
    );
  }

  // 监听举报处理事件
  @OnEvent('report.processed')
  async handleReportProcessed(report: any) {
    await this.create({
      type: MessageType.REPORT,
      receiverId: report.reporter.id,
      title: '举报处理结果通知',
      content: `您的举报已处理，处理结果：${report.status}`,
      metadata: {
        relatedId: report.id,
        relatedType: 'report',
        result: report.result,
        status: report.status
      } as MessageMetadata
    });
  }

  // 标记消息为已读
  async markAsRead(userId: string, dto: MarkReadDto): Promise<void> {
    await this.messageRepository.update(
      {
        id: In(dto.messageIds),
        receiver: { id: userId }, // 确保只能标记自己的消息
      },
      {
        status: MessageStatus.READ,
        readAt: new Date()
      }
    );

    // 发送消息状态更新事件
    this.eventEmitter.emit('message.statusUpdated', {
      userId,
      messageIds: dto.messageIds,
      status: MessageStatus.READ
    });
  }

  // 获取用户消息列表
  async getUserMessages(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: MessageType;
      status?: MessageStatus;
    } = {}
  ) {
    const { page = 1, limit = 20, type, status } = options;
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.receiver.id = :userId', { userId })
      .orderBy('message.createdAt', 'DESC');

    if (type) {
      queryBuilder.andWhere('message.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('message.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  // 删除消息
  async deleteMessages(userId: string, messageIds: string[]): Promise<void> {
    await this.messageRepository.update(
      {
        id: In(messageIds),
        receiver: { id: userId },
      },
      {
        status: MessageStatus.DELETED
      }
    );
  }

  // 归档消息
  async archiveMessages(userId: string, messageIds: string[]): Promise<void> {
    await this.messageRepository.update(
      {
        id: In(messageIds),
        receiver: { id: userId },
      },
      {
        status: MessageStatus.ARCHIVED
      }
    );
  }

  // 获取未读消息数统计
  async getUnreadCount(userId: string): Promise<{
    total: number;
    byType: Record<MessageType, number>;
  }> {
    const typeStats = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.type')
      .addSelect('COUNT(*)', 'count')
      .where('message.receiver.id = :userId', { userId })
      .andWhere('message.status = :status', { status: MessageStatus.UNREAD })
      .groupBy('message.type')
      .getRawMany();

    const byType = typeStats.reduce((acc: Record<MessageType, number>, { type, count }) => {
      acc[type] = Number(count);
      return acc;
    }, {} as Record<MessageType, number>);

    const total = Object.values(byType).reduce((sum: number, count: number) => sum + count, 0);

    return {
      total: Number(total),
      byType
    };
  }

  // 清理过期消息
  async cleanupExpiredMessages(): Promise<void> {
    const now = new Date();
    await this.messageRepository
      .createQueryBuilder()
      .update()
      .set({ status: MessageStatus.ARCHIVED })
      .where('expireAt <= :now', { now })
      .andWhere('status != :status', { status: MessageStatus.ARCHIVED })
      .execute();
  }
} 