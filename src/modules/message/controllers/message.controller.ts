import { Controller, Get, Post, Body, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/user/decorators/current-user.decorator';
import { User } from '@modules/user/entities/user.entity';
import { MessageService } from '../services/message.service';
import { MarkReadDto } from '../dto/message.dto';
import { MessageType, MessageStatus } from '../entities/message.entity';

@ApiTags('消息管理')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @ApiOperation({ summary: '获取消息列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: '获取消息列表成功' })
  async getMessages(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: MessageType,
    @Query('status') status?: MessageStatus,
  ) {
    return this.messageService.getUserMessages(user.id, {
      page,
      limit,
      type,
      status,
    });
  }

  @Post('read')
  @ApiOperation({ summary: '标记消息为已读' })
  @ApiResponse({ status: 200, description: '标记消息为已读成功' })
  async markAsRead(
    @CurrentUser() user: User,
    @Body() dto: MarkReadDto,
  ) {
    return this.messageService.markAsRead(user.id, dto);
  }

  @Delete()
  @ApiOperation({ summary: '删除消息' })
  @ApiResponse({ status: 200, description: '删除消息成功' })
  async deleteMessages(
    @CurrentUser() user: User,
    @Body('messageIds') messageIds: string[],
  ) {
    return this.messageService.deleteMessages(user.id, messageIds);
  }

  @Post('archive')
  @ApiOperation({ summary: '归档消息' })
  @ApiResponse({ status: 200, description: '归档消息成功' })
  async archiveMessages(
    @CurrentUser() user: User,
    @Body('messageIds') messageIds: string[],
  ) {
    return this.messageService.archiveMessages(user.id, messageIds);
  }

  @Get('unread')
  @ApiOperation({ summary: '获取未读消息数' })
  @ApiResponse({ status: 200, description: '获取未读消息数成功' })
  async getUnreadCount(@CurrentUser() user: User) {
    return this.messageService.getUnreadCount(user.id);
  }
} 