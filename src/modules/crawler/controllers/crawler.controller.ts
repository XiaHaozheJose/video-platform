import { Controller, Post, Body, Get, Param, Put, Delete, Query, UseGuards, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { CrawlerService } from '../services/crawler.service';
import { CreateTaskDto, UpdateTaskDto } from '../dto/crawler-task.dto';
import { Observable } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CollectByTimeDto } from '../dto/crawler-task.dto';
import { AdminGuard } from '@modules/user/guards/admin.guard';
import { SourceListQueryDto, CollectSelectedDto } from '../dto/crawler-source-list.dto';

@ApiTags('采集管理')
@Controller('crawler')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Post('tasks')
  @ApiOperation({ summary: '创建采集任务' })
  createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.crawlerService.createTask(createTaskDto);
  }

  @Get('tasks')
  @ApiOperation({ summary: '获取任务列表' })
  findAllTasks(@Query() query: any) {
    return this.crawlerService.findAll(query);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '获取任务详情' })
  findOneTask(@Param('id') id: string) {
    return this.crawlerService.findOneTask(id);
  }

  @Put('tasks/:id')
  @ApiOperation({ summary: '更新任务' })
  updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.crawlerService.updateTask(id, updateTaskDto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: '删除任务' })
  removeTask(@Param('id') id: string) {
    return this.crawlerService.removeTask(id);
  }

  @Post('tasks/:id/execute')
  @ApiOperation({ summary: '手动执行任务' })
  executeTask(@Param('id') id: string) {
    return this.crawlerService.executeTask(id);
  }

  @Get('source-categories')
  @ApiOperation({ summary: '获取资源站分类' })
  async getSourceCategories(@Query('url') url: string) {
    return this.crawlerService.getSourceCategories(url);
  }

  @Get('tasks/:id/logs')
  @ApiOperation({ summary: '获取任务日志' })
  getTaskLogs(
    @Param('id') id: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.crawlerService.getTaskLogs(
      id,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
    );
  }

  @Post('tasks/:id/pause')
  @ApiOperation({ summary: '暂停任务' })
  pauseTask(@Param('id') id: string) {
    return this.crawlerService.pauseTask(id);
  }

  @Post('tasks/:id/resume')
  @ApiOperation({ summary: '恢复任务' })
  resumeTask(@Param('id') id: string) {
    return this.crawlerService.resumeTask(id);
  }

  @Sse('tasks/:id/progress')
  taskProgress(@Param('id') id: string): Observable<any> {
    return new Observable(subscriber => {
      const listener = (progress: any) => {
        subscriber.next({ data: progress });
      };

      // 订阅任务进度事件
      this.eventEmitter.on(`task.progress.${id}`, listener);

      // 订阅任务完成事件
      this.eventEmitter.once(`task.complete.${id}`, () => {
        subscriber.complete();
      });

      // 清理函数
      return () => {
        this.eventEmitter.removeListener(`task.progress.${id}`, listener);
      };
    });
  }

  @Post('collect-by-time')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '按时间范围采集资源' })
  async collectByTime(@Body() collectDto: CollectByTimeDto) {
    return await this.crawlerService.collectByTime(collectDto);
  }

  @Get('source/list')
  @ApiOperation({ summary: '获取资源站视频列表' })
  async getSourceVodList(@Query() query: SourceListQueryDto) {
    return await this.crawlerService.getSourceVodList(query);
  }

  @Post('source/collect')
  @ApiOperation({ summary: '采集选中的视频' })
  async collectSelected(@Body() dto: CollectSelectedDto) {
    return await this.crawlerService.collectVodsSelected(dto);
  }
} 