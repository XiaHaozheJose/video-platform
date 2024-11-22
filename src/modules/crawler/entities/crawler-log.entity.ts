import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { CrawlerTask } from './crawler-task.entity';

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

@Entity('crawler_logs')
export class CrawlerLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawlerTask, task => task.logs)
  task: CrawlerTask;

  @Column({ type: 'enum', enum: LogLevel, default: LogLevel.INFO })
  level: LogLevel;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  processedCount: number;

  @Column({ type: 'int', nullable: true })
  successCount: number;

  @Column({ type: 'int', nullable: true })
  failCount: number;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;
} 