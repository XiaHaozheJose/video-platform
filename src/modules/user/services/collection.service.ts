import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../entities/collection.entity';
import { User } from '../entities/user.entity';
import { Video } from '@modules/content/entities/video.entity';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    private logger: LoggerService,
  ) {}

  async addToCollection(user: User, videoId: string, note?: string, tags?: string[]): Promise<Collection> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId }
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    // 检查是否已收藏
    const existingCollection = await this.collectionRepository.findOne({
      where: { user: { id: user.id }, video: { id: videoId } }
    });

    if (existingCollection) {
      throw new BadRequestException('已经收藏过该视频');
    }

    const collection = this.collectionRepository.create({
      user,
      video,
      note,
      tags,
    });

    return await this.collectionRepository.save(collection);
  }

  async getUserCollections(userId: string, page: number = 1, limit: number = 20) {
    const [items, total] = await this.collectionRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['video'],
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

  async updateCollection(userId: string, videoId: string, note?: string, tags?: string[]): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { user: { id: userId }, video: { id: videoId } }
    });

    if (!collection) {
      throw new NotFoundException('收藏记录不存在');
    }

    if (note !== undefined) collection.note = note;
    if (tags !== undefined) collection.tags = tags;

    return await this.collectionRepository.save(collection);
  }

  async removeFromCollection(userId: string, videoId: string): Promise<void> {
    const collection = await this.collectionRepository.findOne({
      where: { user: { id: userId }, video: { id: videoId } }
    });

    if (!collection) {
      throw new NotFoundException('收藏记录不存在');
    }

    await this.collectionRepository.remove(collection);
  }

  async isCollected(userId: string, videoId: string): Promise<boolean> {
    const count = await this.collectionRepository.count({
      where: { user: { id: userId }, video: { id: videoId } }
    });
    return count > 0;
  }
} 