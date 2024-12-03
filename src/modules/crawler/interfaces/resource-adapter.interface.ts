import { CrawlerThirdResourceDto, CrawlerThirdResourceDataDto, CrawlerThirdResourceCategpryDto } from '../dto/crawler-third-resource.dto';

export interface ResourceAdapter {
  getList(page: number, params?: { typeId?: string; keyword?: string }): Promise<CrawlerThirdResourceDto>;
  getDetailList(page: number, params?: { typeId?: string; keyword?: string }): Promise<CrawlerThirdResourceDto>;
  getDetail(ids: string | string[]): Promise<CrawlerThirdResourceDataDto[]>;
  getCategories(): Promise<CrawlerThirdResourceCategpryDto[]>;
  setBaseUrl(url: string): void;
} 