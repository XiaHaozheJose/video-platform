import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Message } from './entities/message.entity';
import { MessageService } from './services/message.service';
import { MessageController } from './controllers/message.controller';
import { MessageTemplateService } from './services/message-template.service';
import { MessageGateway } from './gateways/message.gateway';
import { UserModule } from '../user/user.module';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    CacheModule.register({
      ttl: 300, // 5分钟默认缓存时间
      max: 100, // 最大缓存数量
    }),
    UserModule,
    SharedModule,
  ],
  controllers: [MessageController],
  providers: [
    MessageService,
    MessageTemplateService,
    MessageGateway,
  ],
  exports: [MessageService],
})
export class MessageModule {} 