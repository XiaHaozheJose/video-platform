import { Injectable } from '@nestjs/common';
import { ResourceAdapter } from '../interfaces/resource-adapter.interface';
import { LoggerService } from '@shared/services/logger.service';
import { CrawlerThirdResourceDto, CrawlerThirdResourceDataDto, CrawlerThirdResourceCategpryDto } from '../dto/crawler-third-resource.dto';

@Injectable()
export class NanguaAdapter implements ResourceAdapter {
  private baseUrl: string;

  constructor(private logger: LoggerService) {}

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * 获取资源列表
   * @param page 页码
   * @param params 查询参数
   * @returns 资源列表
   */
  async getList(page: number, params?: { typeId?: string; keyword?: string }): Promise<CrawlerThirdResourceDto> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('ac', 'list');
      searchParams.append('pg', page.toString());
      
      if (params?.keyword) {
        searchParams.append('wd', params.keyword);
      }
      if (params?.typeId) {
        searchParams.append('t', params.typeId);
      }

      const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`);
      const data = await response.json() as CrawlerThirdResourceDto;
      return data;
    } catch (error) {
      this.logger.error('Failed to get list from source', error.stack, 'NanguaAdapter');
      throw error;
    }
  }

  /**
   * 获取资源详情列表
   * @param page 页码
   * @param params 查询参数
   * @returns 资源详情列表
   */
  async getDetailList(page: number, params?: { typeId?: string; keyword?: string }): Promise<CrawlerThirdResourceDto> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('ac', 'detail');
      searchParams.append('pg', page.toString());

      if (params?.keyword) {
        searchParams.append('wd', params.keyword);
      }
      if (params?.typeId) {
        searchParams.append('t', params.typeId);
      }

      const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`);
      const data = await response.json() as CrawlerThirdResourceDto;
      return data;
    } catch (error) {
      this.logger.error('Failed to get detail list from source', error.stack, 'NanguaAdapter');
      throw error;
    }
  }

  /**
   * 获取资源详情
   * @param ids 资源ID列表
   * @returns 资源详情列表
   */
  async getDetail(ids: string | string[]): Promise<CrawlerThirdResourceDataDto[]> {
    try {
      const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
      const response = await fetch(`${this.baseUrl}?ac=detail&ids=${idsStr}`);
      const data = await response.json() as CrawlerThirdResourceDto;
      return data.list;
    } catch (error) {
      this.logger.error('Failed to get detail from source', error.stack, 'NanguaAdapter');
      throw error;
    }
  }

  /**
   * 获取资源分类
   * @returns 资源分类列表
   */
  async getCategories(): Promise<CrawlerThirdResourceCategpryDto[]> {
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