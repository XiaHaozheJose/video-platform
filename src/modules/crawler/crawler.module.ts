import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CrawlerTask } from './entities/crawler-task.entity';
import { CrawlerLog } from './entities/crawler-log.entity';
import { CrawlerSource } from './entities/crawler-source.entity';
import { Person } from '@modules/content/entities/person.entity';
import { Category } from '@modules/content/entities/category.entity';
import { CrawlerService } from './services/crawler.service';
import { CrawlerLogService } from './services/crawler-log.service';
import { CrawlerSourceService } from './services/crawler-source.service';
import { CrawlerController } from './controllers/crawler.controller';
import { CrawlerSourceController } from './controllers/crawler-source.controller';
import { ResourceAdapterFactory } from './factories/resource-adapter.factory';
import { NanguaAdapter } from './adapters/nangua.adapter';
import { ContentModule } from '@modules/content/content.module';
import { SharedModule } from '@shared/shared.module';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrawlerTask,
      CrawlerLog,
      CrawlerSource,
      Person,
      Category,
    ]),
    EventEmitterModule.forRoot(),
    ContentModule,
    SharedModule,
    UserModule,
  ],
  providers: [
    CrawlerService,
    CrawlerLogService,
    CrawlerSourceService,
    ResourceAdapterFactory,
    NanguaAdapter,
  ],
  controllers: [
    CrawlerController,
    CrawlerSourceController,
  ],
  exports: [
    CrawlerService,
    CrawlerLogService,
    CrawlerSourceService,
  ],
})
export class CrawlerModule {} 