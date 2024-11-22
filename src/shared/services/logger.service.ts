import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;
  private contextName: string = 'Application';

  constructor(private configService: ConfigService) {
    const logDir = this.configService.get('LOG_DIR', 'logs');
    
    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.json(),
      ),
      transports: [
        // 控制台输出
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.timestamp(),
            format.printf(({ timestamp, level, message, context, ...meta }) => {
              return `${timestamp} [${context || this.contextName}] ${level}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta) : ''
              }`;
            }),
          ),
        }),
        // 信息日志
        new DailyRotateFile({
          dirname: path.join(logDir, 'info'),
          filename: 'info-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
        // 错误日志
        new DailyRotateFile({
          dirname: path.join(logDir, 'error'),
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
        }),
      ],
    });
  }

  setContext(context: string) {
    this.contextName = context;
  }

  log(message: string, context?: string, ...meta: any[]) {
    this.logger.info(message, { context: context || this.contextName, ...meta });
  }

  error(message: string, trace?: string, context?: string, ...meta: any[]) {
    this.logger.error(message, { 
      context: context || this.contextName,
      trace,
      ...meta,
    });
  }

  warn(message: string, context?: string, ...meta: any[]) {
    this.logger.warn(message, { context: context || this.contextName, ...meta });
  }

  debug(message: string, context?: string, ...meta: any[]) {
    this.logger.debug(message, { context: context || this.contextName, ...meta });
  }

  verbose(message: string, context?: string, ...meta: any[]) {
    this.logger.verbose(message, { context: context || this.contextName, ...meta });
  }
} 