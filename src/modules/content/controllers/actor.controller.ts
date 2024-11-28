import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { AdminGuard } from '@modules/user/guards/admin.guard';
import { CreateActorDto, UpdateActorDto } from '../dto/actor.dto';
import { ActorService } from '../services/actor.service';

@ApiTags('演员管理')
@Controller('actors')
export class ActorController {
  constructor(private readonly actorService: ActorService) {}

  @Get()
  @ApiOperation({ summary: '获取演员列表' })
  async findAll(@Query('limit') limit: number = 100) {
    return this.actorService.findAll(limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建演员' })
  async create(@Body() createActorDto: CreateActorDto) {
    return this.actorService.create(createActorDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新演员' })
  async update(@Param('id') id: string, @Body() updateActorDto: UpdateActorDto) {
    return this.actorService.update(id, updateActorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除演员' })
  async remove(@Param('id') id: string) {
    return this.actorService.remove(id);
  }
} 