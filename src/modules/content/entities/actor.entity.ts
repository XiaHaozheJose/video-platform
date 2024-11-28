import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('actors')
export class Actor extends BaseEntity {
  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true, length: 200 })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  description: string;
} 