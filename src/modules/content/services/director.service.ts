import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Director } from '../entities/director.entity';
import { CreateDirectorDto, UpdateDirectorDto } from '../dto/director.dto';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class DirectorService {
  constructor(
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
    private logger: LoggerService,
  ) {}

  async create(createDirectorDto: CreateDirectorDto): Promise<Director> {
    const director = this.directorRepository.create(createDirectorDto);
    return await this.directorRepository.save(director);
  }

  async findAll(limit: number = 100): Promise<Director[]> {
    return await this.directorRepository.find({
      take: limit,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Director> {
    const director = await this.directorRepository.findOne({
      where: { id },
    });

    if (!director) {
      throw new NotFoundException('导演不存在');
    }

    return director;
  }

  async update(id: string, updateDirectorDto: UpdateDirectorDto): Promise<Director> {
    const director = await this.findOne(id);
    Object.assign(director, updateDirectorDto);
    return await this.directorRepository.save(director);
  }

  async remove(id: string): Promise<void> {
    const director = await this.findOne(id);
    
    // 检查是否有关联的视频
    const hasVideos = await this.directorRepository
      .createQueryBuilder('director')
      .innerJoin('director.videos', 'video')
      .where('director.id = :id', { id })
      .getCount();

    if (hasVideos > 0) {
      throw new BadRequestException('该导演下还有关联的视频，无法删除');
    }

    try {
      await this.directorRepository.remove(director);
    } catch (error) {
      this.logger.error('Failed to remove director', error.stack, 'DirectorService');
      throw new BadRequestException('删除导演失败');
    }
  }
} 