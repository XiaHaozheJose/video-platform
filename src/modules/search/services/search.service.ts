import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from '@modules/content/entities/video.entity';
import { Category } from '@modules/content/entities/category.entity';
import { Actor } from '@modules/content/entities/actor.entity';
import { Director } from '@modules/content/entities/director.entity';
import { SearchDto } from '../dto/search.dto';
import { RedisService } from '@shared/services/redis.service';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
    private redisService: RedisService,
    private logger: LoggerService,
  ) {}

  async search(searchDto: SearchDto) {
    const {
      keyword,
      categoryIds,
      year,
      area,
      language,
      actorIds,
      directorIds,
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      orderDir = 'DESC',
    } = searchDto;

    // 尝试从缓存获取
    const cacheKey = `search:${JSON.stringify(searchDto)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 构建查询
    const queryBuilder = this.videoRepository
      .createQueryBuilder('video')
      .leftJoinAndSelect('video.categories', 'category')
      .leftJoinAndSelect('video.actors', 'actor')
      .leftJoinAndSelect('video.directors', 'director')
      .leftJoinAndSelect('video.episodes', 'episode');

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(video.title ILIKE :keyword OR video.description ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 分类过滤
    if (categoryIds?.length) {
      queryBuilder.andWhere('category.id IN (:...categoryIds)', { categoryIds });
    }

    // 年份过滤
    if (year) {
      queryBuilder.andWhere('video.year = :year', { year });
    }

    // 地区过滤
    if (area) {
      queryBuilder.andWhere('video.area = :area', { area });
    }

    // 语言过滤
    if (language) {
      queryBuilder.andWhere('video.language = :language', { language });
    }

    // 演员过滤
    if (actorIds?.length) {
      queryBuilder.andWhere('actor.id IN (:...actorIds)', { actorIds });
    }

    // 导演过滤
    if (directorIds?.length) {
      queryBuilder.andWhere('director.id IN (:...directorIds)', { directorIds });
    }

    // 排序
    queryBuilder.orderBy(`video.${orderBy}`, orderDir);

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    try {
      const [items, total] = await queryBuilder.getManyAndCount();

      const result = {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      // 设置缓存，有效期5分钟
      await this.redisService.set(cacheKey, JSON.stringify(result), 300);

      return result;
    } catch (error) {
      this.logger.error(
        'Search failed',
        error.stack,
        'SearchService',
      );
      throw error;
    }
  }

  async getFilters() {
    const cacheKey = 'search:filters';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const [categories, areas, languages] = await Promise.all([
        this.categoryRepository.find(),
        this.videoRepository
          .createQueryBuilder('video')
          .select('DISTINCT video.area', 'area')
          .where('video.area IS NOT NULL')
          .getRawMany(),
        this.videoRepository
          .createQueryBuilder('video')
          .select('DISTINCT video.language', 'language')
          .where('video.language IS NOT NULL')
          .getRawMany(),
      ]);

      const currentYear = new Date().getFullYear();
      const years = Array.from(
        { length: 30 },
        (_, i) => currentYear - i,
      );

      const result = {
        categories,
        areas: areas.map(item => item.area),
        languages: languages.map(item => item.language),
        years,
      };

      // 设置缓存，有效期1小时
      await this.redisService.set(cacheKey, JSON.stringify(result), 3600);

      return result;
    } catch (error) {
      this.logger.error(
        'Get filters failed',
        error.stack,
        'SearchService',
      );
      throw error;
    }
  }
} 