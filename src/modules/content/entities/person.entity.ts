import { Entity, Column, ManyToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Video } from './video.entity';

export enum PersonRole {
  ACTOR = 'actor',
  DIRECTOR = 'director',
}

@Entity('persons')
export class Person extends BaseEntity {

  @Column({ nullable: true, length: 100 })
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PersonRole,
    default: PersonRole.ACTOR
  })
  role: PersonRole;

  @ManyToMany(() => Video, video => video.actors)
  actedVideos: Video[];

  @ManyToMany(() => Video, video => video.directors)
  directedVideos: Video[];

  @Column({ nullable: true })
  externalId: string;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'simple-array', nullable: true })
  aliases: string[];

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  birthDate: Date;

  @Column({ type: 'int', default: 0 })
  workCount: number;
} 