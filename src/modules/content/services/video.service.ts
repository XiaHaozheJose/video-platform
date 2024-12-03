import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DeepPartial } from 'typeorm';
import { RedisService } from '@shared/services/redis.service';
import { LoggerService } from '@shared/services/logger.service';
import { Video, VideoStatus } from '../entities/video.entity';
import { Category } from '../entities/category.entity';
import { Episode } from '../entities/episode.entity';
import { Person, PersonRole } from '../entities/person.entity';
import { CreateVideoDto, UpdateVideoDto, VideoListDto, CreateEpisodeDto } from '../dto/video.dto';
import { TitleCleaner } from '@/modules/crawler/utils/title-cleaner';
import { TagService } from './tag.service';
import { tagConfig } from '@/config/tag.config';
import { Tag, TagType } from '../entities/tag.entity';

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
    private tagService: TagService,
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

    // 自动生成标签
    const autoTags = await this.tagService.autoGenerateTags(video);
    video.tagEntities = autoTags;

    // 如果有手动添加的标签
    if (createVideoDto.tags?.length) {
      const manualTags = await this.tagService.findOrCreate(createVideoDto.tags);
      video.tagEntities = [...video.tagEntities, ...manualTags];
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
      .leftJoinAndSelect('video.episodes', 'episode')
      .leftJoinAndSelect('video.tagEntities', 'tag');

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

    // 添加标签筛选
    if (query.tags?.length) {
      queryBuilder.andWhere('tag.name IN (:...tags)', { tags: query.tags });
    }

    // 添加标签类型筛选
    if (query.tagTypes?.length) {
      queryBuilder.andWhere('tag.type IN (:...tagTypes)', { tagTypes: query.tagTypes });
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

    // 更新标签
    if (updateVideoDto.tags !== undefined) {
      // 保留自动生成的标签
      const autoTags = video.tagEntities.filter(tag => 
        tag.type !== TagType.OTHER
      );

      // 处理手动添加的标签
      const manualTags = await this.tagService.findOrCreate(updateVideoDto.tags);
      
      video.tagEntities = [...autoTags, ...manualTags];
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

  async updateEpisodes(videoId: string, episodes: DeepPartial<Episode>[]): Promise<void> {
    const video = await this.findOne(videoId);
    
    try {
      // 先删除所有旧剧集
      await this.episodeRepository
        .createQueryBuilder()
        .delete()
        .where('videoId = :videoId', { videoId })
        .execute();

      // 对新剧集进行排序和去重
      const uniqueEpisodes = this.removeDuplicateEpisodes(episodes);

      // 创建新剧集
      const newEpisodes: DeepPartial<Episode>[] = uniqueEpisodes.map(episode => ({
        ...episode,
        video
      }));

      // 批量保存新剧集
      if (newEpisodes.length > 0) {
        await this.episodeRepository.save(newEpisodes);
      }

      // 清除缓存
      await this.clearVideoCache(videoId);
    } catch (error) {
      this.logger.error('Failed to update episodes', error.stack, 'VideoService');
      throw new BadRequestException('更新剧集失败');
    }
  }

  // 添加去重方法
  private removeDuplicateEpisodes(episodes: DeepPartial<Episode>[]): DeepPartial<Episode>[] {
    // 按集数排序
    const sortedEpisodes = [...episodes].sort((a, b) => (a.episode || 0) - (b.episode || 0));
    
    // 使用 Map 去重，以集数为 key
    const uniqueMap = new Map<number, DeepPartial<Episode>>();
    sortedEpisodes.forEach(episode => {
      if (episode.episode && !uniqueMap.has(episode.episode)) {
        uniqueMap.set(episode.episode, episode);
      }
    });

    return Array.from(uniqueMap.values());
  }

  async findSimilarVideo(title: string, threshold: number = 90): Promise<Video | null> {
    // 获取所有视频
    const videos = await this.videoRepository.find({
      select: ['id', 'title', 'externalId']
    });

    // 查找相似度最高的视频
    let mostSimilar: { video: Video; similarity: number } | null = null;

    for (const video of videos) {
      const similarity = TitleCleaner.similarity(title, video.title);
      if (similarity >= threshold && (!mostSimilar || similarity > mostSimilar.similarity)) {
        mostSimilar = { video, similarity };
      }
    }

    if (mostSimilar) {
      return this.findOne(mostSimilar.video.id);
    }

    return null;
  }

  private async validateTags(tags: Tag[]): Promise<void> {
    const tagsByType = tags.reduce((acc: Record<string, number>, tag) => {
      acc[tag.type] = (acc[tag.type] || 0) + 1;
      return acc;
    }, {});

    // 检查每种类型的标签数量是否符合规则
    Object.entries(tagsByType).forEach(([type, count]) => {
      const rule = tagConfig.rules[type];
      if (rule && count > rule.maxPerVideo) {
        throw new BadRequestException(
          `${type}类型的标签不能超过${rule.maxPerVideo}个`
        );
      }
    });
  }

  // 添加标签相关的辅助方法
  async updateTags(id: string, tags: string[]): Promise<Video> {
    const video = await this.findOne(id);
    const newTags = await this.tagService.findOrCreate(tags);
    video.tagEntities = newTags;
    return await this.videoRepository.save(video);
  }

  async refreshAutoTags(id: string): Promise<Video> {
    const video = await this.findOne(id);
    
    // 保留手动添加的标签
    const manualTags = video.tagEntities.filter(tag => 
      tag.type === TagType.OTHER
    );

    // 重新生成自动标签
    const autoTags = await this.tagService.autoGenerateTags(video);
    
    video.tagEntities = [...autoTags, ...manualTags];
    return await this.videoRepository.save(video);
  }
} 