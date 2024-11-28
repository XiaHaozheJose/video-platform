import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron'
import { CrawlerTask, TaskStatus, TaskType } from '../entities/crawler-task.entity';
import { CrawlerLog, LogLevel } from '../entities/crawler-log.entity';
import { CreateTaskDto, UpdateTaskDto, TaskResultDto, CrawlProgressDto, VideoInfo } from '../dto/crawler-task.dto';
import { VideoService } from '@modules/content/services/video.service';
import { CreateVideoDto, VideoStatus } from '@modules/content/dto/video.dto';
import { LoggerService } from '@shared/services/logger.service';
import { Person, PersonRole } from '@modules/content/entities/person.entity';
import { Category } from '@modules/content/entities/category.entity';
import { Video } from '@modules/content/entities/video.entity';
import { CrawlerLogService } from './crawler-log.service';
import { ResourceAdapterFactory } from '../factories/resource-adapter.factory';
import { CrawlerSource } from '../entities/crawler-source.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrawlerThirdResourceDto, CrawlerThirdResourceDataDto, CrawlerThirdResourceClassDto } from '../dto/crawler-third-resource.dto';

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
          '任务完成，但存在失败项',
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
      const firstPageData = await adapter.getList(1);
      const totalPages = Math.ceil(Number(firstPageData.total) / Number(firstPageData.limit));

      while (hasMore) {
        const listData = currentPage === 1 ? firstPageData : await adapter.getList(currentPage);
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
              const existingVideo = await this.videoService.findByExternalId(
                item.vod_id.toString()
              );

              if (existingVideo) {
                // 检查是否需要更新
                const needsUpdate = this.checkNeedsUpdate(existingVideo, item);
                if (needsUpdate && task.type === TaskType.INCREMENT) {
                  await this.updateVideo(existingVideo, item, task.config);
                  videoInfo.status = 'updated';
                  result.successCount++;
                } else {
                  videoInfo.status = 'skipped';
                  videoInfo.reason = '无需更新';
                }
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
    } catch (error) {
      throw error;
    }

    return result;
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

  private async updateVideo(existingVideo: Video, videoDetail: CrawlerThirdResourceDataDto, config: any): Promise<void> {
    const { updateStrategy } = config.matchRules || {};
    const updateDto: any = {};

    // 根据更新策略选择要更新的字段
    if (updateStrategy?.cover) {
      updateDto.cover = videoDetail.vod_pic;
    }
    if (updateStrategy?.description) {
      updateDto.description = videoDetail.vod_content;
    }
    if (updateStrategy?.rating) {
      updateDto.rating = parseFloat(videoDetail.vod_score) || 0;
    }

    // 更新基本信息
    if (Object.keys(updateDto).length > 0) {
      await this.videoService.update(existingVideo.id, {
        ...updateDto,
        viewCount: existingVideo.viewCount, // 保留播放次数
      });
    }

    // 更新剧集信息
    if (updateStrategy?.episodes) {
      const episodes = this.transformEpisodes(videoDetail.vod_play_url, videoDetail.vod_play_from);
      if (episodes?.length) {
        const existingEpisodes = existingVideo.episodes || [];
        
        for (const episode of episodes) {
          const existingEpisode = existingEpisodes.find(
            e => e.episode === episode.episode
          );
          
          if (existingEpisode) {
            await this.videoService.updateEpisode(
              existingVideo.id,
              existingEpisode.id,
              episode
            );
          } else {
            await this.videoService.addEpisode(existingVideo.id, episode);
          }
        }
      }
    }
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
      
      episodeList.forEach((item, index) => {
        // 分割集标题和播放地址，用 $ 分割
        const [title = '', url = ''] = item.split('$');
        if (!url) return;

        // 从标题中提取集数
        const episodeMatch = title.match(/(\d+)/);
        const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : index + 1;

        episodes.push({
          title: title.trim() || `第${episodeNumber}集`,
          episode: episodeNumber,
          playUrl: url.trim(),
          source: playFrom || 'unknown',  // 使用 vod_play_from 作为播放源
        });
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

  async getSourceCategories(url: string): Promise<CrawlerThirdResourceClassDto[]> {
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
} 