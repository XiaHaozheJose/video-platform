import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Category } from './category.entity';
import { Episode } from './episode.entity';
import { Actor } from './actor.entity';
import { Director } from './director.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  externalId: string;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 200, nullable: true })
  cover: string;

  @Column({ type: 'int', default: 0 })
  year: number;

  @Column({ length: 50, nullable: true })
  area: string;

  @Column({ length: 50, nullable: true })
  language: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ length: 50, nullable: true })
  updateStatus: string;

  @Column({ length: 50, nullable: true })
  source: string;

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'video_categories',
    joinColumn: { name: 'video_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @ManyToMany(() => Actor)
  @JoinTable({
    name: 'video_actors',
    joinColumn: { name: 'video_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'actor_id', referencedColumnName: 'id' },
  })
  actors: Actor[];

  @ManyToMany(() => Director)
  @JoinTable({
    name: 'video_directors',
    joinColumn: { name: 'video_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'director_id', referencedColumnName: 'id' },
  })
  directors: Director[];

  @OneToMany(() => Episode, episode => episode.video)
  episodes: Episode[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 