import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchHistory } from '../entities/watch-history.entity';
import { User } from '../entities/user.entity';
import { Video } from '@modules/content/entities/video.entity';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class WatchHistoryService {
  constructor(
    @InjectRepository(WatchHistory)
    private watchHistoryRepository: Repository<WatchHistory>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    private logger: LoggerService,
  ) {}

  async updateWatchProgress(
    user: User,
    videoId: string,
    progress: number,
    duration: number
  ): Promise<WatchHistory> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId }
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    let history = await this.watchHistoryRepository.findOne({
      where: { user: { id: user.id }, video: { id: videoId } }
    });

    if (!history) {
      history = this.watchHistoryRepository.create({
        user,
        video,
        watchCount: 1,
      });
    } else {
      history.watchCount += 1;
    }

    history.watchProgress = progress;
    history.watchDuration = Math.max(history.watchDuration, duration);
    history.lastWatchTime = new Date();

    return await this.watchHistoryRepository.save(history);
  }

  async getUserWatchHistory(userId: string, page: number = 1, limit: number = 20) {
    const [items, total] = await this.watchHistoryRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['video'],
      order: { lastWatchTime: 'DESC' },
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

  async clearHistory(userId: string): Promise<void> {
    await this.watchHistoryRepository.delete({ user: { id: userId } });
  }

  async removeHistory(userId: string, videoId: string): Promise<void> {
    await this.watchHistoryRepository.delete({
      user: { id: userId },
      video: { id: videoId }
    });
  }

  async getWatchProgress(userId: string, videoId: string): Promise<number> {
    const history = await this.watchHistoryRepository.findOne({
      where: { user: { id: userId }, video: { id: videoId } }
    });
    return history?.watchProgress || 0;
  }
} 