import { IsString, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCollectionDto {
  @ApiProperty({ description: '视频ID' })
  @IsUUID()
  videoId: string;

  @ApiPropertyOptional({ description: '收藏备注' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '个人标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateCollectionDto {
  @ApiPropertyOptional({ description: '收藏备注' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '个人标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
} 