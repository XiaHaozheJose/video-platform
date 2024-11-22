import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentModule } from './modules/content/content.module';
import { UserModule } from './modules/user/user.module';
import { SystemModule } from './modules/system/system.module';
import { SharedModule } from './shared/shared.module';
import databaseConfig from './config/database.config';
import { CrawlerModule } from './modules/crawler/crawler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),
    SharedModule,
    ContentModule,
    UserModule,
    SystemModule,
    CrawlerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
