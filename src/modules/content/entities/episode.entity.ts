import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('episodes')
export class Episode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  episode: number;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text' })
  playUrl: string;

  @Column({ length: 100, nullable: true })
  source: string;

  @ManyToOne(() => Video, video => video.episodes)
  video: Video;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 