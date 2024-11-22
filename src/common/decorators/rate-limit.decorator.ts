import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  points: number;      // 限制次数
  duration: number;    // 时间窗口（秒）
  blockDuration?: number;  // 封禁时间（秒）
  errorMessage?: string;   // 自定义错误信息
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options); 