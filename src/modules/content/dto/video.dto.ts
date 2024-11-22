import { IsString, IsNumber, IsOptional, IsArray, IsUUID, IsEnum, Min, Max, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VideoStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

export class CreateEpisodeDto {
  @ApiProperty({ description: '剧集标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '剧集号' })
  @IsNumber()
  @Min(1)
  episode: number;

  @ApiProperty({ description: '播放地址' })
  @IsUrl()
  playUrl: string;

  @ApiPropertyOptional({ description: '来源' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateVideoDto {
  @ApiProperty({ description: '视频标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '视频描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '封面图片URL' })
  @IsOptional()
  @IsUrl()
  cover?: string;

  @ApiPropertyOptional({ description: '年份' })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  year?: number;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ description: '语言' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: '外部ID' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: '来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '状态', enum: VideoStatus })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus = VideoStatus.DRAFT;

  @ApiPropertyOptional({ description: '分类ID列表' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: '演员ID列表' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  actorIds?: string[];

  @ApiPropertyOptional({ description: '导演ID列表' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  directorIds?: string[];

  @ApiPropertyOptional({ description: '评分' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  rating?: number;

  @ApiPropertyOptional({ description: '更新状态' })
  @IsOptional()
  @IsString()
  updateStatus?: string;

  @ApiPropertyOptional({ description: '剧集列表' })
  @IsOptional()
  @IsArray()
  episodes?: CreateEpisodeDto[];
}

export class UpdateVideoDto extends CreateVideoDto {}

export class VideoListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ description: '年份' })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ description: '状态', enum: VideoStatus })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class UpdateEpisodeDto extends CreateEpisodeDto {} 