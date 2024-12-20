import { IsString, IsEnum, IsOptional, IsNumber, IsArray, ValidateNested, IsBoolean, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { TaskType, TaskStatus } from '../entities/crawler-task.entity';

class CategoryMapping {
  @ApiProperty({ description: '源分类ID' })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: '源分类名称' })
  @IsString()
  sourceName: string;

  @ApiProperty({ description: '目标分类ID' })
  @IsUUID()
  targetId: string;

  @ApiProperty({ description: '目标分类名称' })
  @IsString()
  targetName: string;

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  enabled: boolean;
}

export class CreateTaskDto {
  @ApiProperty({ description: '任务名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '爬虫源ID' })
  @IsUUID()
  sourceId: string;

  @ApiProperty({ description: '任务类型', enum: TaskType })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiPropertyOptional({ description: 'Cron表达式' })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiPropertyOptional({ description: '间隔时间' })
  @IsOptional()
  @IsNumber()
  interval?: number;

  @ApiPropertyOptional({ description: '间隔单位' })
  @IsOptional()
  @IsString()
  intervalUnit?: string;

  @ApiProperty({ description: '分类映射配置' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryMapping)
  categoryMapping: CategoryMapping[];
}

export class UpdateTaskDto extends CreateTaskDto {
  @ApiPropertyOptional({ description: '状态', enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

export class TaskResultDto {
  @ApiProperty({ description: '成功数量' })
  @IsNumber()
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  @IsNumber()
  failCount: number;

  @ApiProperty({ description: '失败项列表' })
  @IsArray()
  failures: Array<{
    data: any;
    error: string;
  }>;
}

export class TaskListDto {
  
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

  @ApiPropertyOptional({ description: '状态', enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  @Transform(({ value }) => value || undefined)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || undefined)
  keyword?: string;
}

export interface TaskFailureItem {
  data: any;
  error: string;
}

export interface VideoInfo {
  name: string;
  sourceName: string;
  sourceType: string;
  mappedCategory?: {
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetName: string;
  };
  status: 'new' | 'updated' | 'skipped';
  reason?: string;
}

export class CrawlProgressDto {
  @ApiProperty({ description: '当前页码' })
  currentPage: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  @ApiProperty({ description: '当前页视频列表' })
  videos: VideoInfo[];
}

export enum TimeRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all'
}

export class CollectByTimeDto {
  @ApiProperty({ description: '时间范围', enum: TimeRange })
  @IsEnum(TimeRange)
  timeRange: TimeRange;

  @ApiProperty({ description: '页码' })
  @IsNumber()
  @Min(1)
  page: number;

  @ApiProperty({ description: '资源ID' })
  @IsString()
  sourceId: string;
}

export interface CollectResult {
  videos: Array<{
    name: string;
    status: 'new' | 'updated' | 'skipped';
    changes?: {
      cover?: boolean;
      episodes?: boolean;
      description?: boolean;
      actors?: boolean;
      directors?: boolean;
    };
    reason?: string;
  }>;
  isCompleted: boolean;
  lastVideoTime?: string;
}

export interface MatchRules {
  titleSimilarityThreshold: number;  // 标题相似度阈值
  useExternalIdOnly: boolean;        // 是否只使用外部ID匹配
  updateExisting: boolean;           // 是否更新已存在的视频
  matchFields: {                     // 匹配字段配置
    year: boolean;                   // 是否匹配年份
    area: boolean;                   // 是否匹配地区
    director: boolean;               // 是否匹配导演
  };
}

export interface TaskConfig {
  matchRules: MatchRules;
  // ... 其他配置
} 