import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Actor } from '../entities/actor.entity';
import { CreateActorDto, UpdateActorDto } from '../dto/actor.dto';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class ActorService {
  constructor(
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    private logger: LoggerService,
  ) {}

  async create(createActorDto: CreateActorDto): Promise<Actor> {
    const actor = this.actorRepository.create(createActorDto);
    return await this.actorRepository.save(actor);
  }

  async findAll(limit: number = 100): Promise<Actor[]> {
    return await this.actorRepository.find({
      take: limit,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Actor> {
    const actor = await this.actorRepository.findOne({
      where: { id },
    });

    if (!actor) {
      throw new NotFoundException('演员不存在');
    }

    return actor;
  }

  async update(id: string, updateActorDto: UpdateActorDto): Promise<Actor> {
    const actor = await this.findOne(id);
    Object.assign(actor, updateActorDto);
    return await this.actorRepository.save(actor);
  }

  async remove(id: string): Promise<void> {
    const actor = await this.findOne(id);
    
    // 检查是否有关联的视频
    const hasVideos = await this.actorRepository
      .createQueryBuilder('actor')
      .innerJoin('actor.videos', 'video')
      .where('actor.id = :id', { id })
      .getCount();

    if (hasVideos > 0) {
      throw new BadRequestException('该演员下还有关联的视频，无法删除');
    }

    try {
      await this.actorRepository.remove(actor);
    } catch (error) {
      this.logger.error('Failed to remove actor', error.stack, 'ActorService');
      throw new BadRequestException('删除演员失败');
    }
  }
} 