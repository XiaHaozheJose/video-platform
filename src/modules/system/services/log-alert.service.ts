import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MailService } from '@modules/user/services/mail.service';
import { LoggerService } from '@shared/services/logger.service';
import { OperationLog, OperationType } from '../entities/operation-log.entity';

@Injectable()
export class LogAlertService {
  constructor(
    @InjectRepository(OperationLog)
    private operationLogRepository: Repository<OperationLog>,
    private mailService: MailService,
    private logger: LoggerService,
  ) {}

  async checkErrorLogs() {
    const threshold = 10; // 错误次数阈值
    const timeWindow = 5 * 60 * 1000; // 5分钟时间窗口
    const now = new Date();
    const startTime = new Date(now.getTime() - timeWindow);

    try {
      // 统计时间窗口内的错误日志
      const errorCount = await this.operationLogRepository.count({
        where: {
          createdAt: Between(startTime, now),
          type: OperationType.ERROR,
        },
      });

      if (errorCount >= threshold) {
        // 发送告警邮件
        await this.sendAlertEmail(errorCount, startTime, now);
        this.logger.warn(
          `High error rate detected: ${errorCount} errors in last 5 minutes`,
          'LogAlertService',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to check error logs',
        error.stack,
        'LogAlertService',
      );
    }
  }

  private async sendAlertEmail(errorCount: number, startTime: Date, endTime: Date) {
    const subject = '系统错误告警';
    const content = `
      <h2>系统错误告警</h2>
      <p>在 ${startTime.toLocaleString()} 至 ${endTime.toLocaleString()} 期间，</p>
      <p>系统检测到 ${errorCount} 次错误，超过预设阈值。</p>
      <p>请及时检查系统日志和监控数据。</p>
    `;

    try {
      // 这里需要配置告警接收邮箱
      await this.mailService.sendAlertEmail('admin@example.com', subject, content);
    } catch (error) {
      this.logger.error(
        'Failed to send alert email',
        error.stack,
        'LogAlertService',
      );
    }
  }
} 