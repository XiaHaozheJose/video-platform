import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CrawlerLog, LogLevel } from '../entities/crawler-log.entity';
import { CrawlerTask } from '../entities/crawler-task.entity';
import { LoggerService } from '@shared/services/logger.service';
import { MailService } from '@modules/user/services/mail.service';

@Injectable()
export class CrawlerLogService {
  constructor(
    @InjectRepository(CrawlerLog)
    private crawlerLogRepository: Repository<CrawlerLog>,
    private logger: LoggerService,
    private mailService: MailService,
  ) {}

  async createLog(
    task: CrawlerTask,
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<CrawlerLog> {
    const log = this.crawlerLogRepository.create({
      task,
      level,
      message,
      metadata,
    });

    const savedLog = await this.crawlerLogRepository.save(log);

    // 如果是错误日志，发送告警邮件
    if (level === LogLevel.ERROR) {
      await this.sendAlertEmail(task, message, metadata);
    }

    return savedLog;
  }

  async updateProgress(
    log: CrawlerLog,
    processedCount: number,
    successCount: number,
    failCount: number
  ): Promise<void> {
    log.processedCount = processedCount;
    log.successCount = successCount;
    log.failCount = failCount;
    await this.crawlerLogRepository.save(log);
  }

  async findTaskLogs(taskId: string, startTime?: Date, endTime?: Date) {
    const query = this.crawlerLogRepository
      .createQueryBuilder('log')
      .where('log.task.id = :taskId', { taskId })
      .orderBy('log.createdAt', 'DESC');

    if (startTime && endTime) {
      query.andWhere('log.createdAt BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });
    }

    return await query.getMany();
  }

  private async sendAlertEmail(
    task: CrawlerTask,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const subject = `采集任务告警: ${task.name}`;
    const content = `
      <h2>采集任务出现错误</h2>
      <p><strong>任务名称:</strong> ${task.name}</p>
      <p><strong>错误信息:</strong> ${message}</p>
      ${metadata ? `<p><strong>详细信息:</strong> ${JSON.stringify(metadata, null, 2)}</p>` : ''}
      <p><strong>发生时间:</strong> ${new Date().toLocaleString()}</p>
    `;

    try {
      await this.mailService.sendAlertEmail('admin@example.com', subject, content);
    } catch (error) {
      this.logger.error(
        'Failed to send alert email',
        error.stack,
        'CrawlerLogService',
      );
    }
  }
} 