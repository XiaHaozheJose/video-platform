import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto, MoveCategoryDto } from '../dto/category.dto';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: TreeRepository<Category>,
    private logger: LoggerService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { parentId, ...categoryData } = createCategoryDto;
    const category = this.categoryRepository.create({
      ...categoryData,
      isLeaf: true,
      isRoot: !parentId,
    });
    
    if (parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: parentId }
      });
      if (parent) {
        category.parent = parent;
        parent.isLeaf = false;
        await this.categoryRepository.save(parent);
      }
    }

    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    const trees = await this.categoryRepository.findTrees({
      relations: ['parent']
    });

    const processNode = (node: Category & { parentId?: string }) => {
      if (node.parent) {
        node.parentId = node.parent.id;
      }
      if (node.children) {
        node.children = node.children.map(child => processNode(child));
      }
      return node;
    };

    return trees.map(tree => processNode(tree));
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
    const category = await this.findOne(id);
    
    const children = await this.getChildren(id);
    if (children && children.length > 0) {
      throw new BadRequestException('该分类下还有子分类，请先删除子分类');
    }

    const categoryWithVideos = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.videos', 'video')
      .where('category.id = :id', { id })
      .getOne();

    if (categoryWithVideos?.videos?.length > 0) {
      throw new BadRequestException('该分类下还有视频，无法删除');
    }

    if (category.parent) {
      const siblings = await this.categoryRepository.find({
        where: { parent: { id: category.parent.id } }
      });
      
      if (siblings.length === 1) {
        category.parent.isLeaf = true;
        await this.categoryRepository.save(category.parent);
      }
    }

    try {
      await this.categoryRepository.remove(category);
    } catch (error) {
      this.logger.error('Failed to remove category', error.stack, 'CategoryService');
      throw new BadRequestException('删除分类失败，请确保没有关联的数据');
    }
  }

  async getChildren(id: string): Promise<Category[]> {
    const category = await this.categoryRepository.findDescendantsTree(
      await this.findOne(id)
    );
    return category.children;
  }
} 