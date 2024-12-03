import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from '@modules/user/entities/user.entity';

@Entity('search_histories')
export class SearchHistory extends BaseEntity {
  @Column()
  keyword: string;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'int', default: 1 })
  count: number;

  @Column({ type: 'timestamp' })
  lastSearchTime: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    resultCount?: number;     // 搜索结果数量
    clickedVideos?: string[]; // 点击过的视频ID
    filters?: any;            // 使用的过滤条件
    source?: string;          // 搜索来源
  };
} 