import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { AdminGuard } from '@modules/user/guards/admin.guard';
import { CrawlerSourceService } from '../services/crawler-source.service';
import { CreateCrawlerSourceDto, UpdateCrawlerSourceDto, CrawlerSourceListDto } from '../dto/crawler-source.dto';

@ApiTags('爬虫源管理')
@Controller('crawler/sources')
export class CrawlerSourceController {
  constructor(private readonly crawlerSourceService: CrawlerSourceService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建爬虫源' })
  create(@Body() createCrawlerSourceDto: CreateCrawlerSourceDto) {
    return this.crawlerSourceService.create(createCrawlerSourceDto);
  }

  @Get()
  @ApiOperation({ summary: '获取爬虫源列表' })
  findAll(@Query() query: CrawlerSourceListDto) {
    return this.crawlerSourceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取爬虫源详情' })
  findOne(@Param('id') id: string) {
    return this.crawlerSourceService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新爬虫源' })
  update(@Param('id') id: string, @Body() updateCrawlerSourceDto: UpdateCrawlerSourceDto) {
    return this.crawlerSourceService.update(id, updateCrawlerSourceDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除爬虫源' })
  remove(@Param('id') id: string) {
    return this.crawlerSourceService.remove(id);
  }
} 