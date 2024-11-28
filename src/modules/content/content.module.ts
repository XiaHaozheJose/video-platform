import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { Category } from './entities/category.entity';
import { Episode } from './entities/episode.entity';
import { Person } from './entities/person.entity';
import { VideoService } from './services/video.service';
import { CategoryService } from './services/category.service';
import { VideoController } from './controllers/video.controller';
import { CategoryController } from './controllers/category.controller';
import { PersonController } from './controllers/person.controller';
import { PersonService } from './services/person.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video,
      Category,
      Episode,
      Person,
    ]),
  ],
  providers: [
    VideoService, 
    CategoryService,
    PersonService,
  ],
  controllers: [
    VideoController, 
    CategoryController,
    PersonController,
  ],
  exports: [
    VideoService, 
    CategoryService,
    PersonService,
  ],
})
export class ContentModule {} 