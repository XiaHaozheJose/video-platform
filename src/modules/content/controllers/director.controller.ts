import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { AdminGuard } from '@modules/user/guards/admin.guard';
import { CreateDirectorDto, UpdateDirectorDto } from '../dto/director.dto';
import { DirectorService } from '../services/director.service';

@ApiTags('导演管理')
@Controller('directors')
export class DirectorController {
  constructor(private readonly directorService: DirectorService) {}

  @Get()
  @ApiOperation({ summary: '获取导演列表' })
  async findAll(@Query('limit') limit: number = 100) {
    return this.directorService.findAll(limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建导演' })
  async create(@Body() createDirectorDto: CreateDirectorDto) {
    return this.directorService.create(createDirectorDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新导演' })
  async update(@Param('id') id: string, @Body() updateDirectorDto: UpdateDirectorDto) {
    return this.directorService.update(id, updateDirectorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除导演' })
  async remove(@Param('id') id: string) {
    return this.directorService.remove(id);
  }
} 