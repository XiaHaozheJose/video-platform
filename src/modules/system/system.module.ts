import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from '../user/user.module';
import { OperationLog } from './entities/operation-log.entity';
import { OperationLogService } from './services/operation-log.service';
import { LogAlertService } from './services/log-alert.service';
import { OperationLogController } from './controllers/operation-log.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperationLog]),
    ScheduleModule.forRoot(),
    UserModule,
  ],
  providers: [OperationLogService, LogAlertService],
  controllers: [OperationLogController],
  exports: [OperationLogService],
})
export class SystemModule {} 