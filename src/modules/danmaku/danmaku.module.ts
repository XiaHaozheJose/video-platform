import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { Danmaku } from './entities/danmaku.entity';
import { DanmakuService } from './services/danmaku.service';
import { DanmakuController } from './controllers/danmaku.controller';
import { DanmakuGateway } from './gateways/danmaku.gateway';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Danmaku]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
    CacheModule.register({
      ttl: 300, // 5分钟默认缓存时间
      max: 100, // 最大缓存数量
    }),
    SharedModule,
  ],
  controllers: [DanmakuController],
  providers: [
    DanmakuService,
    DanmakuGateway,
  ],
  exports: [DanmakuService],
})
export class DanmakuModule {} 