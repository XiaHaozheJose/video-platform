import { Entity, Column, ManyToMany, Tree, TreeParent, TreeChildren } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { Video } from './video.entity';
import { Category } from './category.entity';

export enum TagType {
  GENRE = 'genre',     // 类型标签：根据分类自动生成
  REGION = 'region',   // 地区标签：根据地区自动生成  
  LANGUAGE = 'language', // 语言标签：根据语言自动生成
  ERA = 'era',         // 年代标签：根据年份自动生成
  FEATURE = 'feature', // 特征标签：根据评分、播放量等自动生成
  OTHER = 'other'      // 其他标签：手动添加或其他来源
}

@Entity('tags')
@Tree("closure-table")  // 使用闭包表实现树形结构
export class Tag extends BaseEntity {
  @Column({ length: 50, unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  useCount: number;

  @Column({ type: 'float', default: 1.0 })
  weight: number;  // 标签权重，用于排序和推荐

  @Column({
    type: 'enum',
    enum: TagType,
    default: TagType.OTHER
  })
  type: TagType;

  @Column({ type: 'jsonb', nullable: true })
  synonyms: string[];  // 同义词列表

  @Column({ type: 'jsonb', nullable: true })
  rules: {
    allowedCategories?: string[];  // 允许使用的分类ID列表
    minVideos?: number;            // 最少关联视频数
    maxVideos?: number;            // 最多关联视频数
    allowedChildTypes?: TagType[]; // 允许的子标签类型
  };

  @TreeParent()
  parent: Tag;

  @TreeChildren()
  children: Tag[];

  @ManyToMany(() => Video, video => video.tagEntities)
  videos: Video[];

  @ManyToMany(() => Category, category => category.tagEntities)
  categories: Category[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    icon?: string;           // 标签图标
    color?: string;          // 标签颜色
    shortDescription?: string; // 简短描述
    source?: string;         // 标签来源
    lastUsed?: Date;         // 最后使用时间
    priority?: number;       // 优先级
  };
} 