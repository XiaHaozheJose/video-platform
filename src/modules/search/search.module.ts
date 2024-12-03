import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { Video } from '@modules/content/entities/video.entity';
import { Category } from '@modules/content/entities/category.entity';
import { SearchHistory } from './entities/search-history.entity';
import { HotSearch } from './entities/hot-search.entity';
import { SharedModule } from '@shared/shared.module';
import { Person } from '@modules/content/entities/person.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video,
      Category,
      SearchHistory,
      HotSearch,
      Person
    ]),
    SharedModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {} 