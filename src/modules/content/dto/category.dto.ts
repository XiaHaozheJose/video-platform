import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '分类描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '父分类ID' })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}

export class UpdateCategoryDto extends CreateCategoryDto {}

export class MoveCategoryDto {
  @ApiProperty({ description: '目标父分类ID' })
  @IsUUID('4')
  parentId: string;
} 