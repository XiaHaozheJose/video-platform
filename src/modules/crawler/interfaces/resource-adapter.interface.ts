import { CrawlerThirdResourceDto, CrawlerThirdResourceDataDto, CrawlerThirdResourceClassDto } from '../dto/crawler-third-resource.dto';

export interface ResourceAdapter {
  getList(page: number): Promise<CrawlerThirdResourceDto>;
  getDetail(id: string): Promise<CrawlerThirdResourceDataDto>;
  getCategories(): Promise<CrawlerThirdResourceClassDto[]>;
  setBaseUrl(url: string): void;
} 