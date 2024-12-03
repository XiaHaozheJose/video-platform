import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('hot_searches')
export class HotSearch extends BaseEntity {
  @Column({ unique: true })
  keyword: string;

  @Column({ type: 'int', default: 0 })
  searchCount: number;

  @Column({ type: 'int', default: 0 })
  resultCount: number;

  @Column({ type: 'float', default: 0 })
  weight: number;

  @Column({ type: 'timestamp' })
  lastUpdateTime: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  trends: {
    date: string;
    count: number;
  }[];
} 