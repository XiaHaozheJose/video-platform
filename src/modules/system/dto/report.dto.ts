import { IsString, IsEnum, IsOptional, IsArray, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportReason, ReportStatus } from '../entities/report.entity';

export class CreateReportDto {
  @ApiProperty({ description: '举报类型', enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: '举报原因', enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiProperty({ description: '被举报对象ID' })
  @IsString()
  targetId: string;

  @ApiPropertyOptional({ description: '详细描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '证据' })
  @IsOptional()
  @IsObject()
  evidence?: {
    screenshots?: string[];
    videos?: string[];
    links?: string[];
  };
}

export class ProcessReportDto {
  @ApiProperty({ description: '处理状态', enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({ description: '处理人ID' })
  @IsUUID()
  processorId: string;

  @ApiProperty({ description: '采取的行动' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: '处理说明' })
  @IsOptional()
  @IsString()
  note?: string;
} 