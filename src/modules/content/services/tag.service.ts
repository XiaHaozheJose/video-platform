import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, Like, MoreThanOrEqual, LessThan } from 'typeorm';
import { Tag, TagType } from '../entities/tag.entity';
import { TagListQueryDto, CreateTagDto, UpdateTagDto } from '../dto/tag.dto';
import { Video } from '../entities/video.entity';
import { Category } from '../entities/category.entity';
import { LoggerService } from '@shared/services/logger.service';
import { Person } from '../entities/person.entity';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: TreeRepository<Tag>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private logger: LoggerService,
  ) {}

  async create(tagDto: CreateTagDto): Promise<Tag> {
    // 检查同名标签
    const existingTag = await this.tagRepository.findOne({
      where: { name: tagDto.name }
    });

    if (existingTag) {
      throw new BadRequestException('标签名称已存在');
    }

    const tag = this.tagRepository.create(tagDto);

    // 设置父标签
    if (tagDto.parentId) {
      const parent = await this.tagRepository.findOne({
        where: { id: tagDto.parentId }
      });

      if (!parent) {
        throw new NotFoundException('父标签不存在');
      }

      // 检查父标签规则
      if (parent.rules?.allowedChildTypes && 
          !parent.rules.allowedChildTypes.includes(tagDto.type || TagType.OTHER)) {
        throw new BadRequestException('不允许的子标签类型');
      }

      tag.parent = parent;
    }

    return await this.tagRepository.save(tag);
  }

  async findAll(query: TagListQueryDto) {
    const queryBuilder = this.tagRepository.createQueryBuilder('tag')
      .leftJoinAndSelect('tag.videos', 'video');

    if (query.type) {
      queryBuilder.andWhere('tag.type = :type', { type: query.type });
    }

    if (query.keyword) {
      queryBuilder.andWhere('tag.name LIKE :keyword', { 
        keyword: `%${query.keyword}%` 
      });
    }

    return await queryBuilder.getMany();
  }

  async findOrCreate(names: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];
    
    for (const name of names) {
      // 1. 查找现有标签
      let tag = await this.tagRepository.findOne({ 
        where: { name }
      });

      // 2. 查找相似标签
      if (!tag) {
        const similarTag = await this.findSimilarTag(name);
        if (similarTag) {
          tag = similarTag;
        }
      }

      // 3. 创建新标签
      if (!tag) {
        tag = this.tagRepository.create({
          name,
          type: TagType.OTHER,
          useCount: 0,
          metadata: {
            lastUsed: new Date(),
            source: 'manual'
          }
        });
      }

      // 4. 更新使用信息
      tag.useCount++;
      tag.metadata = {
        ...tag.metadata,
        lastUsed: new Date()
      };

      const savedTag = await this.tagRepository.save(tag);
      tags.push(savedTag);
    }

    return tags;
  }

  async update(id: string, tagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ 
      where: { id },
      relations: ['parent', 'children']
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    // 检查是否是特征标签，特征标签需要管理员审核
    if (tag.type === TagType.FEATURE) {
      // 这里可以添加管理员权限检查
      throw new BadRequestException('特征标签需要管理员审核');
    }

    // 更新父标签
    if (tagDto.parentId !== undefined) {
      if (tagDto.parentId === null) {
        tag.parent = null;
      } else {
        const parent = await this.tagRepository.findOne({
          where: { id: tagDto.parentId }
        });

        if (!parent) {
          throw new NotFoundException('父标签不存在');
        }

        // 检查是否形成循环
        if (await this.isDescendant(parent.id, tag.id)) {
          throw new BadRequestException('不能将标签设置为其子孙标签的子标签');
        }

        tag.parent = parent;
      }
    }

    Object.assign(tag, tagDto);
    return await this.tagRepository.save(tag);
  }

  private async isDescendant(parentId: string, childId: string): Promise<boolean> {
    const descendants = await this.tagRepository.findDescendants(
      await this.tagRepository.findOne({ where: { id: childId } })
    );
    return descendants.some(d => d.id === parentId);
  }

  async remove(id: string): Promise<void> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['videos', 'children']
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    // 检查规则限制
    if (tag.rules?.minVideos && tag.videos.length >= tag.rules.minVideos) {
      throw new BadRequestException('标签关联的视频数量超过最小限制，无法删除');
    }

    // 检查是否有子标签
    if (tag.children.length > 0) {
      throw new BadRequestException('请先删除子标签');
    }

    await this.tagRepository.remove(tag);
  }

  async getPopularTags(limit: number = 20): Promise<Tag[]> {
    return await this.tagRepository.find({
      order: { useCount: 'DESC' },
      take: limit,
    });
  }

  async getRelatedTags(tagId: string): Promise<Tag[]> {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
      relations: ['videos', 'videos.tagEntities'],
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    // 获取相关标签
    const relatedTags = new Map<string, { tag: Tag; count: number }>();
    
    for (const video of tag.videos) {
      for (const relatedTag of video.tagEntities) {
        if (relatedTag.id === tagId) continue;
        
        const existing = relatedTags.get(relatedTag.id);
        if (existing) {
          existing.count++;
        } else {
          relatedTags.set(relatedTag.id, { tag: relatedTag, count: 1 });
        }
      }
    }

    return Array.from(relatedTags.values())
      .sort((a, b) => b.count - a.count)
      .map(item => item.tag);
  }

  async searchByTag(tagName: string, page: number = 1, limit: number = 20) {
    const tag = await this.tagRepository.findOne({
      where: { name: tagName },
      relations: ['videos'],
    });

    if (!tag) {
      return {
        items: [],
        total: 0,
        page,
        limit,
      };
    }

    const [items, total] = await this.videoRepository
      .createQueryBuilder('video')
      .innerJoin('video.tagEntities', 'tag')
      .where('tag.id = :tagId', { tagId: tag.id })
      .orderBy('video.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }
  async mergeTags(sourceId: string, targetId: string): Promise<void> {
    const [source, target] = await Promise.all([
      this.tagRepository.findOne({
        where: { id: sourceId },
        relations: ['videos']
      }),
      this.tagRepository.findOne({
        where: { id: targetId },
        relations: ['videos', 'synonyms']
      })
    ]);

    if (!source || !target) {
      throw new NotFoundException('标签不存在');
    }

    // 合并同义词
    target.synonyms = [
      ...(target.synonyms || []),
      ...(source.synonyms || []),
      source.name
    ];

    // 合并使用次数
    target.useCount += source.useCount;

    // 更新视频关联
    const videos = await this.videoRepository
      .createQueryBuilder('video')
      .innerJoin('video.tagEntities', 'tag')
      .where('tag.id = :sourceId', { sourceId })
      .getMany();

    for (const video of videos) {
      if (!target.videos.some(v => v.id === video.id)) {
        target.videos.push(video);
      }
    }

    // 保存更改
    await this.tagRepository.save(target);

    // 删除源标签
    await this.tagRepository.remove(source);
  }
  async suggestTags(videoId: string): Promise<Tag[]> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['categories', 'tagEntities', 'actors', 'directors']
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    // 1. 基于分类的标签推荐
    const categoryIds = video.categories.map(c => c.id);
    const categoryBasedTags = await this.tagRepository
      .createQueryBuilder('tag')
      .innerJoin('tag.categories', 'category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .andWhere('tag.id NOT IN (:...existingTags)', { 
        existingTags: video.tagEntities.map(t => t.id) 
      })
      .orderBy('tag.useCount', 'DESC')
      .limit(5)
      .getMany();

    // 2. 基于相似视频的标签推荐
    const similarVideos = await this.videoRepository
      .createQueryBuilder('video')
      .innerJoin('video.categories', 'category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .andWhere('video.id != :videoId', { videoId })
      .limit(5)
      .getMany();

    const similarVideoTags = await this.tagRepository
      .createQueryBuilder('tag')
      .innerJoin('tag.videos', 'video')
      .where('video.id IN (:...videoIds)', { 
        videoIds: similarVideos.map(v => v.id) 
      })
      .andWhere('tag.id NOT IN (:...existingTags)', { 
        existingTags: [...video.tagEntities.map(t => t.id), ...categoryBasedTags.map(t => t.id)]
      })
      .orderBy('tag.useCount', 'DESC')
      .limit(5)
      .getMany();

    // 3. 基于演员和导演的标签推荐
    const personIds = [...video.actors.map(a => a.id), ...video.directors.map(d => d.id)];
    const personBasedTags = await this.tagRepository
      .createQueryBuilder('tag')
      .innerJoin('tag.videos', 'video')
      .innerJoin('video.actors', 'actor')
      .where('actor.id IN (:...personIds)', { personIds })
      .andWhere('tag.id NOT IN (:...existingTags)', { 
        existingTags: [
          ...video.tagEntities.map(t => t.id),
          ...categoryBasedTags.map(t => t.id),
          ...similarVideoTags.map(t => t.id)
        ]
      })
      .orderBy('tag.useCount', 'DESC')
      .limit(5)
      .getMany();

    // 4. 计算每个标签的推荐权重
    const recommendedTags = [...categoryBasedTags, ...similarVideoTags, ...personBasedTags]
      .map(tag => ({
        ...tag,
        recommendScore: this.calculateRecommendScore(tag, video)
      }))
      .sort((a, b) => b.recommendScore - a.recommendScore);

    return recommendedTags;
  }

  // 计算标签推荐分数
  private calculateRecommendScore(tag: Tag, video: Video): number {
    let score = 0;

    // 基础分数：使用次数的对数
    score += Math.log(tag.useCount + 1);

    // 权重分数
    score += tag.weight;

    // 时间衰减：最后使用时间越近分数越高
    if (tag.metadata?.lastUsed) {
      const daysSinceLastUse = (Date.now() - new Date(tag.metadata.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceLastUse); // 最近10天内使用过的加分
    }

    // 优先级分数
    if (tag.metadata?.priority) {
      score += tag.metadata.priority;
    }

    return score;
  }

  // 获取标签云数据
  async getTagCloud(): Promise<Array<{ tag: Tag; size: number }>> {
    const tags = await this.tagRepository.find({
      where: { useCount: MoreThanOrEqual(1) },
      order: { useCount: 'DESC' },
      take: 100,
    });

    const maxCount = Math.max(...tags.map(t => t.useCount));
    const minCount = Math.min(...tags.map(t => t.useCount));
    const sizeRange = 4; // 字体大小范围：1-5

    return tags.map(tag => ({
      tag,
      size: 1 + Math.floor(((tag.useCount - minCount) / (maxCount - minCount)) * sizeRange)
    }));
  }

  // 标签统计相关方法
  async getTagStatistics() {
    const stats = await this.tagRepository
      .createQueryBuilder('tag')
      .select([
        'COUNT(*) as totalTags',
        'SUM(CASE WHEN type = :genre THEN 1 ELSE 0 END) as genreTags',
        'SUM(CASE WHEN type = :region THEN 1 ELSE 0 END) as regionTags',
        'SUM(CASE WHEN type = :era THEN 1 ELSE 0 END) as eraTags',
        'SUM(CASE WHEN type = :feature THEN 1 ELSE 0 END) as featureTags',
        'SUM(CASE WHEN type = :other THEN 1 ELSE 0 END) as otherTags',
        'AVG("useCount") as avgUseCount',
        'MAX("useCount") as maxUseCount',
      ])
      .setParameters({
        genre: TagType.GENRE,
        region: TagType.REGION,
        era: TagType.ERA,
        feature: TagType.FEATURE,
        other: TagType.OTHER,
      })
      .getRawOne();

    const unusedTags = await this.tagRepository.count({
      where: { useCount: 0 }
    });

    const topUsedTags = await this.tagRepository.find({
      order: { useCount: 'DESC' },
      take: 10,
    });

    const recentlyUsedTags = await this.tagRepository.find({
      where: {
        metadata: {
          lastUsed: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 最近7天
        }
      },
      order: { 'metadata' : { 'lastUsed': 'DESC' } },
      take: 10,
    });

    return {
      ...stats,
      unusedTags,
      topUsedTags,
      recentlyUsedTags,
    };
  }

  // 获取标签使用趋势
  async getTagUsageTrend(tagId: string, days: number = 30) {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
      relations: ['videos']
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trend = await this.videoRepository
      .createQueryBuilder('video')
      .innerJoin('video.tagEntities', 'tag')
      .where('tag.id = :tagId', { tagId })
      .andWhere('video.createdAt >= :startDate', { startDate })
      .select([
        'DATE(video.createdAt) as date',
        'COUNT(*) as count'
      ])
      .groupBy('DATE(video.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trend;
  }

  async autoGenerateTags(video: Video): Promise<Tag[]> {
    const tags: Tag[] = [];

    // 1. 根据类生成类型标签
    if (video.categories?.length) {
      const genreTag = await this.findOrCreateTag(
        video.categories[0].name,
        TagType.GENRE
      );
      tags.push(genreTag);
    }

    // 2. 根据地区生成地区标签
    if (video.area) {
      const regionTag = await this.findOrCreateTag(
        video.area,  // 直接使用原始地区名称
        TagType.REGION
      );
      tags.push(regionTag);
    }

    // 3. 根据语言生成语言标签
    if (video.language) {
      const languageTag = await this.findOrCreateTag(
        video.language,
        TagType.LANGUAGE
      );
      tags.push(languageTag);
    }

    // 4. 根据年份生成年代标签
    if (video.year) {
      const eraTag = await this.findOrCreateTag(
        `${video.year}年`,
        TagType.ERA
      );
      tags.push(eraTag);
    }

    // 5. 根据特征生成特征标签
    const featureTags = await this.generateFeatureTags(video);
    tags.push(...featureTags);

    return tags;
  }

  // 生成特征标签
  private async generateFeatureTags(video: Video): Promise<Tag[]> {
    const tags: Tag[] = [];

    // 根据评分生成标签
    if (video.rating >= 9) {
      tags.push(await this.findOrCreateTag('神作', TagType.FEATURE));
    } else if (video.rating >= 8) {
      tags.push(await this.findOrCreateTag('高分', TagType.FEATURE));
    } else if (video.rating <= 5) {
      tags.push(await this.findOrCreateTag('低分', TagType.FEATURE));
    }

    // 根据播放量生成标签
    if (video.viewCount >= 100000) {
      tags.push(await this.findOrCreateTag('热门', TagType.FEATURE));
    }

    // 根据更新状态生成���签
    if (video.updateStatus === '完结') {
      tags.push(await this.findOrCreateTag('已完结', TagType.FEATURE));
    } else if (video.updateStatus === '连载中') {
      tags.push(await this.findOrCreateTag('连载中', TagType.FEATURE));
    }

    return tags;
  }

  // 查找或创建标签
  private async findOrCreateTag(name: string, type: TagType): Promise<Tag> {
    // 先查找相似标签
    const similarTag = await this.findSimilarTag(name);
    if (similarTag) {
      // 更新使用次数
      similarTag.useCount++;
      similarTag.metadata = {
        ...similarTag.metadata,
        lastUsed: new Date()
      };
      await this.tagRepository.save(similarTag);
      return similarTag;
    }

    // 没有相似标签则创建新标签
    let tag = await this.tagRepository.findOne({ where: { name } });
    if (!tag) {
      tag = this.tagRepository.create({
        name,
        type,
        useCount: 1,
        metadata: {
          lastUsed: new Date()
        }
      });
      await this.tagRepository.save(tag);
    }
    return tag;
  }

  // 查找相似标签
  private async findSimilarTag(name: string): Promise<Tag | null> {
    const allTags = await this.tagRepository.find({
      where: { type: TagType.OTHER } // 只在其他类型的标签中查找相似标签
    });
    
    let mostSimilarTag: Tag | null = null;
    let highestSimilarity = 0;

    for (const tag of allTags) {
      // 1. 完全匹配
      if (tag.name === name) return tag;

      // 2. 同义词匹配
      if (tag.synonyms?.includes(name)) return tag;

      // 3. 计算综合相似度
      const similarity = this.calculateOverallSimilarity(tag.name, name);
      if (similarity > highestSimilarity && similarity >= 0.8) {
        highestSimilarity = similarity;
        mostSimilarTag = tag;
      }
    }

    return mostSimilarTag;
  }

  // 优化相似度算法 - 使用编辑距离(Levenshtein Distance)
  private calculateSimilarity(str1: string, str2: string): number {
    // 如果字符串完全相同
    if (str1 === str2) return 1;
    
    // 如果其中一个字符串为空
    if (!str1.length || !str2.length) return 0;

    // 计算编辑距离
    const distance = this.levenshteinDistance(str1, str2);
    
    // 计算相似度
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = 1 - distance / maxLength;

    return similarity;
  }

  // 编辑距离算法
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    // 初始化
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // 动态规划计算编辑距离
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1,  // 替换
            dp[i - 1][j] + 1,      // 删除
            dp[i][j - 1] + 1       // 插入
          );
        }
      }
    }

    return dp[m][n];
  }

  // 添加中文分词相似度计算
  private calculateChineseSimilarity(str1: string, str2: string): number {
    // 将中文字符串分词(这里使用简单的单字分词,实际项目中可以使用专业分词库)
    const words1 = Array.from(str1);
    const words2 = Array.from(str2);

    // 计算词集合的交集和并集
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    // 使用Jaccard相似度系数
    return intersection.size / union.size;
  }

  // 综合相似度计算
  private calculateOverallSimilarity(str1: string, str2: string): number {
    // 编辑距离相似度
    const editSimilarity = this.calculateSimilarity(str1, str2);
    
    // 中文分词相似度
    const chineseSimilarity = this.calculateChineseSimilarity(str1, str2);

    // 加权平均
    return (editSimilarity * 0.6 + chineseSimilarity * 0.4);
  }

  // 添加自动合并相似标签的方法
  async mergeSimilarTags(threshold: number = 0.8): Promise<void> {
    const tags = await this.tagRepository.find();
    const merged = new Set<string>(); // 记录已合并的标签ID

    for (let i = 0; i < tags.length; i++) {
      if (merged.has(tags[i].id)) continue;

      for (let j = i + 1; j < tags.length; j++) {
        if (merged.has(tags[j].id)) continue;

        const similarity = this.calculateOverallSimilarity(
          tags[i].name,
          tags[j].name
        );

        if (similarity >= threshold) {
          // 合并标签
          await this.mergeTags(tags[j].id, tags[i].id);
          merged.add(tags[j].id);
        }
      }
    }
  }

  // 添加自动清理标签的方法
  async cleanupUnusedTags(days: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 查找未使用的标签
    const unusedTags = await this.tagRepository.find({
      where: [
        { useCount: 0 },
        {
          metadata: {
            lastUsed: LessThan(cutoffDate)
          }
        }
      ]
    });

    // 删除未使用的标签
    for (const tag of unusedTags) {
      // 不删除系统生成的标签
      if (tag.type !== TagType.OTHER) continue;

      try {
        await this.tagRepository.remove(tag);
      } catch (error) {
        this.logger.error(
          `Failed to remove unused tag: ${tag.name}`,
          error.stack,
          'TagService'
        );
      }
    }
  }

  // 添加新方法
  async getCategoryTags(categoryId: string) {
    // 1. 获取该分类下所有标签
    const tags = await this.tagRepository
      .createQueryBuilder('tag')
      .innerJoin('tag.videos', 'video')
      .innerJoin('video.categories', 'category')
      .where('category.id = :categoryId', { categoryId })
      .getMany();

    // 2. 按类型分组
    const groupedTags = {
      genres: tags.filter(tag => tag.type === TagType.GENRE),
      regions: tags.filter(tag => tag.type === TagType.REGION),
      languages: tags.filter(tag => tag.type === TagType.LANGUAGE),
      eras: tags.filter(tag => tag.type === TagType.ERA),
      features: tags.filter(tag => tag.type === TagType.FEATURE),
      others: tags.filter(tag => tag.type === TagType.OTHER),
    };

    // 3. 获取每个类型的热门标签
    const hotTags = await this.tagRepository
      .createQueryBuilder('tag')
      .innerJoin('tag.videos', 'video')
      .innerJoin('video.categories', 'category')
      .where('category.id = :categoryId', { categoryId })
      .orderBy('tag.useCount', 'DESC')
      .limit(10)
      .getMany();

    return {
      all: tags,              // 所有标签
      grouped: groupedTags,   // 按类型分组的标签
      hot: hotTags,          // 热门标签
      statistics: {          // 统计信息
        total: tags.length,
        byType: {
          genres: groupedTags.genres.length,
          regions: groupedTags.regions.length,
          languages: groupedTags.languages.length,
          eras: groupedTags.eras.length,
          features: groupedTags.features.length,
          others: groupedTags.others.length,
        }
      }
    };
  }
} 
