import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Video } from './entities/video.entity';
import { Category } from './entities/category.entity';
import { Episode } from './entities/episode.entity';
import { Person } from './entities/person.entity';
import { VideoService } from './services/video.service';
import { CategoryService } from './services/category.service';
import { VideoController } from './controllers/video.controller';
import { CategoryController } from './controllers/category.controller';
import { PersonController } from './controllers/person.controller';
import { TagController } from './controllers/tag.controller';
import { PersonService } from './services/person.service';
import { TagService } from './services/tag.service';
import { Tag } from './entities/tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video,
      Category,
      Episode,
      Person,
      Tag,
    ]),
    CacheModule.register(),
  ],
  providers: [
    VideoService, 
    CategoryService,
    PersonService,
    TagService
  ],
  controllers: [
    VideoController, 
    CategoryController,
    PersonController,
    TagController,
  ],
  exports: [
    VideoService, 
    CategoryService,
    PersonService,
    TagService,
  ],
})
export class ContentModule {} 