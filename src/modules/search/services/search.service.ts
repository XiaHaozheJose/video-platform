import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { SearchHistory } from '../entities/search-history.entity';
import { HotSearch } from '../entities/hot-search.entity';
import { Video } from '@modules/content/entities/video.entity';
import { User } from '@modules/user/entities/user.entity';
import { RedisService } from '@shared/services/redis.service';
import { LoggerService } from '@shared/services/logger.service';
import { SearchDto } from '../dto/search.dto';
import { Category } from '@modules/content/entities/category.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(SearchHistory)
    private searchHistoryRepository: Repository<SearchHistory>,
    @InjectRepository(HotSearch)
    private hotSearchRepository: Repository<HotSearch>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
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

  // 记录搜索历史
  async recordSearch(keyword: string, user?: User, metadata?: any): Promise<void> {
    try {
      let history = await this.searchHistoryRepository.findOne({
        where: {
          keyword,
          userId: user?.id,
        }
      });

      if (history) {
        history.count++;
        history.lastSearchTime = new Date();
        history.metadata = { ...history.metadata, ...metadata };
      } else {
        history = this.searchHistoryRepository.create({
          keyword,
          user,
          userId: user?.id,
          lastSearchTime: new Date(),
          metadata,
        });
      }

      await this.searchHistoryRepository.save(history);
      await this.updateHotSearch(keyword, metadata);
    } catch (error) {
      this.logger.error('Failed to record search history', error.stack, 'SearchService');
    }
  }

  // 更新热门搜索
  private async updateHotSearch(keyword: string, metadata?: any): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let hotSearch = await this.hotSearchRepository.findOne({
      where: { keyword }
    });

    if (hotSearch) {
      hotSearch.searchCount++;
      hotSearch.lastUpdateTime = new Date();
      if (metadata?.resultCount) {
        hotSearch.resultCount = metadata.resultCount;
      }

      // 更新趋势数据
      if (!hotSearch.trends) hotSearch.trends = [];
      const todayTrend = hotSearch.trends.find(t => t.date === today);
      if (todayTrend) {
        todayTrend.count++;
      } else {
        hotSearch.trends.push({ date: today, count: 1 });
      }

      // 保留最近30天的趋势
      hotSearch.trends = hotSearch.trends
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);

      // 计算权重
      hotSearch.weight = this.calculateSearchWeight(hotSearch);
    } else {
      hotSearch = this.hotSearchRepository.create({
        keyword,
        searchCount: 1,
        resultCount: metadata?.resultCount || 0,
        lastUpdateTime: new Date(),
        trends: [{ date: today, count: 1 }],
      });
    }

    await this.hotSearchRepository.save(hotSearch);
  }

  // 计算搜索权重
  private calculateSearchWeight(hotSearch: HotSearch): number {
    const now = new Date();
    const daysSinceLastUpdate = (now.getTime() - hotSearch.lastUpdateTime.getTime()) / (1000 * 60 * 60 * 24);
    
    // 基础分数：搜索次数的对数
    let weight = Math.log(hotSearch.searchCount + 1);
    
    // 时间衰减：最近更新的权重更高
    weight *= Math.exp(-daysSinceLastUpdate / 7); // 7天衰减系数
    
    // 结果数量影响：结果越多权重越高
    weight *= (1 + Math.log(hotSearch.resultCount + 1) / 10);
    
    // 趋势影响：最近的搜索次数增长越快权重越高
    const recentTrends = hotSearch.trends.slice(0, 7); // 最近7天
    if (recentTrends.length > 1) {
      const growth = recentTrends.reduce((sum, t) => sum + t.count, 0) / recentTrends.length;
      weight *= (1 + growth / 10);
    }

    return weight;
  }

  // 获取搜索推荐
  async getSearchSuggestions(
    keyword: string,
    user?: User,
    limit: number = 10
  ): Promise<string[]> {
    // 1. 从缓存获取
    const cacheKey = `search:suggestions:${keyword}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. 获取个人搜索历史
    const personalHistory = user ? await this.searchHistoryRepository.find({
      where: { userId: user.id },
      order: { lastSearchTime: 'DESC' },
      take: 5,
    }) : [];

    // 3. 获取热门搜索
    const hotSearches = await this.hotSearchRepository.find({
      where: { isActive: true },
      order: { weight: 'DESC' },
      take: 5,
    });

    // 4. 获取相关搜索
    const relatedSearches = await this.searchHistoryRepository
      .createQueryBuilder('history')
      .where('history.keyword LIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('history.count', 'DESC')
      .take(5)
      .getMany();

    // 5. 合并结果
    const suggestions = new Set<string>();
    
    // 优先添加个人历史
    personalHistory.forEach(h => suggestions.add(h.keyword));
    
    // 添加热门搜索
    hotSearches.forEach(h => suggestions.add(h.keyword));
    
    // 添加相关搜索
    relatedSearches.forEach(h => suggestions.add(h.keyword));

    const result = Array.from(suggestions).slice(0, limit);

    // 6. 缓存结果
    await this.redisService.set(cacheKey, JSON.stringify(result), 300); // 缓存5分钟

    return result;
  }

  // 获取热门搜索
  async getHotSearches(limit: number = 10): Promise<HotSearch[]> {
    return await this.hotSearchRepository.find({
      where: { isActive: true },
      order: { weight: 'DESC' },
      take: limit,
    });
  }

  // 获取搜索趋势
  async getSearchTrends(days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await this.searchHistoryRepository
      .createQueryBuilder('history')
      .select([
        'DATE(history.lastSearchTime) as date',
        'COUNT(*) as searchCount',
        'COUNT(DISTINCT history.userId) as userCount',
      ])
      .where('history.lastSearchTime >= :startDate', { startDate })
      .groupBy('DATE(history.lastSearchTime)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trends;
  }
} 