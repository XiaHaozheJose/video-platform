import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/modules/user/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { AdminGuard } from '@/modules/user/guards/admin.guard';
import { CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchDto } from '../dto/search.dto';
import { User } from '@/modules/user/entities/user.entity';

@ApiTags('搜索')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '搜索视频' })
  search(@Query() searchDto: SearchDto) {
    return this.searchService.search(searchDto);
  }

  @Get('filters')
  @ApiOperation({ summary: '获取搜索过滤条件' })
  getFilters() {
    return this.searchService.getFilters();
  }

  @Get('suggestions')
  @ApiOperation({ summary: '获取搜索建议' })
  async getSuggestions(
    @Query('keyword') keyword: string,
    @CurrentUser() user: User,
    @Query('limit') limit: number = 10
  ) {
    return await this.searchService.getSearchSuggestions(keyword, user, limit);
  }

  @Get('hot')
  @ApiOperation({ summary: '获取热门搜索' })
  @CacheTTL(300) // 缓存5分钟
  async getHotSearches(@Query('limit') limit: number = 10) {
    return await this.searchService.getHotSearches(limit);
  }

  @Get('trends')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取搜索趋势' })
  async getSearchTrends(@Query('days') days: number = 7) {
    return await this.searchService.getSearchTrends(days);
  }
} 