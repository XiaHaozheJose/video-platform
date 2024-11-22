import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { OperationLog, OperationType } from '@modules/system/entities/operation-log.entity';
import { OPERATION_LOG_KEY, OperationLogOptions } from '@common/decorators/operation-log.decorator';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(OperationLog)
    private operationLogRepository: Repository<OperationLog>,
    private reflector: Reflector,
    private logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationLogOptions = this.reflector.get<OperationLogOptions>(
      OPERATION_LOG_KEY,
      context.getHandler(),
    );

    if (!operationLogOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            const operationLog = this.operationLogRepository.create({
              type: operationLogOptions.type as OperationType,
              description: operationLogOptions.description,
              params: {
                method,
                url,
                body,
              },
              result: data,
              userId: user?.id,
              username: user?.username,
              ip: ip || request.ip,
              timeConsuming: Date.now() - startTime,
            });

            await this.operationLogRepository.save(operationLog);
          } catch (error) {
            this.logger.error('Failed to save operation log', error.stack, 'OperationLogInterceptor');
          }
        },
        error: async (error) => {
          try {
            const operationLog = this.operationLogRepository.create({
              type: operationLogOptions.type as OperationType,
              description: operationLogOptions.description,
              params: {
                method,
                url,
                body,
              },
              result: {
                error: error.message,
                stack: error.stack,
              },
              userId: user?.id,
              username: user?.username,
              ip: ip || request.ip,
              timeConsuming: Date.now() - startTime,
            });

            await this.operationLogRepository.save(operationLog);
          } catch (err) {
            this.logger.error('Failed to save operation log', err.stack, 'OperationLogInterceptor');
          }
        },
      }),
    );
  }
} 