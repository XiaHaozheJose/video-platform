import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron'
import { CrawlerTask, TaskStatus, TaskType } from '../entities/crawler-task.entity';
import { CrawlerLog, LogLevel } from '../entities/crawler-log.entity';
import { CreateTaskDto, UpdateTaskDto, TaskResultDto } from '../dto/crawler-task.dto';
import { VideoService } from '@modules/content/services/video.service';
import { CreateVideoDto, VideoStatus } from '@modules/content/dto/video.dto';
import { LoggerService } from '@shared/services/logger.service';
import { Actor } from '@modules/content/entities/actor.entity';
import { Director } from '@modules/content/entities/director.entity';
import { Category } from '@modules/content/entities/category.entity';
import { Video } from '@modules/content/entities/video.entity';
import { CrawlerLogService } from './crawler-log.service';
import { ResourceAdapterFactory } from '../factories/resource-adapter.factory';

@Injectable()
export class CrawlerService {
  private currentTask: CrawlerTask;

  constructor(
    @InjectRepository(CrawlerTask)
    private crawlerTaskRepository: Repository<CrawlerTask>,
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private videoService: VideoService,
    private schedulerRegistry: SchedulerRegistry,
    private logger: LoggerService,
    private crawlerLogService: CrawlerLogService,
    private resourceAdapterFactory: ResourceAdapterFactory,
  ) {}

  async createTask(createTaskDto: CreateTaskDto): Promise<CrawlerTask> {
    const task = this.crawlerTaskRepository.create(createTaskDto);
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
      // 创建资源适配器
      const adapter = this.resourceAdapterFactory.createAdapter(
        task.config.type || 'nangua',
        task.config.url
      );

      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        // 获取列表数据
        const list = await adapter.getList(currentPage);

        if (!list || list.length === 0) {
          hasMore = false;
          break;
        }

        // 处理每个视频
        for (const item of list) {
          try {
            // 检查是否应该处理该视频
            if (!this.shouldProcessVideo(item, task.config)) {
              continue;
            }

            // 获取详情数据
            const videoDetail = await adapter.getDetail(item.vod_id);

            // 检查是否已存在
            const existingVideo = await this.videoService.findByExternalId(videoDetail.vod_id.toString());
            
            if (existingVideo && task.type === TaskType.INCREMENT) {
              // 增量更新
              await this.updateVideo(existingVideo, videoDetail, task.config);
            } else if (!existingVideo) {
              // 新增视频
              await this.createVideo(videoDetail);
            }

            result.successCount++;
          } catch (error) {
            result.failCount++;
            result.failures.push({
              data: item,
              error: error.message,
            });
          }

          // 采集间隔
          if (task.config.interval) {
            await new Promise(resolve => setTimeout(resolve, task.config.interval));
          }
        }

        // 更新进度
        await this.crawlerLogService.updateProgress(
          log,
          currentPage * list.length,
          result.successCount,
          result.failCount
        );

        // 增量采集只处理第一页
        if (task.type === TaskType.INCREMENT) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }
    } catch (error) {
      throw error;
    }

    return result;
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

  private async updateVideo(existingVideo: Video, videoDetail: any, config: any): Promise<void> {
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
      const episodes = this.transformEpisodes(videoDetail.vod_play_url);
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

  private async handleCategories(rawData: any, task: CrawlerTask): Promise<string[]> {
    const typeId = rawData.type_id;
    const typeName = rawData.type_name;
    
    // 从配置中获取分类映射
    const categoryMapping = task.config.categoryMapping || [];
    const mappedCategory = categoryMapping.find(mapping => mapping.sourceId === typeId);
    const categoryName = mappedCategory?.targetName || typeName;
    
    // 查找或创建分类
    let category = await this.categoryRepository.findOne({ 
      where: { name: categoryName } 
    });
    
    if (!category) {
      category = await this.categoryRepository.save(
        this.categoryRepository.create({
          name: categoryName,
        })
      );
    }
    
    return [category.id];
  }

  private async transformData(rawData: any): Promise<CreateVideoDto> {
    // 处理演员和导演数据
    const actorNames = rawData.vod_actor?.split(',').filter(Boolean) || [];
    const directorNames = rawData.vod_director?.split(',').filter(Boolean) || [];

    // 查找或创建演员
    const actorIds = await Promise.all(
      actorNames.map(async (name) => {
        let actor = await this.actorRepository.findOne({ where: { name: name.trim() } });
        if (!actor) {
          actor = await this.actorRepository.save(
            this.actorRepository.create({
              name: name.trim(),
            })
          );
        }
        return actor.id;
      })
    );

    // 查找或创建导演
    const directorIds = await Promise.all(
      directorNames.map(async (name) => {
        let director = await this.directorRepository.findOne({ where: { name: name.trim() } });
        if (!director) {
          director = await this.directorRepository.save(
            this.directorRepository.create({
              name: name.trim(),
            })
          );
        }
        return director.id;
      })
    );

    // 处理分类信息
    const categoryIds = await this.handleCategories(rawData, this.currentTask);

    // 处理剧集信息
    const episodes = this.transformEpisodes(rawData.vod_play_url);

    return {
      title: rawData.vod_name,
      description: rawData.vod_content,
      cover: rawData.vod_pic,
      year: parseInt(rawData.vod_year) || new Date().getFullYear(),
      area: rawData.vod_area,
      language: rawData.vod_lang,
      externalId: rawData.vod_id.toString(),
      source: 'crawler',
      categoryIds,
      actorIds,
      directorIds,
      status: VideoStatus.PUBLISHED,
      rating: parseFloat(rawData.vod_score) || 0,
      updateStatus: rawData.vod_remarks || '',
      episodes,
    };
  }

  private transformEpisodes(playUrl: string): any[] {
    if (!playUrl) return [];

    try {
      const episodes = [];
      const sources = playUrl.split('$$$'); // 处理多个播放源
      
      sources.forEach((source, sourceIndex) => {
        const [sourceName, episodesStr] = source.split('$');
        if (!episodesStr) return;

        const episodeList = episodesStr.split('#');
        episodeList.forEach((item, index) => {
          const [title, url] = item.split('$');
          episodes.push({
            title,
            episode: index + 1,
            playUrl: url,
            source: sourceName,
          });
        });
      });

      return episodes;
    } catch (error) {
      this.logger.error(`Failed to transform episodes: ${error.message}`, error.stack, 'CrawlerService');
      return [];
    }
  }

  async findAllTasks() {
    return await this.crawlerTaskRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
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

    await this.crawlerTaskRepository.remove(task);
  }

  async getSourceCategories(url: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const adapter = this.resourceAdapterFactory.createAdapter('nangua', url);
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