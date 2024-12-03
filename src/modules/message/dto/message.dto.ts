import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsUUID, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessagePriority } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ description: '发送者ID', required: false })
  @IsOptional()
  @IsUUID()
  senderId?: string;

  @ApiProperty({ description: '接收者ID' })
  @IsUUID()
  receiverId: string;

  @ApiProperty({ description: '消息类型', enum: MessageType })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({ description: '消息标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '消息内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '优先级', enum: MessagePriority })
  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: '过期时间' })
  @IsOptional()
  @IsDate()
  expireAt?: Date;

  @ApiPropertyOptional({ description: '是否发送邮件通知' })
  @IsOptional()
  sendEmail?: boolean;
}

export class MarkReadDto {
  @ApiProperty({ description: '消息ID列表' })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
} 