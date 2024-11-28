import { IsString, IsOptional, IsEnum, IsObject, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CrawlerSourceStatus } from '../entities/crawler-source.entity';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export class CreateCrawlerSourceDto {
  @ApiProperty({ description: '爬虫源名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '基础URL' })
  @IsString()
  baseUrl: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '类型' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: '状态', enum: CrawlerSourceStatus })
  @IsOptional()
  @IsEnum(CrawlerSourceStatus)
  status?: CrawlerSourceStatus;

  @ApiPropertyOptional({ description: '配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateCrawlerSourceDto extends CreateCrawlerSourceDto {}

export class CrawlerSourceListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '状态', enum: CrawlerSourceStatus })
  @IsOptional()
  @IsEnum(CrawlerSourceStatus)
  @Transform(({ value }) => value || undefined)
  status?: CrawlerSourceStatus;
} 