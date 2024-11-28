import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { CrawlerLog } from './crawler-log.entity';
import { CrawlerSource } from './crawler-source.entity';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TaskType {
  FULL = 'full',      // 全量采集
  INCREMENT = 'increment',  // 增量采集
  SINGLE = 'single',   // 单个采集
}

@Entity('crawler_tasks')
export class CrawlerTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => CrawlerSource)
  source: CrawlerSource;

  @Column({ nullable: true })
  sourceId: string;

  @Column({ type: 'enum', enum: TaskType, default: TaskType.INCREMENT })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  totalCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'timestamp', nullable: true })
  lastRunTime: Date;

  @Column({ type: 'text', nullable: true })
  cron: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CrawlerLog, log => log.task)
  logs: CrawlerLog[];
} 