import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { createObjectCsvWriter } from 'csv-writer';
import * as path from 'path';
import { OperationLog } from '../entities/operation-log.entity';
import { QueryOperationLogDto } from '../dto/operation-log.dto';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class OperationLogService {
  constructor(
    @InjectRepository(OperationLog)
    private operationLogRepository: Repository<OperationLog>,
    private logger: LoggerService,
  ) {}

  async findAll(query: QueryOperationLogDto) {
    const { module, type, userId, startTime, endTime, page = 1, limit = 20 } = query;

    const queryBuilder = this.operationLogRepository.createQueryBuilder('log');

    if (module) {
      queryBuilder.andWhere('log.module = :module', { module });
    }

    if (type) {
      queryBuilder.andWhere('log.type = :type', { type });
    }

    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (startTime && endTime) {
      queryBuilder.andWhere('log.createdAt BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });
    }

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    return await this.operationLogRepository.findOne({ where: { id } });
  }

  async getStatistics(startTime: Date, endTime: Date) {
    // 获取操作类型统计
    const typeStats = await this.operationLogRepository
      .createQueryBuilder('log')
      .select('log.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .groupBy('log.type')
      .getRawMany();

    // 获取模块统计
    const moduleStats = await this.operationLogRepository
      .createQueryBuilder('log')
      .select('log.module', 'module')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .groupBy('log.module')
      .getRawMany();

    return {
      typeStats,
      moduleStats,
    };
  }

  async cleanLogs(before: Date) {
    try {
      await this.operationLogRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :before', { before })
        .execute();
      
      this.logger.log(`Cleaned operation logs before ${before}`, 'OperationLogService');
    } catch (error) {
      this.logger.error(
        `Failed to clean operation logs: ${error.message}`,
        error.stack,
        'OperationLogService',
      );
      throw error;
    }
  }

  async exportLogs(query: QueryOperationLogDto): Promise<string> {
    const { items } = await this.findAll(query);
    
    const exportDir = path.join(process.cwd(), 'exports');
    const filename = `operation-logs-${Date.now()}.csv`;
    const filepath = path.join(exportDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'module', title: '模块' },
        { id: 'type', title: '操作类型' },
        { id: 'description', title: '描述' },
        { id: 'username', title: '操作人' },
        { id: 'ip', title: 'IP地址' },
        { id: 'timeConsuming', title: '耗时(ms)' },
        { id: 'createdAt', title: '操作时间' },
      ],
    });

    await csvWriter.writeRecords(items.map(item => ({
      ...item,
      createdAt: item.createdAt.toLocaleString(),
    })));

    return filepath;
  }

  async setupCleanupTask() {
    // 设置定时清理任务，每天凌晨2点执行
    const cleanupTime = new Date();
    cleanupTime.setDate(cleanupTime.getDate() - 30); // 保留30天的日志
    
    try {
      await this.cleanLogs(cleanupTime);
      this.logger.log('Successfully cleaned up old operation logs', 'OperationLogService');
    } catch (error) {
      this.logger.error('Failed to clean up operation logs', error.stack, 'OperationLogService');
    }
  }
} 