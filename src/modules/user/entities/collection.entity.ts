import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from './user.entity';
import { Video } from '@modules/content/entities/video.entity';

@Entity('collections')
@Unique(['user', 'video'])  // 防止重复收藏
export class Collection extends BaseEntity {
  @ManyToOne(() => User, user => user.collections)
  user: User;

  @ManyToOne(() => Video, video => video.collections)
  video: Video;

  @Column({ type: 'text', nullable: true })
  note: string;  // 收藏备注

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];  // 个人标签
} 