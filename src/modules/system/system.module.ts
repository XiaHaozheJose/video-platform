import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from '../user/user.module';
import { OperationLog } from './entities/operation-log.entity';
import { OperationLogService } from './services/operation-log.service';
import { LogAlertService } from './services/log-alert.service';
import { OperationLogController } from './controllers/operation-log.controller';
import { InitService } from './services/init.service';
import { User } from '@modules/user/entities/user.entity';
import { UploadController } from './controllers/upload.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperationLog, User]),
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: './uploads',
    }),
    UserModule,
  ],
  providers: [
    OperationLogService,
    LogAlertService,
    InitService,
  ],
  controllers: [OperationLogController, UploadController],
  exports: [OperationLogService],
})
export class SystemModule {} 