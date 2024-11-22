import { Global, Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
  providers: [RedisService, LoggerService],
  exports: [RedisService, LoggerService],
})
export class SharedModule {} 