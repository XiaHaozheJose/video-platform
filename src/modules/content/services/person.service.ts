import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Person, PersonRole } from '../entities/person.entity';
import { CreatePersonDto, UpdatePersonDto, PersonListDto } from '../dto/person.dto';
import { LoggerService } from '@shared/services/logger.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PersonService {
  private appUrl: string;

  constructor(
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    private logger: LoggerService,
    private configService: ConfigService,
  ) {
    this.appUrl = this.configService.get('APP_URL');
  }

  private getFullUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${this.appUrl}${path}`;
  }

  private transformPerson(person: Person): Person {
    if (person.avatar) {
      person.avatar = this.getFullUrl(person.avatar);
    }
    return person;
  }

  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    const person = this.personRepository.create(createPersonDto);
    const savedPerson = await this.personRepository.save(person);
    return this.transformPerson(savedPerson);
  }

  async findAll(query: PersonListDto) {
    const { page = 1, limit = 10, role, keyword } = query;
    const queryBuilder = this.personRepository.createQueryBuilder('person')
      .leftJoinAndSelect('person.actedVideos', 'actedVideos')
      .leftJoinAndSelect('person.directedVideos', 'directedVideos');

    if (role) {
      queryBuilder.andWhere('person.role = :role', { role });
    }

    if (keyword) {
      queryBuilder.andWhere('(person.name LIKE :keyword OR person.description LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('person.name', 'ASC')
      .getManyAndCount();

    return {
      items: items.map(item => this.transformPerson(item)),
      total,
      page,
      limit,
    };
  }

  async findActors(limit: number = 100): Promise<Person[]> {
    const actors = await this.personRepository.find({
      where: { role: PersonRole.ACTOR },
      take: limit,
      order: { name: 'ASC' },
    });
    return actors.map(actor => this.transformPerson(actor));
  }

  async findDirectors(limit: number = 100): Promise<Person[]> {
    const directors = await this.personRepository.find({
      where: { role: PersonRole.DIRECTOR },
      take: limit,
      order: { name: 'ASC' },
    });
    return directors.map(director => this.transformPerson(director));
  }

  async findOne(id: string): Promise<Person> {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: ['actingVideos', 'directingVideos'],
    });

    if (!person) {
      throw new NotFoundException('人员不存在');
    }

    return this.transformPerson(person);
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    const person = await this.findOne(id);
    
    if (updatePersonDto.name) person.name = updatePersonDto.name;
    if (updatePersonDto.avatar) person.avatar = updatePersonDto.avatar;
    if (updatePersonDto.description) person.description = updatePersonDto.description;
    if (updatePersonDto.role) person.role = updatePersonDto.role;

    const savedPerson = await this.personRepository.save(person);
    return this.transformPerson(savedPerson);
  }

  async remove(id: string): Promise<void> {
    const person = await this.findOne(id);
    
    if (person.actedVideos?.length > 0 || person.directedVideos?.length > 0) {
      throw new BadRequestException('该演员/导演还有关联的视频，无法删除');
    }

    await this.personRepository.remove(person);
  }
} 