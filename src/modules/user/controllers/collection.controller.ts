import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { CollectionService } from '../services/collection.service';
import { AddToCollectionDto, UpdateCollectionDto } from '../dto/collection.dto';

@ApiTags('收藏管理')
@Controller('collections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  @ApiOperation({ summary: '添加收藏' })
  async addToCollection(
    @CurrentUser() user: User,
    @Body() dto: AddToCollectionDto
  ) {
    return await this.collectionService.addToCollection(
      user,
      dto.videoId,
      dto.note,
      dto.tags
    );
  }

  @Get()
  @ApiOperation({ summary: '获取用户收藏列表' })
  async getUserCollections(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return await this.collectionService.getUserCollections(user.id, page, limit);
  }

  @Put(':videoId')
  @ApiOperation({ summary: '更新收藏' })
  async updateCollection(
    @CurrentUser() user: User,
    @Param('videoId') videoId: string,
    @Body() dto: UpdateCollectionDto
  ) {
    return await this.collectionService.updateCollection(
      user.id,
      videoId,
      dto.note,
      dto.tags
    );
  }

  @Delete(':videoId')
  @ApiOperation({ summary: '取消收藏' })
  async removeFromCollection(
    @CurrentUser() user: User,
    @Param('videoId') videoId: string
  ) {
    return await this.collectionService.removeFromCollection(user.id, videoId);
  }

  @Get(':videoId/status')
  @ApiOperation({ summary: '检查是否已收藏' })
  async isCollected(
    @CurrentUser() user: User,
    @Param('videoId') videoId: string
  ) {
    return {
      isCollected: await this.collectionService.isCollected(user.id, videoId)
    };
  }
} 