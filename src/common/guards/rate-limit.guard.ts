import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../shared/services/redis.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { BusinessException } from '../exceptions/business.exception';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);

    const result = await this.checkRateLimit(key, rateLimitOptions);
    if (!result.allowed) {
      throw new BusinessException(
        rateLimitOptions.errorMessage || '请求过于频繁，请稍后再试',
        429,
      );
    }

    return true;
  }

  private generateKey(request: any): string {
    // 可以基于IP或用户ID生成key
    const ip = request.ip;
    const userId = request.user?.id || 'anonymous';
    const path = request.route.path;
    return `rate_limit:${path}:${userId}:${ip}`;
  }

  private async checkRateLimit(key: string, options: RateLimitOptions) {
    const now = Date.now();
    const windowStart = now - options.duration * 1000;

    // 使用Redis的Sorted Set实现滑动窗口
    await this.redisService.client.zRemRangeByScore(key, 0, windowStart);
    const count = await this.redisService.client.zCard(key);

    if (count >= options.points) {
      return { allowed: false, remaining: 0 };
    }

    await this.redisService.client.zAdd(key, { score: now, value: now.toString() });
    await this.redisService.client.expire(key, options.duration);

    return {
      allowed: true,
      remaining: options.points - count - 1,
    };
  }
} 