import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logger.log(
            `${method} ${url} ${Date.now() - now}ms`,
            'HTTP Request',
            {
              method,
              url,
              body,
              userId: user?.id,
              response: data,
            },
          );
        },
        error: (error) => {
          this.logger.error(
            `${method} ${url} ${Date.now() - now}ms`,
            error.stack,
            'HTTP Request',
            {
              method,
              url,
              body,
              userId: user?.id,
              error: {
                message: error.message,
                code: error.code,
              },
            },
          );
        },
      }),
    );
  }
} 