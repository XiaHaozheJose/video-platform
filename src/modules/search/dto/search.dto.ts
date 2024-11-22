import { IsString, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '分类ID列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: '年份' })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ description: '语言' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: '演员ID列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actorIds?: string[];

  @ApiPropertyOptional({ description: '导演ID列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  directorIds?: string[];

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '排序字段' })
  @IsOptional()
  @IsString()
  orderBy?: 'createdAt' | 'viewCount' | 'rating' = 'createdAt';

  @ApiPropertyOptional({ description: '排序方向' })
  @IsOptional()
  @IsString()
  orderDir?: 'ASC' | 'DESC' = 'DESC';
} 