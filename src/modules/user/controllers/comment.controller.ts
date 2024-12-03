import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';

@ApiTags('评论管理')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建评论' })
  async create(
    @CurrentUser() user: User,
    @Body() createCommentDto: CreateCommentDto
  ) {
    return await this.commentService.create(user, createCommentDto);
  }

  @Get('video/:videoId')
  @ApiOperation({ summary: '获取视频评论列表' })
  async findVideoComments(
    @Param('videoId') videoId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return await this.commentService.findVideoComments(videoId, page, limit);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新评论' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto
  ) {
    return await this.commentService.update(id, user.id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除评论' })
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string
  ) {
    return await this.commentService.remove(id, user.id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞评论' })
  async like(
    @CurrentUser() user: User,
    @Param('id') id: string
  ) {
    return await this.commentService.like(id, user.id);
  }
} 