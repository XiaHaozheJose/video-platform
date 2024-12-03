import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Danmaku } from "../entities/danmaku.entity";
import { RedisService } from "../../../shared/services/redis.service";
import { Between } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class DanmakuService {
  constructor(
    @InjectRepository(Danmaku)
    private danmakuRepository: Repository<Danmaku>,
    private redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 1. 发送弹幕
  async send(danmaku: Danmaku): Promise<Danmaku> {
    // 1.1 内容过滤
    if (await this.filter(danmaku.content)) {
      danmaku.isFiltered = true;
    }

    // 2. 保存到数据库
    const savedDanmaku = await this.danmakuRepository.save(danmaku);

    // 3. 推送到Redis实时队列
    await this.pushToRedis(savedDanmaku);

    // 4. 发送事件通知
    this.eventEmitter.emit('danmaku.created', savedDanmaku);

    return savedDanmaku;
  }

  // 2. 获取弹幕
  async getByTimeRange(videoId: string, start: number, end: number): Promise<Danmaku[]> {
    return await this.danmakuRepository.find({
      where: {
        video: { id: videoId },
        timestamp: Between(start, end),
        isFiltered: false
      },
      order: { timestamp: 'ASC' }
    });
  }

  // 3. 弹幕过滤
  private async filter(content: string): Promise<boolean> {
    // 3.1 敏感词过滤
    if (await this.containsSensitiveWords(content)) {
      return true;
    }

    // 3.2 垃圾���容过滤
    if (this.isSpam(content)) {
      return true;
    }

    return false;
  }

  // 添加缺失的方法
  private async pushToRedis(danmaku: Danmaku): Promise<void> {
    const key = `danmaku:${danmaku.video.id}`;
    const value = JSON.stringify({
      id: danmaku.id,
      content: danmaku.content,
      timestamp: danmaku.timestamp,
      type: danmaku.type,
      color: danmaku.color,
      fontSize: danmaku.fontSize,
      userId: danmaku.user.id
    });

    // 使用 Redis Sorted Set 存储弹幕，以时间戳为分数
    await this.redisService.zadd(key, danmaku.timestamp, value);

    // 设置过期时间（例如24小时）
    await this.redisService.expire(key, 24 * 60 * 60);
  }

  private async containsSensitiveWords(content: string): Promise<boolean> {
    // 从配置或数据库获取敏感词列表
    const sensitiveWords = ['敏感词1', '敏感词2', '敏感词3'];
    return sensitiveWords.some(word => content.includes(word));
  }

  private isSpam(content: string): boolean {
    // 1. 检查重复字符
    if (this.hasRepeatedChars(content)) {
      return true;
    }

    // 2. 检查长度
    if (content.length > 100) {
      return true;
    }

    // 3. 检查广告关键词
    const adKeywords = ['广告', '推广', 'http://', 'https://'];
    if (adKeywords.some(keyword => content.includes(keyword))) {
      return true;
    }

    return false;
  }

  private hasRepeatedChars(content: string): boolean {
    const repeatedPattern = /(.)\1{4,}/; // 同一字符重复5次以上
    return repeatedPattern.test(content);
  }

  // 添加批量获取弹幕的方法
  async batchGetDanmaku(videoId: string, segments: { start: number; end: number }[]): Promise<Danmaku[]> {
    const promises = segments.map(segment => 
      this.getByTimeRange(videoId, segment.start, segment.end)
    );
    
    const results = await Promise.all(promises);
    return results.flat();
  }

  // 添加弹幕统计方法
  async getDanmakuStats(videoId: string): Promise<{
    total: number;
    peakTime: number;
    distribution: Record<number, number>;
  }> {
    const danmakus = await this.danmakuRepository.find({
      where: { video: { id: videoId } }
    });

    // 统计每秒弹幕数量
    const distribution = danmakus.reduce((acc, danmaku) => {
      const second = Math.floor(danmaku.timestamp);
      acc[second] = (acc[second] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // 找出弹幕密度最高的时间点
    const peakTime = Object.entries(distribution)
      .reduce((max, [time, count]) => 
        count > (distribution[max] || 0) ? Number(time) : max
      , 0);

    return {
      total: danmakus.length,
      peakTime,
      distribution
    };
  }

  // 添加删除方法
  async remove(id: string): Promise<void> {
    const danmaku = await this.danmakuRepository.findOne({
      where: { id }
    });

    if (!danmaku) {
      throw new NotFoundException('弹幕不存在');
    }

    // 从数据库删除
    await this.danmakuRepository.remove(danmaku);

    // 从Redis缓存中删除
    const key = `danmaku:${danmaku.video.id}`;
    await this.redisService.zremrangebyscore(key, danmaku.timestamp, danmaku.timestamp);
  }
} 