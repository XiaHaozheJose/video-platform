import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { Category } from './entities/category.entity';
import { Episode } from './entities/episode.entity';
import { Actor } from './entities/actor.entity';
import { Director } from './entities/director.entity';
import { VideoService } from './services/video.service';
import { CategoryService } from './services/category.service';
import { VideoController } from './controllers/video.controller';
import { CategoryController } from './controllers/category.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video,
      Category,
      Episode,
      Actor,
      Director,
    ]),
  ],
  providers: [VideoService, CategoryService],
  controllers: [VideoController, CategoryController],
  exports: [VideoService, CategoryService],
})
export class ContentModule {} 