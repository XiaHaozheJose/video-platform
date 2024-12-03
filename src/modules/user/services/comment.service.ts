import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { User } from '../entities/user.entity';
import { Video } from '@modules/content/entities/video.entity';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    private logger: LoggerService,
  ) {}

  async create(user: User, createCommentDto: CreateCommentDto): Promise<Comment> {
    const video = await this.videoRepository.findOne({
      where: { id: createCommentDto.videoId }
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      user,
      video,
    });

    return await this.commentRepository.save(comment);
  }

  async findVideoComments(videoId: string, page: number = 1, limit: number = 20) {
    const [items, total] = await this.commentRepository.findAndCount({
      where: { video: { id: videoId }, isDeleted: false },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id, user: { id: userId } }
    });

    if (!comment) {
      throw new NotFoundException('评论不存在或无权修改');
    }

    Object.assign(comment, updateCommentDto);
    return await this.commentRepository.save(comment);
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id, user: { id: userId } }
    });

    if (!comment) {
      throw new NotFoundException('评论不存在或无权删除');
    }

    // 软删除
    comment.isDeleted = true;
    await this.commentRepository.save(comment);
  }

  async like(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id }
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    comment.likes += 1;
    await this.commentRepository.save(comment);
  }
} 