import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from './user.entity';
import { Video } from '@modules/content/entities/video.entity';

@Entity('watch_histories')
@Unique(['user', 'video'])
export class WatchHistory extends BaseEntity {
  @ManyToOne(() => User, user => user.watchHistories)
  user: User;

  @ManyToOne(() => Video, video => video.watchHistories)
  video: Video;

  @Column({ type: 'int', default: 0 })
  watchDuration: number;  // 观看时长（秒）

  @Column({ type: 'int', default: 0 })
  watchProgress: number;  // 观看进度（秒）

  @Column({ type: 'timestamp' })
  lastWatchTime: Date;

  @Column({ type: 'int', default: 1 })
  watchCount: number;  // 观看次数
} 