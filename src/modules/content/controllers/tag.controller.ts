import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { AdminGuard } from '@modules/user/guards/admin.guard';
import { TagService } from '../services/tag.service';
import { CreateTagDto, UpdateTagDto, TagListQueryDto } from '../dto/tag.dto';

@ApiTags('标签管理')
@Controller('tags')
@UseInterceptors(CacheInterceptor)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: '获取标签列表' })
  @CacheTTL(300)
  async findAll(@Query() query: TagListQueryDto) {
    return await this.tagService.findAll(query);
  }

  @Get('popular')
  @ApiOperation({ summary: '获取热门标签' })
  @CacheTTL(300)
  async getPopularTags(@Query('limit') limit: number = 20) {
    return await this.tagService.getPopularTags(limit);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取标签统计数据' })
  @CacheTTL(300)
  async getTagStatistics() {
    return await this.tagService.getTagStatistics();
  }

  @Get(':id/related')
  @ApiOperation({ summary: '获取相关标签' })
  @CacheTTL(300)
  async getRelatedTags(@Param('id') id: string) {
    return await this.tagService.getRelatedTags(id);
  }

  @Get(':id/trend')
  @ApiOperation({ summary: '获取标签使用趋势' })
  @CacheTTL(300)
  async getTagUsageTrend(
    @Param('id') id: string,
    @Query('days') days: number = 30
  ) {
    return await this.tagService.getTagUsageTrend(id, days);
  }

  @Get('video/:videoId/suggest')
  @ApiOperation({ summary: '获取视频推荐标签' })
  async suggestTags(@Param('videoId') videoId: string) {
    return await this.tagService.suggestTags(videoId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建标签' })
  async create(@Body() createTagDto: CreateTagDto) {
    return await this.tagService.create(createTagDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新标签' })
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return await this.tagService.update(id, updateTagDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除标签' })
  async remove(@Param('id') id: string) {
    return await this.tagService.remove(id);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索标签相关视频' })
  @CacheTTL(300)
  async searchByTag(
    @Query('tagName') tagName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return await this.tagService.searchByTag(tagName, page, limit);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: '获取分类下的所有标签' })
  @CacheTTL(300)
  async getCategoryTags(
    @Param('categoryId') categoryId: string,
  ) {
    return await this.tagService.getCategoryTags(categoryId);
  }
} 