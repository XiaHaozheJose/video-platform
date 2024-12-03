import { IsString, IsNumber, IsEnum, IsHexColor, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DanmakuType } from '../entities/danmaku.entity';

export class CreateDanmakuDto {
  @ApiProperty({ description: '弹幕内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '视频ID' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: '时间戳(秒)' })
  @IsNumber()
  @Min(0)
  timestamp: number;

  @ApiProperty({ description: '弹幕类型', enum: DanmakuType })
  @IsEnum(DanmakuType)
  type: DanmakuType;

  @ApiProperty({ description: '颜色(十六进制)', default: '#FFFFFF' })
  @IsHexColor()
  color: string;

  @ApiProperty({ description: '字体大小', default: 25 })
  @IsInt()
  @Min(12)
  @Max(36)
  fontSize: number;
}

export class DanmakuQueryDto {
  @ApiProperty({ description: '视频ID' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: '开始时间(秒)' })
  @IsNumber()
  @Min(0)
  start: number;

  @ApiProperty({ description: '结束时间(秒)' })
  @IsNumber()
  @Min(0)
  end: number;
}

export class DanmakuSegmentDto {
  @ApiProperty({ description: '开始时间(秒)' })
  @IsNumber()
  @Min(0)
  start: number;

  @ApiProperty({ description: '结束时间(秒)' })
  @IsNumber()
  @Min(0)
  end: number;
} 