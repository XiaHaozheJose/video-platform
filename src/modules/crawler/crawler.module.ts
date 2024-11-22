import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerTask } from './entities/crawler-task.entity';
import { CrawlerLog } from './entities/crawler-log.entity';
import { CrawlerService } from './services/crawler.service';
import { CrawlerLogService } from './services/crawler-log.service';
import { CrawlerController } from './controllers/crawler.controller';
import { ContentModule } from '../content/content.module';
import { UserModule } from '../user/user.module';
import { Actor } from '@modules/content/entities/actor.entity';
import { Director } from '@modules/content/entities/director.entity';
import { Category } from '@modules/content/entities/category.entity';
import { NanguaAdapter } from './adapters/nangua.adapter';
import { ResourceAdapterFactory } from './factories/resource-adapter.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrawlerTask,
      CrawlerLog,
      Actor,
      Director,
      Category,
    ]),
    ContentModule,
    UserModule,
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerLogService,
    NanguaAdapter,
    ResourceAdapterFactory,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {} 