import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailService } from './services/mail.service';
import { Comment } from './entities/comment.entity';
import { Collection } from './entities/collection.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { Video } from '@modules/content/entities/video.entity';
import { CommentController } from './controllers/comment.controller';
import { CollectionController } from './controllers/collection.controller';
import { WatchHistoryController } from './controllers/watch-history.controller';
import { CommentService } from './services/comment.service';
import { CollectionService } from './services/collection.service';
import { WatchHistoryService } from './services/watch-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Comment,
      Collection,
      WatchHistory,
      Video,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    MailService,
    CommentService,
    CollectionService,
    WatchHistoryService,
  ],
  controllers: [
    AuthController,
    CommentController,
    CollectionController,
    WatchHistoryController,
  ],
  exports: [
    AuthService,
    MailService,
    CommentService,
    CollectionService,
    WatchHistoryService,
  ],
})
export class UserModule {} 