import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Video } from './video.entity';

@Entity('episodes')
export class Episode extends BaseEntity {
  @Column({ length: 100 })
  title: string;

  @Column()
  episode: number;

  @Column({ type: 'text' })
  playUrl: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ nullable: true })
  thumbnail: string;

  @ManyToOne(() => Video, video => video.episodes, {
    onDelete: 'CASCADE'
  })
  video: Video;
} 