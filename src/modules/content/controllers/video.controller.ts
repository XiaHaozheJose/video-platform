import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { OperationLog } from '@common/decorators/operation-log.decorator';
import { VideoService } from '../services/video.service';
import { 
  CreateVideoDto, 
  UpdateVideoDto, 
  VideoListDto, 
  CreateEpisodeDto,
} from '../dto/video.dto';

@ApiTags('视频管理')
@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建视频' })
  @OperationLog({
    module: '视频管理',
    type: 'CREATE',
    description: '创建视频',
  })
  create(@Body() createVideoDto: CreateVideoDto) {
    return this.videoService.create(createVideoDto);
  }

  @Get()
  @ApiOperation({ summary: '获取视频列表' })
  @ApiResponse({ 
    status: 200, 
    description: '返回分页的视频列表',
  })
  @RateLimit({
    points: 60,
    duration: 60,
    errorMessage: '请求过于频繁，请稍后再试',
  })
  findAll(@Query() query: VideoListDto) {
    return this.videoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取视频详情' })
  @ApiResponse({ 
    status: 200, 
    description: '返回视频详细信息',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.videoService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新视频' })
  @OperationLog({
    module: '视频管理',
    type: 'UPDATE',
    description: '更新视频',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    return this.videoService.update(id, updateVideoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除视频' })
  @OperationLog({
    module: '视频管理',
    type: 'DELETE',
    description: '删除视频',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.videoService.remove(id);
  }

  @Post(':id/episodes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加剧集' })
  @OperationLog({
    module: '视频管理',
    type: 'CREATE',
    description: '添加剧集',
  })
  addEpisode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createEpisodeDto: CreateEpisodeDto,
  ) {
    return this.videoService.addEpisode(id, createEpisodeDto);
  }

  @Post(':id/view')
  @ApiOperation({ summary: '增加播放次数' })
  @RateLimit({
    points: 1,
    duration: 1,
    errorMessage: '请求过于频繁',
  })
  async updateViewCount(@Param('id', ParseUUIDPipe) id: string) {
    await this.videoService.updateViewCount(id);
    return { message: 'success' };
  }
} 