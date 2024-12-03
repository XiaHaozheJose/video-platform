import { IsString, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SourceListQueryDto {
  @ApiProperty({ description: '资源站ID' })
  @IsString()
  sourceId: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page: number = 1;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsString()
  typeId?: string;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CollectSelectedDto {
  @ApiProperty({ description: '资源站ID' })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: '选中的视频ID列表' })
  @IsArray()
  @IsString({ each: true })
  videoIds: string[];
}

