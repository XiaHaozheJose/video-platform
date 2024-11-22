import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto, MoveCategoryDto } from '../dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: TreeRepository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId }
      });
      if (parent) {
        category.parent = parent;
      }
    }

    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.findTrees();
  }

  async findOne(id: string): Promise<Category> {
    return await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children']
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    
    if (updateCategoryDto.parentId && updateCategoryDto.parentId !== category.parent?.id) {
      const parent = await this.categoryRepository.findOne({
        where: { id: updateCategoryDto.parentId }
      });
      if (parent) {
        category.parent = parent;
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async move(id: string, moveCategoryDto: MoveCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    const parent = await this.categoryRepository.findOne({
      where: { id: moveCategoryDto.parentId }
    });

    if (parent) {
      category.parent = parent;
      return await this.categoryRepository.save(category);
    }

    return category;
  }

  async remove(id: string): Promise<void> {
    await this.categoryRepository.delete(id);
  }

  async getChildren(id: string): Promise<Category[]> {
    const category = await this.categoryRepository.findDescendantsTree(
      await this.findOne(id)
    );
    return category.children;
  }
} 