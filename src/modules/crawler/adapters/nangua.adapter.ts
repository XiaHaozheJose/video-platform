import { Injectable } from '@nestjs/common';
import { ResourceAdapter } from '../interfaces/resource-adapter.interface';
import { LoggerService } from '@shared/services/logger.service';
import { CrawlerThirdResourceDto, CrawlerThirdResourceDataDto, CrawlerThirdResourceClassDto } from '../dto/crawler-third-resource.dto';

@Injectable()
export class NanguaAdapter implements ResourceAdapter {
  private baseUrl: string;

  constructor(private logger: LoggerService) {}

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  async getList(page: number): Promise<CrawlerThirdResourceDto> {
    try {
      const response = await fetch(`${this.baseUrl}?ac=detail&pg=${page}`);
      const data = await response.json() as CrawlerThirdResourceDto;
      return data;
    } catch (error) {
      this.logger.error('Failed to get list from source', error.stack, 'NanguaAdapter');
      throw error;
    }
  }

  async getDetail(id: string): Promise<CrawlerThirdResourceDataDto> {
    try {
      const response = await fetch(`${this.baseUrl}?ac=detail&ids=${id}`);
      const data = await response.json() as CrawlerThirdResourceDto;
      return data.list[0];
    } catch (error) {
      this.logger.error('Failed to get detail from source', error.stack, 'NanguaAdapter');
      throw error;
    }
  }

  async getCategories(): Promise<CrawlerThirdResourceClassDto[]> {
    try {
      const response = await fetch(`${this.baseUrl}?ac=list`);
      const data = await response.json() as CrawlerThirdResourceDto;
      return data.class;
    } catch (error) {
      this.logger.error('Failed to get categories from source', error.stack, 'NanguaAdapter');
      throw error;
    }
  }
} 