import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

export enum CrawlerSourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('crawler_sources')
export class CrawlerSource extends BaseEntity {
  @Column({ length: 50 })
  name: string;

  @Column({ length: 100 })
  baseUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  type: string;  // 例如: 'nangua', 'zuida' 等

  @Column({
    type: 'enum',
    enum: CrawlerSourceStatus,
    default: CrawlerSourceStatus.ACTIVE
  })
  status: CrawlerSourceStatus;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;  // 存储爬虫配置
} 