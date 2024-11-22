import { Controller, Get, Query, Param, Delete, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { OperationLogService } from '../services/operation-log.service';
import { QueryOperationLogDto } from '../dto/operation-log.dto';

@ApiTags('系统日志')
@Controller('system/logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OperationLogController {
  constructor(private readonly operationLogService: OperationLogService) {}

  @Get()
  @ApiOperation({ summary: '获取操作日志列表' })
  findAll(@Query() query: QueryOperationLogDto) {
    return this.operationLogService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取操作日志详情' })
  findOne(@Param('id') id: string) {
    return this.operationLogService.findOne(id);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取操作日志统计' })
  async getStatistics(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.operationLogService.getStatistics(
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Delete('clean')
  @ApiOperation({ summary: '清理指定日期前的日志' })
  async cleanLogs(@Query('before') before: string) {
    return this.operationLogService.cleanLogs(new Date(before));
  }

  @Get('export')
  @ApiOperation({ summary: '导出操作日志' })
  async exportLogs(@Query() query: QueryOperationLogDto, @Res() res: Response) {
    const filepath = await this.operationLogService.exportLogs(query);
    return res.download(filepath);
  }
} 