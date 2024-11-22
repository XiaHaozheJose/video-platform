import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RedisService } from '@shared/services/redis.service';
import { LoggerService } from '@shared/services/logger.service';
import { Video } from '../entities/video.entity';
import { Category } from '../entities/category.entity';
import { Actor } from '../entities/actor.entity';
import { Director } from '../entities/director.entity';
import { Episode } from '../entities/episode.entity';
import { CreateVideoDto, UpdateVideoDto, VideoListDto, CreateEpisodeDto, VideoStatus } from '../dto/video.dto';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    private redisService: RedisService,
    private logger: LoggerService,
  ) {}

  async create(createVideoDto: CreateVideoDto): Promise<Video> {
    const { categoryIds, actorIds, directorIds, ...videoData } = createVideoDto;

    // 创建视频基本信息
    const video = this.videoRepository.create(videoData);

    // 处理关联数据
    if (categoryIds?.length) {
      video.categories = await this.categoryRepository.findBy({ id: In(categoryIds) });
    }
    if (actorIds?.length) {
      video.actors = await this.actorRepository.findBy({ id: In(actorIds) });
    }
    if (directorIds?.length) {
      video.directors = await this.directorRepository.findBy({ id: In(directorIds) });
    }

    try {
      const savedVideo = await this.videoRepository.save(video);
      await this.clearVideoCache();
      return savedVideo;
    } catch (error) {
      this.logger.error('Failed to create video', error.stack, 'VideoService');
      throw new BadRequestException('创建视频失败');
    }
  }

  async findAll(query: VideoListDto) {
    const { page = 1, limit = 10, categoryId, year, area, status, keyword } = query;

    // 尝试从缓存获取
    const cacheKey = `videos:list:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const queryBuilder = this.videoRepository.createQueryBuilder('video')
      .leftJoinAndSelect('video.categories', 'category')
      .leftJoinAndSelect('video.actors', 'actor')
      .leftJoinAndSelect('video.directors', 'director');

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    if (year) {
      queryBuilder.andWhere('video.year = :year', { year });
    }

    if (area) {
      queryBuilder.andWhere('video.area = :area', { area });
    }

    if (status) {
      queryBuilder.andWhere('video.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere('(video.title LIKE :keyword OR video.description LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = {
      items,
      total,
      page,
      limit,
    };

    // 设置缓存
    await this.redisService.set(cacheKey, JSON.stringify(result), 300); // 5分钟缓存

    return result;
  }

  async findOne(id: string): Promise<Video> {
    const cacheKey = `video:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['categories', 'actors', 'directors', 'episodes'],
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    // 设置缓存
    await this.redisService.set(cacheKey, JSON.stringify(video), 3600); // 1小时缓存

    return video;
  }

  async update(id: string, updateVideoDto: UpdateVideoDto): Promise<Video> {
    const { categoryIds, actorIds, directorIds, ...videoData } = updateVideoDto;

    const video = await this.findOne(id);

    // 更新关联数据
    if (categoryIds) {
      video.categories = await this.categoryRepository.findBy({ id: In(categoryIds) });
    }
    if (actorIds) {
      video.actors = await this.actorRepository.findBy({ id: In(actorIds) });
    }
    if (directorIds) {
      video.directors = await this.directorRepository.findBy({ id: In(directorIds) });
    }

    // 更新基本信息
    Object.assign(video, videoData);

    try {
      const updatedVideo = await this.videoRepository.save(video);
      await this.clearVideoCache(id);
      return updatedVideo;
    } catch (error) {
      this.logger.error('Failed to update video', error.stack, 'VideoService');
      throw new BadRequestException('更新视频失败');
    }
  }

  async remove(id: string): Promise<void> {
    const video = await this.findOne(id);
    await this.videoRepository.remove(video);
    await this.clearVideoCache(id);
  }

  async addEpisode(videoId: string, createEpisodeDto: CreateEpisodeDto): Promise<Episode> {
    const video = await this.findOne(videoId);
    
    const episode = this.episodeRepository.create({
      ...createEpisodeDto,
      video,
    });

    try {
      const savedEpisode = await this.episodeRepository.save(episode);
      await this.clearVideoCache(videoId);
      return savedEpisode;
    } catch (error) {
      this.logger.error('Failed to add episode', error.stack, 'VideoService');
      throw new BadRequestException('添加剧集失败');
    }
  }

  async updateViewCount(id: string): Promise<void> {
    const video = await this.findOne(id);
    video.viewCount += 1;
    await this.videoRepository.save(video);
    await this.clearVideoCache(id);
  }

  private async clearVideoCache(id?: string): Promise<void> {
    if (id) {
      await this.redisService.del(`video:${id}`);
    }
    // 清除列表缓存
    const keys = await this.redisService.client.keys('videos:list:*');
    if (keys.length) {
      await this.redisService.client.del(keys);
    }
  }

  async findByExternalId(externalId: string): Promise<Video | null> {
    return await this.videoRepository.findOne({
      where: { externalId },
      relations: ['categories', 'actors', 'directors', 'episodes'],
    });
  }

  async updateEpisode(videoId: string, episodeId: string, updateEpisodeDto: CreateEpisodeDto): Promise<Episode> {
    const video = await this.findOne(videoId);
    const episode = await this.episodeRepository.findOne({
      where: { id: episodeId, video: { id: videoId } }
    });

    if (!episode) {
      throw new NotFoundException('剧集不存在');
    }

    Object.assign(episode, updateEpisodeDto);
    
    try {
      const savedEpisode = await this.episodeRepository.save(episode);
      await this.clearVideoCache(videoId);
      return savedEpisode;
    } catch (error) {
      this.logger.error('Failed to update episode', error.stack, 'VideoService');
      throw new BadRequestException('更新剧集失败');
    }
  }
} 