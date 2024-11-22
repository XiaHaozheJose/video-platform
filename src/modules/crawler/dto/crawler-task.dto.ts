import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsUrl, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskStatus } from '../entities/crawler-task.entity';

export class CategoryMappingDto {
  @ApiProperty({ description: '源分类ID' })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: '目标分类ID' })
  @IsString()
  targetId: string;

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  enabled: boolean = true;
}

export class MatchRulesDto {
  @ApiPropertyOptional({ description: '资源匹配方式', default: ['externalId'] })
  @IsOptional()
  @IsArray()
  @IsEnum(['name', 'externalId', 'both'], { each: true })
  identifyBy?: ('name' | 'externalId' | 'both')[] = ['externalId'];

  @ApiPropertyOptional({ description: '更新策略' })
  @IsOptional()
  @IsObject()
  updateStrategy?: {
    cover?: boolean;      // 是否更新封面
    description?: boolean;// 是否更新描述
    rating?: boolean;     // 是否更新评分
    episodes?: boolean;   // 是否更新剧集
  } = {
    cover: true,
    description: true,
    rating: true,
    episodes: true,
  };

  @ApiPropertyOptional({ description: '资源过滤规则' })
  @IsOptional()
  @IsObject()
  filters?: {
    minRating?: number;  // 最低评分
    minYear?: number;    // 最早年份
    excludeAreas?: string[]; // 排除地区
  };
}

export class CreateTaskDto {
  @ApiProperty({ description: '任务名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '资源接口地址' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: '任务类型', enum: TaskType })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiPropertyOptional({ description: '定时规则' })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiPropertyOptional({ description: '分类映射配置' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CategoryMappingDto)
  categoryMapping?: CategoryMappingDto[];

  @ApiPropertyOptional({ description: '匹配规则' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MatchRulesDto)
  matchRules?: MatchRulesDto;

  @ApiPropertyOptional({ description: '采集间隔(毫秒)' })
  @IsOptional()
  @IsNumber()
  interval?: number = 1000;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: '任务名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '资源接口地址' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: '任务状态', enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: '定时规则' })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiPropertyOptional({ description: '分类映射配置' })
  @IsOptional()
  @IsArray()
  categoryMapping?: CategoryMappingDto[];
}

export class TaskResultDto {
  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failCount: number;

  @ApiPropertyOptional({ description: '失败列表' })
  @IsOptional()
  @IsArray()
  failures?: Array<{
    data: any;
    error: string;
  }>;
} 