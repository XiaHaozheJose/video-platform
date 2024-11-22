import { Entity, PrimaryGeneratedColumn, Column, Tree, TreeParent, TreeChildren } from 'typeorm';

@Entity('categories')
@Tree("closure-table")
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true })
  description: string;

  @TreeParent()
  parent: Category;

  @TreeChildren()
  children: Category[];
} 