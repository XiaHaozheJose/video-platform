import { IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWatchProgressDto {
  @ApiProperty({ description: '视频ID' })
  @IsUUID()
  videoId: string;

  @ApiProperty({ description: '观看进度（秒）' })
  @IsNumber()
  @Min(0)
  progress: number;

  @ApiProperty({ description: '视频总时长（秒）' })
  @IsNumber()
  @Min(0)
  duration: number;
} 