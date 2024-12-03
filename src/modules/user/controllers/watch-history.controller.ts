import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { WatchHistoryService } from '../services/watch-history.service';
import { UpdateWatchProgressDto } from '../dto/watch-history.dto';

@ApiTags('观看历史')
@Controller('watch-history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WatchHistoryController {
  constructor(private readonly watchHistoryService: WatchHistoryService) {}

  @Post('progress')
  @ApiOperation({ summary: '更新观看进度' })
  async updateWatchProgress(
    @CurrentUser() user: User,
    @Body() dto: UpdateWatchProgressDto
  ) {
    return await this.watchHistoryService.updateWatchProgress(
      user,
      dto.videoId,
      dto.progress,
      dto.duration
    );
  }

  @Get()
  @ApiOperation({ summary: '获取观看历史' })
  async getUserWatchHistory(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return await this.watchHistoryService.getUserWatchHistory(user.id, page, limit);
  }

  @Delete('clear')
  @ApiOperation({ summary: '清空观看历史' })
  async clearHistory(@CurrentUser() user: User) {
    return await this.watchHistoryService.clearHistory(user.id);
  }

  @Delete(':videoId')
  @ApiOperation({ summary: '删除单个观看记录' })
  async removeHistory(
    @CurrentUser() user: User,
    @Param('videoId') videoId: string
  ) {
    return await this.watchHistoryService.removeHistory(user.id, videoId);
  }

  @Get(':videoId/progress')
  @ApiOperation({ summary: '获取视频观看进度' })
  async getWatchProgress(
    @CurrentUser() user: User,
    @Param('videoId') videoId: string
  ) {
    return {
      progress: await this.watchHistoryService.getWatchProgress(user.id, videoId)
    };
  }
} 