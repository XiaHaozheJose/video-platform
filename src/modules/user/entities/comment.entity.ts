import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from './user.entity';
import { Video } from '@modules/content/entities/video.entity';

@Entity('comments')
export class Comment extends BaseEntity {
  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User, user => user.comments)
  user: User;

  @ManyToOne(() => Video, video => video.comments)
  video: Video;

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;  // 用于回复功能
} 