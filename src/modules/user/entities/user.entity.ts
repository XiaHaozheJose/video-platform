import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Comment } from './comment.entity';
import { Collection } from './collection.entity';
import { WatchHistory } from './watch-history.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 100, unique: true })
  username: string;

  @Column({ length: 100, unique: true, nullable: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  avatar: string;

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  @OneToMany(() => Collection, collection => collection.user)
  collections: Collection[];

  @OneToMany(() => WatchHistory, history => history.user)
  watchHistories: WatchHistory[];

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    categories?: string[];
    actors?: string[];
    directors?: string[];
    areas?: string[];
  };
} 