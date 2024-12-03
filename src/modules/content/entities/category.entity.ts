import { Entity, Column, Tree, TreeParent, TreeChildren, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Video } from './video.entity';
import { Tag } from './tag.entity';

@Entity('categories')
@Tree("closure-table")
export class Category extends BaseEntity {
  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'boolean', default: true })
  isLeaf: boolean;

  @Column({ type: 'boolean', default: false })
  isRoot: boolean;

  @TreeParent()
  parent: Category;

  @TreeChildren()
  children: Category[];

  @ManyToMany(() => Video, video => video.categories)
  @JoinTable({
    name: 'video_categories',
    joinColumn: { name: 'category_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'video_id', referencedColumnName: 'id' },
  })
  videos: Video[];

  
  @ManyToMany(() => Tag, tag => tag.videos)
  @JoinTable({
    name: 'category_tags',
    joinColumn: { name: 'category_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tagEntities: Tag[];
} 