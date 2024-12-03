import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from '@modules/user/entities/user.entity';

export enum MessageType {
  SYSTEM = 'system',       // 系统消息
  REPORT = 'report',       // 举报相关
  COMMENT = 'comment',     // 评论相关
  PRIVATE = 'private',     // 私信
  NOTIFICATION = 'notification', // 通知
}

export enum MessageStatus {
  UNREAD = 'unread',      // 未读
  READ = 'read',          // 已读
  ARCHIVED = 'archived',  // 已归档
  DELETED = 'deleted',    // 已删除
}

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('messages')
export class Message extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  sender: User;  // 发送者（系统消息为null）

  @ManyToOne(() => User)
  receiver: User;  // 接收者

  @Column({
    type: 'enum',
    enum: MessageType
  })
  type: MessageType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.UNREAD
  })
  status: MessageStatus;

  @Column({
    type: 'enum',
    enum: MessagePriority,
    default: MessagePriority.NORMAL
  })
  priority: MessagePriority;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    relatedId?: string;    // 相关内容ID
    relatedType?: string;  // 相关内容类型
    link?: string;         // 相关链接
    extra?: any;           // 额外信息
    status?: string;       // 添加状态字段
    result?: any;          // 添加结果字段
  };

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;  // 阅读时间

  @Column({ type: 'timestamp', nullable: true })
  expireAt: Date;  // 过期时间
} 