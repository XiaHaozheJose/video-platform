import { IsString, IsOptional, IsArray, IsUUID, IsEnum, IsNumber, Min, Max, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TagType } from '../entities/tag.entity';

export class TagRulesDto {
  @ApiPropertyOptional({ description: '允许使用的分类ID列表' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allowedCategories?: string[];

  @ApiPropertyOptional({ description: '最少关联视频数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minVideos?: number;

  @ApiPropertyOptional({ description: '最多关联视频数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxVideos?: number;

  @ApiPropertyOptional({ description: '允许的子标签类型', enum: TagType, isArray: true })
  @IsOptional()
  @IsEnum(TagType, { each: true })
  allowedChildTypes?: TagType[];
}

export class TagMetadataDto {
  @ApiPropertyOptional({ description: '标签图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '标签颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '简短描述' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ description: '标签来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class CreateTagDto {
  @ApiProperty({ description: '标签名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '标签描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '标签类型', enum: TagType })
  @IsOptional()
  @IsEnum(TagType)
  type?: TagType;

  @ApiPropertyOptional({ description: '标签权重', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  weight?: number;

  @ApiPropertyOptional({ description: '同义词列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  synonyms?: string[];

  @ApiPropertyOptional({ description: '父标签ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: '标签规则' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TagRulesDto)
  rules?: TagRulesDto;

  @ApiPropertyOptional({ description: '标签元数据' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TagMetadataDto)
  metadata?: TagMetadataDto;
}

export class UpdateTagDto extends CreateTagDto {}

export class TagListQueryDto {
  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '标签类型', enum: TagType })
  @IsOptional()
  @IsEnum(TagType)
  type?: TagType;

  @ApiPropertyOptional({ description: '父标签ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '最小权重' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minWeight?: number;

  @ApiPropertyOptional({ description: '最小使用次数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minUseCount?: number;
} 