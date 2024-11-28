import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RedisService } from '@shared/services/redis.service';
import { LoggerService } from '@shared/services/logger.service';
import { Video } from '../entities/video.entity';
import { Category } from '../entities/category.entity';
import { Episode } from '../entities/episode.entity';
import { Person, PersonRole } from '../entities/person.entity';
import { CreateVideoDto, UpdateVideoDto, VideoListDto, CreateEpisodeDto, VideoStatus } from '../dto/video.dto';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    private logger: LoggerService,
    private redisService: RedisService,
  ) {}

  async create(createVideoDto: CreateVideoDto): Promise<Video> {
    const video = this.videoRepository.create({
      ...createVideoDto,
      cover: createVideoDto.cover || '',
      area: createVideoDto.area || '未知',
      language: createVideoDto.language || '未知',
      rating: createVideoDto.rating || 0,
      viewCount: 0,
      status: createVideoDto.status || VideoStatus.DRAFT,
    });

    if (createVideoDto.categoryIds?.length) {
      const categories = await this.categoryRepository.findByIds(createVideoDto.categoryIds);
      video.categories = categories;
    }

    if (createVideoDto.actorIds?.length) {
      const actors = await this.personRepository.findByIds(createVideoDto.actorIds);
      video.actors = actors;
    }

    if (createVideoDto.directorIds?.length) {
      const directors = await this.personRepository.findByIds(createVideoDto.directorIds);
      video.directors = directors;
    }

    const savedVideo = await this.videoRepository.save(video);

    if (createVideoDto.episodes?.length) {
      const episodes = createVideoDto.episodes.map(episode => 
        this.episodeRepository.create({
          ...episode,
          video: savedVideo,
        })
      );
      await this.episodeRepository.save(episodes);
    }

    return this.findOne(savedVideo.id);
  }

  async findAll(query: VideoListDto) {
    const { page = 1, limit = 10, categoryId, year, area, status, keyword } = query;
    const queryBuilder = this.videoRepository.createQueryBuilder('video')
      .leftJoinAndSelect('video.categories', 'category')
      .leftJoinAndSelect('video.actors', 'actor')
      .leftJoinAndSelect('video.directors', 'director')
      .leftJoinAndSelect('video.episodes', 'episode');

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
      .orderBy('video.createdAt', 'DESC')
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['categories', 'actors', 'directors', 'episodes'],
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    return video;
  }

  async update(id: string, updateVideoDto: UpdateVideoDto): Promise<Video> {
    const { categoryIds, actorIds, directorIds, episodes, ...videoData } = updateVideoDto;
    const video = await this.findOne(id);

    Object.assign(video, videoData);

    if (categoryIds) {
      video.categories = await this.categoryRepository.findBy({ id: In(categoryIds) });
    }

    if (actorIds) {
      video.actors = await this.personRepository.find({
        where: { 
          id: In(directorIds), 
          role: PersonRole.DIRECTOR 
        }
      });
    }

    if (directorIds) {
      video.directors = await this.personRepository.find({
        where: { 
          id: In(directorIds), 
          role: PersonRole.DIRECTOR 
        }
      });
    }

    // 更新基本信息
    const savedVideo = await this.videoRepository.save(video);

    // 如果有新的剧集信息，更新剧集
    if (episodes?.length) {
      // 删除旧的剧集
      await this.episodeRepository.delete({ video: { id } });

      // 创建新的剧集
      const episodeEntities = episodes.map(episode => {
        const episodeEntity = this.episodeRepository.create(episode);
        episodeEntity.video = savedVideo;
        return episodeEntity;
      });
      await this.episodeRepository.save(episodeEntities);
    }

    // 清除缓存
    await this.clearVideoCache(id);

    return savedVideo;
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

  async findByName(name: string): Promise<Video | null> {
    return await this.videoRepository.findOne({
      where: { title: name },
      relations: ['categories', 'actors', 'directors', 'episodes'],
    });
  }

  async batchDelete(ids: string[]): Promise<void> {
    await this.videoRepository.delete(ids);
    // 清除缓存
    for (const id of ids) {
      await this.clearVideoCache(id);
    }
  }

  async batchUpdateStatus(ids: string[], status: VideoStatus): Promise<void> {
    await this.videoRepository.update(ids, { status });
    // 清除缓存
    for (const id of ids) {
      await this.clearVideoCache(id);
    }
  }

  async findOrCreateActors(actorIds: string[]): Promise<Person[]> {
    if (!actorIds?.length) return [];
    return await this.personRepository.find({
      where: { 
        id: In(actorIds), 
        role: PersonRole.ACTOR 
      }
    });
  }

  async findOrCreateDirectors(directorIds: string[]): Promise<Person[]> {
    if (!directorIds?.length) return [];
    return await this.personRepository.find({
      where: { 
        id: In(directorIds), 
        role: PersonRole.DIRECTOR 
      }
    });
  }

  async getEpisodes(videoId: string) {
    const video = await this.findOne(videoId);
    return video.episodes;
  }

  async getEpisode(videoId: string, episodeId: string) {
    const episode = await this.episodeRepository.findOne({
      where: { id: episodeId, video: { id: videoId } }
    });

    if (!episode) {
      throw new NotFoundException('剧集不存在');
    }

    return episode;
  }

  async deleteEpisode(videoId: string, episodeId: string) {
    const episode = await this.getEpisode(videoId, episodeId);
    await this.episodeRepository.remove(episode);
  }

  async updateEpisodes(videoId: string, episodes: any[]): Promise<void> {
    const video = await this.findOne(videoId);
    
    // 获取现有剧集
    const existingEpisodes = await this.episodeRepository.find({
      where: { video: { id: videoId } }
    });

    // 创建剧集映射以便快速查找
    const episodeMap = new Map(
      existingEpisodes.map(ep => [ep.episode, ep])
    );

    // 处理每一集
    for (const episodeData of episodes) {
      const existingEpisode = episodeMap.get(episodeData.episode);
      
      if (existingEpisode) {
        // 更新现有剧集
        Object.assign(existingEpisode, episodeData);
        await this.episodeRepository.save(existingEpisode);
      } else {
        // 创建新剧集
        const newEpisode = this.episodeRepository.create({
          ...episodeData,
          video
        });
        await this.episodeRepository.save(newEpisode);
      }
    }
  }
} 