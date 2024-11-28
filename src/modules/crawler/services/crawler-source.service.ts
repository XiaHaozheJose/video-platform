import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerSource } from '../entities/crawler-source.entity';
import { CreateCrawlerSourceDto, UpdateCrawlerSourceDto, CrawlerSourceListDto } from '../dto/crawler-source.dto';

@Injectable()
export class CrawlerSourceService {
  constructor(
    @InjectRepository(CrawlerSource)
    private crawlerSourceRepository: Repository<CrawlerSource>,
  ) {}

  async findAll(query: CrawlerSourceListDto) {
    const { page = 1, limit = 10, status } = query;
    const queryBuilder = this.crawlerSourceRepository.createQueryBuilder('source');

    if (status) {
      queryBuilder.where('source.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .orderBy('source.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<CrawlerSource> {
    const source = await this.crawlerSourceRepository.findOne({
      where: { id }
    });

    if (!source) {
      throw new NotFoundException('爬虫源不存在');
    }

    return source;
  }

  async create(createCrawlerSourceDto: CreateCrawlerSourceDto): Promise<CrawlerSource> {
    const source = this.crawlerSourceRepository.create(createCrawlerSourceDto);
    return await this.crawlerSourceRepository.save(source);
  }

  async update(id: string, updateCrawlerSourceDto: UpdateCrawlerSourceDto): Promise<CrawlerSource> {
    const source = await this.findOne(id);
    Object.assign(source, updateCrawlerSourceDto);
    return await this.crawlerSourceRepository.save(source);
  }

  async remove(id: string): Promise<void> {
    const source = await this.findOne(id);
    await this.crawlerSourceRepository.remove(source);
  }
} 