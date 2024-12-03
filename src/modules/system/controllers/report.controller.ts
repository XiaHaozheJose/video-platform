import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { AdminGuard } from '@modules/user/guards/admin.guard';
import { CurrentUser } from '@modules/user/decorators/current-user.decorator';
import { User } from '@modules/user/entities/user.entity';
import { ReportService } from '../services/report.service';
import { CreateReportDto, ProcessReportDto } from '../dto/report.dto';

@ApiTags('举报管理')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建举报' })
  @ApiResponse({ status: 201, description: '举报创建成功' })
  async create(
    @CurrentUser() user: User,
    @Body() createReportDto: CreateReportDto
  ) {
    return this.reportService.create(createReportDto, user.id);
  }

  @Post(':id/process')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '处理举报' })
  @ApiResponse({ status: 200, description: '举报处理成功' })
  async process(
    @Param('id') id: string,
    @Body() processDto: ProcessReportDto
  ) {
    return this.reportService.process(id, processDto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取举报统计' })
  async getStats() {
    return this.reportService.getReportStats();
  }
} 