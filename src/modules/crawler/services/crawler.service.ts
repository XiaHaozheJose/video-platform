import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron'
import { CrawlerTask, TaskStatus, TaskType } from '../entities/crawler-task.entity';
import { CrawlerLog, LogLevel } from '../entities/crawler-log.entity';
import { CreateTaskDto, UpdateTaskDto, TaskResultDto, CrawlProgressDto, VideoInfo } from '../dto/crawler-task.dto';
import { VideoService } from '@modules/content/services/video.service';
import { CreateVideoDto } from '@modules/content/dto/video.dto';
import { LoggerService } from '@shared/services/logger.service';
import { Person, PersonRole } from '@modules/content/entities/person.entity';
import { Category } from '@modules/content/entities/category.entity';
import { Video, VideoStatus } from '@modules/content/entities/video.entity';
import { CrawlerLogService } from './crawler-log.service';
import { ResourceAdapterFactory } from '../factories/resource-adapter.factory';
import { CrawlerSource } from '../entities/crawler-source.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrawlerThirdResourceDto, CrawlerThirdResourceDataDto, CrawlerThirdResourceCategpryDto } from '../dto/crawler-third-resource.dto';
import { CollectByTimeDto, TimeRange, CollectResult } from '../dto/crawler-task.dto';
import { SourceListQueryDto, CollectSelectedDto } from '../dto/crawler-source-list.dto';

@Injectable()
export class CrawlerService {
  private currentTask: CrawlerTask;

  constructor(
    @InjectRepository(CrawlerTask)
    private crawlerTaskRepository: Repository<CrawlerTask>,
    @InjectRepository(CrawlerSource)
    private crawlerSourceRepository: Repository<CrawlerSource>,
    @InjectRepository(CrawlerLog)
    private crawlerLogRepository: Repository<CrawlerLog>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private videoService: VideoService,
    private schedulerRegistry: SchedulerRegistry,
    private logger: LoggerService,
    private crawlerLogService: CrawlerLogService,
    private resourceAdapterFactory: ResourceAdapterFactory,
    private eventEmitter: EventEmitter2,
  ) {}

  private async findOrCreatePerson(name: string, role: PersonRole): Promise<Person> {
    let person = await this.personRepository.findOne({
      where: { name, role }
    });

    if (!person) {
      person = this.personRepository.create({
        name,
        role,
      });
      await this.personRepository.save(person);
    }

    return person;
  }

  private async processActors(actorNames: string[]): Promise<string[]> {
    const actors = await Promise.all(
      actorNames.map(name => this.findOrCreatePerson(name, PersonRole.ACTOR))
    );
    return actors.map(actor => actor.id);
  }

  private async processDirectors(directorNames: string[]): Promise<string[]> {
    const directors = await Promise.all(
      directorNames.map(name => this.findOrCreatePerson(name, PersonRole.DIRECTOR))
    );
    return directors.map(director => director.id);
  }

  async createTask(createTaskDto: CreateTaskDto): Promise<CrawlerTask> {
    // 先检查爬虫源是否存在
    const source = await this.crawlerSourceRepository.findOne({
      where: { id: createTaskDto.sourceId }
    });

    if (!source) {
      throw new NotFoundException('爬虫源不存在');
    }

    // 创建任务
    const task = this.crawlerTaskRepository.create({
      name: createTaskDto.name,
      sourceId: createTaskDto.sourceId,  // 确保设置 sourceId
      type: createTaskDto.type,
      cron: createTaskDto.cron,
      config: {
        interval: createTaskDto.interval,
        intervalUnit: createTaskDto.intervalUnit,
        categoryMapping: createTaskDto.categoryMapping,
      },
    });

    await this.crawlerTaskRepository.save(task);
    
    if (task.cron) {
      // 如果设置了cron，添加定时任务
      this.addCronJob(task);
    }

    return task;
  }

  private addCronJob(task: CrawlerTask) {
    const jobName = `task_${task.id}`;
    
    const job = new CronJob(
      task.cron,
      () => {
        this.executeTask(task.id);
      },
      null,
      true,
      'Asia/Shanghai'
    );

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
  }

  // 每天凌晨2点执行增量采集
  @Cron('0 0 2 * * *')
  async handleIncrementCrawl() {
    const tasks = await this.crawlerTaskRepository.find({
      where: { type: TaskType.INCREMENT }
    });
    for (const task of tasks) {
      await this.executeTask(task.id);
    }
  }

  async executeTask(taskId: string): Promise<TaskResultDto> {
    const task = await this.findOneTask(taskId);
    this.currentTask = task;  // 设置当前任务
    
    // 创建执行日志
    const log = await this.crawlerLogService.createLog(
      task,
      LogLevel.INFO,
      `开始执行任务: ${task.name}`,
    );

    task.status = TaskStatus.RUNNING;
    task.lastRunTime = new Date();
    await this.crawlerTaskRepository.save(task);

    try {
      const result = await this.crawlData(task, log);
      
      task.status = TaskStatus.COMPLETED;
      task.successCount += result.successCount;
      task.failCount += result.failCount;
      
      if (result.failures?.length) {
        task.lastError = JSON.stringify(result.failures[0]);
        await this.crawlerLogService.createLog(
          task,
          LogLevel.WARNING,
          '任务成，但存在失败',
          { failures: result.failures },
        );
      } else {
        await this.crawlerLogService.createLog(
          task,
          LogLevel.INFO,
          '任务成功完成',
          result,
        );
      }
      
      await this.crawlerTaskRepository.save(task);
      return result;
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.lastError = error.message;
      
      await this.crawlerLogService.createLog(
        task,
        LogLevel.ERROR,
        '任务执行失败',
        {
          error: error.message,
          stack: error.stack,
        },
      );
      
      await this.crawlerTaskRepository.save(task);
      throw error;
    } finally {
      this.currentTask = null;  // 清除当前任务
    }
  }

  private async crawlData(task: CrawlerTask, log: CrawlerLog): Promise<TaskResultDto> {
    const result: TaskResultDto = {
      successCount: 0,
      failCount: 0,
      failures: [],
    };

    try {
      const source = await this.crawlerSourceRepository.findOne({
        where: { id: task.sourceId }
      });

      if (!source) {
        throw new NotFoundException('爬虫源不存在');
      }

      const adapter = this.resourceAdapterFactory.createAdapter(source.baseUrl);
      let currentPage = 1;
      let hasMore = true;

      // 获取第一页来确定总页数
      const firstPageData = await adapter.getDetailList(1);
      const totalPages = Math.ceil(Number(firstPageData.total) / Number(firstPageData.limit));

      while (hasMore) {
        const listData = currentPage === 1 ? firstPageData : await adapter.getDetailList(currentPage);
        const progressData: CrawlProgressDto = {
          currentPage,
          totalPages,
          videos: [],
        };

        for (const item of listData.list) {
          try {
            const videoInfo: VideoInfo = {
              name: item.vod_name,
              sourceName: source.name,
              sourceType: item.type_name,
              status: 'skipped',
            };

            // 检查分类映射
            const mapping = task.config.categoryMapping.find(
              m => m.sourceId === item.type_id.toString() && m.enabled
            );

            if (mapping) {
              videoInfo.mappedCategory = {
                sourceId: mapping.sourceId,
                sourceName: mapping.sourceName,
                targetId: mapping.targetId,
                targetName: mapping.targetName,
              };

              // 检查是否已存在
              const existingVideo = await this.findExistingVideo(item);

              if (existingVideo) {
                // 检查是否需要更新
                const needsUpdate = this.checkNeedsUpdate(existingVideo, item);
                if (needsUpdate) { // && task.type === TaskType.INCREMENT
                  await this.updateVideo(existingVideo, item, task.config);
                  videoInfo.status = 'updated';
                  result.successCount++;
                }
                //  else {
                //   videoInfo.status = 'skipped';
                //   videoInfo.reason = '无需更新';
                // }
              } else {
                // 新增视频
                await this.createVideo(item);
                videoInfo.status = 'new';
                result.successCount++;
              }
            } else {
              videoInfo.reason = '无匹配分类';
            }

            progressData.videos.push(videoInfo);
          } catch (error) {
            result.failCount++;
            result.failures.push({
              data: item,
              error: error.message,
            });
          }
        }

        // 发送进度更新
        this.eventEmitter.emit(`task.progress.${task.id}`, {
          currentPage,
          totalPages,
          processedCount: currentPage * listData.list.length,
          successCount: result.successCount,
          failCount: result.failCount,
          videos: progressData.videos,
        });

        if (task.type === TaskType.INCREMENT || currentPage >= totalPages) {
          hasMore = false;
        } else {
          currentPage++;
          // 采集间隔
          if (task.config?.interval) {
            await new Promise(resolve => setTimeout(resolve, task.config.interval));
          }
        }
      }

      // 发送任务完成事件
      this.eventEmitter.emit(`task.complete.${task.id}`, {
        message: '任务完成',
        result
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  private checkNeedsUpdate(existingVideo: Video, newData: CrawlerThirdResourceDataDto): boolean {
    return (
      existingVideo.cover !== newData.vod_pic ||
      existingVideo.description !== newData.vod_content?.replace(/<[^>]+>/g, '') ||
      existingVideo.title !== newData.vod_name ||
      existingVideo.year !== parseInt(newData.vod_year) ||
      existingVideo.area !== newData.vod_area ||
      existingVideo.language !== newData.vod_lang ||
      existingVideo.rating !== parseFloat(newData.vod_score) ||
      existingVideo.updateStatus !== newData.vod_remarks ||
      this.checkEpisodesNeedUpdate(existingVideo.episodes, newData.vod_play_url, newData.vod_play_from)
    );
  }

  private checkEpisodesNeedUpdate(existingEpisodes: any[], newPlayUrl: string, newPlayFrom: string): boolean {
    // 解析新的播放地址
    const newEpisodes = this.transformEpisodes(newPlayUrl, newPlayFrom);
      
    // 如果集数不同，需要更新
    if (existingEpisodes.length !== newEpisodes.length) {
      return true;
    }

    // 检查每一集的播放地址是否有变化
    return existingEpisodes.some((episode, index) => 
      episode.playUrl !== newEpisodes[index].playUrl
    );
  }

  private shouldProcessVideo(videoDetail: any, config: any): boolean {
    const { matchRules } = config;
    if (!matchRules?.filters) return true;

    const { minRating, minYear, excludeAreas } = matchRules.filters;

    // 评分过滤
    if (minRating && parseFloat(videoDetail.vod_score) < minRating) {
      return false;
    }

    // 年份过滤
    if (minYear && parseInt(videoDetail.vod_year) < minYear) {
      return false;
    }

    // 地区过滤
    if (excludeAreas?.includes(videoDetail.vod_area)) {
      return false;
    }

    // 分类映射检查
    const categoryMapping = config.categoryMapping || [];
    const hasMapping = categoryMapping.some(
      mapping => mapping.sourceId === videoDetail.type_id && mapping.enabled
    );
    if (!hasMapping) {
      return false;
    }

    return true;
  }

  private async createVideo(videoDetail: any): Promise<void> {
    const videoDto = await this.transformData(videoDetail);
    await this.videoService.create(videoDto);
  }

  private async updateVideo(existingVideo: Video, videoDetail: CrawlerThirdResourceDataDto, config: any): Promise<any> {
    const changes = {
      cover: false,
      episodes: false,
      description: false,
      actors: false,
      directors: false,
    };

    // 检查并更新封面
    if (existingVideo.cover !== videoDetail.vod_pic) {
      changes.cover = true;
    }

    // 检查并更新剧集
    if (this.checkEpisodesNeedUpdate(existingVideo.episodes, videoDetail.vod_play_url, videoDetail.vod_play_from)) {
      changes.episodes = true;
      await this.videoService.updateEpisodes(existingVideo.id, 
        this.transformEpisodes(videoDetail.vod_play_url, videoDetail.vod_play_from)
      );
    }

    // 检查并更新描述
    const cleanDescription = videoDetail.vod_content?.replace(/<[^>]+>/g, '') || '';
    if (existingVideo.description !== cleanDescription) {
      changes.description = true;
    }

    // 更新演员和导演
    const actorNames = videoDetail.vod_actor?.split(/[,，、\s]+/).filter(Boolean) || [];
    const directorNames = videoDetail.vod_director?.split(/[,，、\s]+/).filter(Boolean) || [];

    const actorIds = await this.processActors(actorNames);
    const directorIds = await this.processDirectors(directorNames);

    if (!this.areArraysEqual(existingVideo.actors.map(a => a.id), actorIds)) {
      changes.actors = true;
    }

    if (!this.areArraysEqual(existingVideo.directors.map(d => d.id), directorIds)) {
      changes.directors = true;
    }

    // 保存更新
    await this.videoService.update(existingVideo.id, {
      title: videoDetail.vod_name,
      description: cleanDescription,
      cover: videoDetail.vod_pic || '',
      year: parseInt(videoDetail.vod_year) || new Date().getFullYear(),
      area: videoDetail.vod_area || '未知',
      language: videoDetail.vod_lang || '未知',
      rating: parseFloat(videoDetail.vod_score) || 0,
      updateStatus: videoDetail.vod_remarks || '',
      actorIds,
      directorIds,
      categoryIds: existingVideo.categories.map(c => c.id), // 保持原有分类
    });

    return changes;
  }

  private areArraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((item, index) => item === sorted2[index]);
  }

  private async handleCategories(videoDetail: any, task: CrawlerTask): Promise<string[]> {
    const mapping = task.config.categoryMapping.find(
      m => m.sourceId === videoDetail.type_id.toString() && m.enabled
    );

    if (!mapping) {
      return [];
    }

    return [mapping.targetId];
  }

  private async transformData(rawData: CrawlerThirdResourceDataDto): Promise<CreateVideoDto> {
    // 处理演员和导演数据，支持多种分隔符
    const actorNames = rawData.vod_actor
      ?.split(/[,，、\s]+/)
      .filter(name => name && name.trim())
      .map(name => name.trim()) || [];

    const directorNames = rawData.vod_director
      ?.split(/[,，、\s]+/)
      .filter(name => name && name.trim())
      .map(name => name.trim()) || [];

    // 查找或创建演员
    const actorIds = await Promise.all(
      actorNames.map(async name => {
        const actor = await this.findOrCreatePerson(name, PersonRole.ACTOR);
        return actor.id;
      })
    );

    // 查找或创建导演
    const directorIds = await Promise.all(
      directorNames.map(async name => {
        const director = await this.findOrCreatePerson(name, PersonRole.DIRECTOR);
        return director.id;
      })
    );

    // 处理分类信息
    const categoryIds = await this.handleCategories(rawData, this.currentTask);

    // 处理剧集信息，传入播放源
    const episodes = this.transformEpisodes(
      rawData.vod_play_url,
      rawData.vod_play_from
    );

    // 处理描述，去除HTML标签
    const description = rawData.vod_blurb || rawData.vod_content || '';
    const cleanDescription = description.replace(/<[^>]+>/g, '').trim();

    return {
      title: rawData.vod_name,
      description: cleanDescription,
      cover: rawData.vod_pic || '',
      year: parseInt(rawData.vod_year) || new Date().getFullYear(),
      area: rawData.vod_area || '未知',
      language: rawData.vod_lang || '未知',
      externalId: rawData.vod_id.toString(),
      source: rawData.vod_play_from || 'crawler',
      categoryIds,
      actorIds,
      directorIds,
      status: VideoStatus.PUBLISHED,
      rating: parseFloat(rawData.vod_score) || 0,
      updateStatus: rawData.vod_remarks || '',
      episodes,
      duration: rawData.vod_duration || '',
      releaseDate: rawData.vod_pubdate || null,
    };
  }

  private transformEpisodes(playUrl: string, playFrom: string): any[] {
    if (!playUrl) return [];

    try {
      const episodes = [];
      // 直接使用 # 分割剧集
      const episodeList = playUrl.split('#').filter(Boolean);
      
      // 使用 Set 记录已处理的集数
      const processedEpisodes = new Set();
      
      episodeList.forEach((item, index) => {
        // 分割集标题和播放地址，用 $ 分割
        const [title = '', url = ''] = item.split('$');
        if (!url) return;

        // 从标题中提取集数
        const episodeMatch = title.match(/(\d+)/);
        const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : index + 1;

        // 检查是否已存在该集数
        if (!processedEpisodes.has(episodeNumber)) {
          processedEpisodes.add(episodeNumber);
          
          episodes.push({
            title: title.trim() || `第${episodeNumber}集`,
            episode: episodeNumber,
            playUrl: url.trim(),
            source: playFrom || 'unknown',
          });
        } else {
          this.logger.warn(
            `Duplicate episode found: ${episodeNumber} in video with playUrl: ${playUrl}`,
            'CrawlerService'
          );
        }
      });

      // 按集数排序
      return episodes.sort((a, b) => a.episode - b.episode);
    } catch (error) {
      this.logger.error(`Failed to transform episodes: ${error.message}`, error.stack, 'CrawlerService');
      return [];
    }
  }

  async findAll(query: any) {
    const { page = 1, limit = 10, status } = query;
    const queryBuilder = this.crawlerTaskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.source', 'source');

    if (status) {
      queryBuilder.where('task.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .orderBy('task.createdAt', 'DESC')
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

  async findOneTask(id: string) {
    const task = await this.crawlerTaskRepository.findOne({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  async updateTask(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.findOneTask(id);
    
    // 如果更新了cron表达式，需要重新注册定时任务
    if (updateTaskDto.cron && updateTaskDto.cron !== task.cron) {
      const jobName = `task_${task.id}`;
      try {
        this.schedulerRegistry.deleteCronJob(jobName);
      } catch (error) {
        // 忽略不存在的任务
      }
      if (updateTaskDto.cron) {
        task.cron = updateTaskDto.cron;
        this.addCronJob(task);
      }
    }

    Object.assign(task, updateTaskDto);
    return await this.crawlerTaskRepository.save(task);
  }

  async removeTask(id: string) {
    const task = await this.findOneTask(id);
    const jobName = `task_${task.id}`;
    
    // 删除定时任务
    try {
      this.schedulerRegistry.deleteCronJob(jobName);
    } catch (error) {
      // 忽略不存在的任务
    }

    try {
      // 先删除关联的日志记录
      await this.crawlerLogRepository
        .createQueryBuilder()
        .delete()
        .where('taskId = :taskId', { taskId: id })
        .execute();

      // 然后删除任务
      await this.crawlerTaskRepository.remove(task);
    } catch (error) {
      this.logger.error(
        'Failed to remove crawler task',
        error.stack,
        'CrawlerService'
      );
      throw new BadRequestException('删除任务失败：' + error.message);
    }
  }

  async getSourceCategories(url: string): Promise<CrawlerThirdResourceCategpryDto[]> {
    try {
      const adapter = this.resourceAdapterFactory.createAdapter(url);
      return await adapter.getCategories();
    } catch (error) {
      this.logger.error('Failed to get source categories', error.stack, 'CrawlerService');
      throw error;
    }
  }

  async getTaskLogs(taskId: string, startTime?: Date, endTime?: Date) {
    await this.findOneTask(taskId); // 验证任务是否存在
    return this.crawlerLogService.findTaskLogs(taskId, startTime, endTime);
  }

  async pauseTask(id: string): Promise<CrawlerTask> {
    const task = await this.findOneTask(id);
    
    if (task.status !== TaskStatus.RUNNING) {
      throw new BadRequestException('只能暂停正在运行的任务');
    }

    // 删除定时任务
    if (task.cron) {
      const jobName = `task_${task.id}`;
      try {
        this.schedulerRegistry.deleteCronJob(jobName);
      } catch (error) {
        // 忽略不存在的任务
      }
    }

    task.status = TaskStatus.PENDING;
    return await this.crawlerTaskRepository.save(task);
  }

  async resumeTask(id: string): Promise<CrawlerTask> {
    const task = await this.findOneTask(id);
    
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('只能恢复暂停的任务');
    }

    // 重新添加定时任务
    if (task.cron) {
      this.addCronJob(task);
    }

    task.status = TaskStatus.RUNNING;
    return await this.crawlerTaskRepository.save(task);
  }

  async collectByTime(collectDto: CollectByTimeDto): Promise<CollectResult> {
    const { sourceId, timeRange, page } = collectDto;

    // 获取爬虫源
    const source = await this.crawlerSourceRepository.findOne({
      where: { id: sourceId }
    });

    if (!source) {
      throw new NotFoundException('爬虫源不存在');
    }

    // 计算时间围
    const now = new Date();
    let timeLimit: Date;
    switch (timeRange) {
      case TimeRange.DAY:
        timeLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case TimeRange.WEEK:
        timeLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case TimeRange.MONTH:
        timeLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case TimeRange.ALL:
        timeLimit = new Date(0);
        break;
    }

    // 获取资源列表
    const adapter = this.resourceAdapterFactory.createAdapter(source.baseUrl);
    const listData = await adapter.getDetailList(page);

    const result: CollectResult = {
      videos: [],
      isCompleted: false,
      lastVideoTime: null,
    };

    // 处理每个视频
    for (const item of listData.list) {
      const videoTime = new Date(parseInt(item.vod_time) * 1000);
      result.lastVideoTime = item.vod_time;

      // 检查是否超出时间范围
      if (videoTime < timeLimit) {
        result.isCompleted = true;
        break;
      }

      try {
        const existingVideo = await this.videoService.findByExternalId(
          item.vod_id.toString()
        );

        const videoResult: CollectResult['videos'][0] = {
          name: item.vod_name,
          status: 'skipped',
          changes: {},
        };

        if (existingVideo) {
          const needsUpdate = this.checkNeedsUpdate(existingVideo, item);
          if (needsUpdate) {
            const changes = await this.updateVideo(existingVideo, item, {});
            videoResult.status = 'updated' as const;
            videoResult.changes = changes;
          }
        } else {
          await this.createVideo(item);
          videoResult.status = 'new' as const;
        }

        result.videos.push(videoResult);
      } catch (error) {
        result.videos.push({
          name: item.vod_name,
          status: 'skipped',
          reason: error.message,
        });
      }
    }

    return result;
  }

  async getSourceVodList(query: SourceListQueryDto): Promise<CrawlerThirdResourceDto> {
    const { sourceId, page, typeId, keyword } = query;

    const source = await this.crawlerSourceRepository.findOne({
      where: { id: sourceId }
    });

    if (!source) {
      throw new NotFoundException('爬虫源不存在');
    }

    const adapter = this.resourceAdapterFactory.createAdapter(source.baseUrl);

    try {
      const data = await adapter.getList(page, { typeId, keyword });
      return data;
    } catch (error) {
      this.logger.error('Failed to get source list', error.stack, 'CrawlerService');
      throw new BadRequestException('获取资源列表失败');
    }
  }

  async collectVodsSelected(dto: CollectSelectedDto): Promise<TaskResultDto> {
    const { sourceId, videoIds } = dto;

    const source = await this.crawlerSourceRepository.findOne({
      where: { id: sourceId }
    });

    if (!source) {
      throw new NotFoundException('爬虫源不存在');
    }

    const adapter = this.resourceAdapterFactory.createAdapter(source.baseUrl);

    try {
      const videoList = await adapter.getDetail(videoIds);
      const result: TaskResultDto = {
        successCount: 0,
        failCount: 0,
        failures: [],
      };

      // 处理每个视频
      for (const item of videoList) {
        try {
          const existingVideo = await this.findExistingVideo(item);

          if (existingVideo) {
            const needsUpdate = this.checkNeedsUpdate(existingVideo, item);
            if (needsUpdate) {
              await this.updateVideo(existingVideo, item, {});
              result.successCount++;
            }
          } else {
            await this.createVideo(item);
            result.successCount++;
          }
        } catch (error) {
          result.failCount++;
          result.failures.push({
            data: item,
            error: error.message,
          });
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to collect selected videos', error.stack, 'CrawlerService');
      throw new BadRequestException('采集选中视频失败');
    }
  }

  private async findExistingVideo(videoDetail: any): Promise<Video | null> {
    // 1. 先通过 externalId 精确查找
    let existingVideo = await this.videoService.findByExternalId(
      videoDetail.vod_id.toString()
    );

    if (existingVideo) {
      return existingVideo;
    }

    // 2. 通过标题相似度查找
    existingVideo = await this.videoService.findSimilarVideo(videoDetail.vod_name);
    
    if (existingVideo) {
      // 记录匹配日志
      this.logger.log(
        `Found similar video: ${videoDetail.vod_name} -> ${existingVideo.title}`,
        'CrawlerService'
      );
    }

    return existingVideo;
  }
} 