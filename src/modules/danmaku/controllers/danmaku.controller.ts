import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/user/decorators/current-user.decorator';
import { User } from '@modules/user/entities/user.entity';
import { DanmakuService } from '../services/danmaku.service';
import { CreateDanmakuDto, DanmakuQueryDto, DanmakuSegmentDto } from '../dto/danmaku.dto';
import { Danmaku } from '../entities/danmaku.entity';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('弹幕管理')
@Controller('danmaku')
@UseInterceptors(CacheInterceptor)
export class DanmakuController {
  constructor(private readonly danmakuService: DanmakuService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送弹幕' })
  @ApiResponse({ status: 201, description: '弹幕发送成功' })
  async send(
    @CurrentUser() user: User,
    @Body() createDanmakuDto: CreateDanmakuDto
  ) {
    const danmaku = new Danmaku();
    Object.assign(danmaku, createDanmakuDto);
    danmaku.user = user;
    
    return this.danmakuService.send(danmaku);
  }

  @Get()
  @ApiOperation({ summary: '获取弹幕' })
  @ApiQuery({ name: 'videoId', required: true })
  @ApiQuery({ name: 'start', required: true })
  @ApiQuery({ name: 'end', required: true })
  @CacheTTL(30)  // 30秒缓存
  async getByTimeRange(@Query() query: DanmakuQueryDto) {
    return this.danmakuService.getByTimeRange(
      query.videoId,
      query.start,
      query.end
    );
  }

  @Post('batch')
  @ApiOperation({ summary: '批量获取弹幕' })
  @ApiResponse({ status: 200, description: '批量获取弹幕成功' })
  async batchGet(
    @Query('videoId') videoId: string,
    @Body() segments: DanmakuSegmentDto[]
  ) {
    return this.danmakuService.batchGetDanmaku(videoId, segments);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取弹幕统计' })
  @ApiQuery({ name: 'videoId', required: true })
  @CacheTTL(300)  // 5分钟缓存
  async getStats(@Query('videoId') videoId: string) {
    return this.danmakuService.getDanmakuStats(videoId);
  }
} 