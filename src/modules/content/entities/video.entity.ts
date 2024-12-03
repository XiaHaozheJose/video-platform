import { Entity, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Category } from './category.entity';
import { Episode } from './episode.entity';
import { Person } from './person.entity';
import { Comment } from '@modules/user/entities/comment.entity';
import { Collection } from '@modules/user/entities/collection.entity';
import { WatchHistory } from '@modules/user/entities/watch-history.entity';
import { Tag } from './tag.entity';

export enum VideoStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

export enum VideoPlayFormat {
  M3U8 = 'm3u8',
  MP4 = 'mp4',
  FLV = 'flv',
}

@Entity('videos')
export class Video extends BaseEntity {
  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  cover: string;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ nullable: true })
  area: string;

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ nullable: true })
  externalId: string;

  @Column({ nullable: true })
  source: string;

  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.DRAFT
  })
  status: VideoStatus;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ nullable: true })
  updateStatus: string;

  @ManyToMany(() => Category, { cascade: true })
  @JoinTable({
    name: 'video_categories',
    joinColumn: { name: 'video_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @ManyToMany(() => Person, person => person.actedVideos)
  @JoinTable({
    name: 'video_actors',
    joinColumn: { name: 'video_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'actor_id', referencedColumnName: 'id' },
  })
  actors: Person[];

  @ManyToMany(() => Person, person => person.directedVideos)
  @JoinTable({
    name: 'video_directors',
    joinColumn: { name: 'video_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'director_id', referencedColumnName: 'id' },
  })
  directors: Person[];

  @OneToMany(() => Episode, episode => episode.video, {
    cascade: true,
  })
  episodes: Episode[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'video_tags',
    joinColumn: { name: 'video_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tagEntities: Tag[];

  @Column({ type: 'timestamp', nullable: true })
  releaseDate: Date;

  @OneToMany(() => Comment, comment => comment.video)
  comments: Comment[];

  @OneToMany(() => Collection, collection => collection.video)
  collections: Collection[];

  @OneToMany(() => WatchHistory, history => history.video)
  watchHistories: WatchHistory[];

  @Column({
    type: 'enum',
    enum: VideoPlayFormat,
    default: VideoPlayFormat.M3U8
  })
  playFormat: VideoPlayFormat;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    resolution?: string;    // 分辨率
    bitrate?: number;       // 码率
    codec?: string;         // 编码格式
    frameRate?: number;     // 帧率
    audioCodec?: string;    // 音频编码
  };
} 