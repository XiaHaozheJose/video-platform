import { IsString, IsNumber, IsOptional, IsArray, IsUUID, IsEnum, Min, Max, IsUrl, IsNotEmpty, ArrayNotEmpty, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { VideoStatus, VideoPlayFormat } from '../entities/video.entity';
import { TagType } from '../entities/tag.entity';

export class CreateEpisodeDto {
  @ApiProperty({ description: '剧集标题' })
  @IsString()
  @IsNotEmpty({ message: '剧集标题不能为空' })
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

export class VideoMetadataDto {
  @ApiPropertyOptional({ description: '分辨率' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ description: '码率(kbps)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bitrate?: number;

  @ApiPropertyOptional({ description: '编码格式' })
  @IsOptional()
  @IsString()
  codec?: string;

  @ApiPropertyOptional({ description: '帧率' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  frameRate?: number;

  @ApiPropertyOptional({ description: '音频编码' })
  @IsOptional()
  @IsString()
  audioCodec?: string;
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

  
  @ApiPropertyOptional({ description: '时长' })
  @IsOptional()
  @IsString()
  duration?: string;

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

  @ApiProperty({ description: '分类ID列表' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayNotEmpty({ message: '请至少选择一个分类' })
  categoryIds: string[];

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
  @ValidateNested({ each: true })
  @Type(() => CreateEpisodeDto)
  episodes?: CreateEpisodeDto[];

  @ApiPropertyOptional({ description: '发布日期' })
  @IsOptional()
  @IsString()
  releaseDate?: string;

  @ApiPropertyOptional({ description: '标签列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '播放格式', enum: VideoPlayFormat })
  @IsOptional()
  @IsEnum(VideoPlayFormat)
  playFormat?: VideoPlayFormat;

  @ApiPropertyOptional({ description: '视频元数据' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VideoMetadataDto)
  metadata?: VideoMetadataDto;
}

export class UpdateVideoDto extends CreateVideoDto {}

export class VideoListDto {
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

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || undefined)
  categoryId?: string;

  @ApiPropertyOptional({ description: '年份' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Transform(({ value }) => value || undefined)
  year?: number;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || undefined)
  area?: string;

  @ApiPropertyOptional({ description: '状态', enum: VideoStatus })
  @IsOptional()
  @IsEnum(VideoStatus)
  @Transform(({ value }) => value || undefined)
  status?: VideoStatus;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || undefined)
  keyword?: string;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '播放格式', enum: VideoPlayFormat })
  @IsOptional()
  @IsEnum(VideoPlayFormat)
  playFormat?: VideoPlayFormat;

  @ApiPropertyOptional({ description: '标签列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '标签类型列表', enum: TagType, isArray: true })
  @IsOptional()
  @IsEnum(TagType, { each: true })
  tagTypes?: TagType[];
}

export class UpdateEpisodeDto extends CreateEpisodeDto {} 