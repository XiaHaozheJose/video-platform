import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { Video } from '@modules/content/entities/video.entity';
import { Category } from '@modules/content/entities/category.entity';
import { Actor } from '@modules/content/entities/actor.entity';
import { Director } from '@modules/content/entities/director.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video,
      Category,
      Actor,
      Director,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {} 