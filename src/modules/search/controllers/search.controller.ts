import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchDto } from '../dto/search.dto';

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
} 