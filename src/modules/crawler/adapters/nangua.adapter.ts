import { Injectable } from '@nestjs/common';
import { ResourceAdapter } from '../interfaces/resource-adapter.interface';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class NanguaAdapter implements ResourceAdapter {
  constructor(private logger: LoggerService) {}

  async getList(page: number): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}?ac=list&pg=${page}`);
      const data = await response.json();
      return data.list || [];
    } catch (error) {
      this.logger.error('Failed to get list from Nangua', error.stack, 'NanguaAdapter');
      throw error;
    }
  }

  async getDetail(id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?ac=detail&ids=${id}`);
      const data = await response.json();
      return data.list[0];
    } catch (error) {
      this.logger.error('Failed to get detail from Nangua', error.stack, 'NanguaAdapter');
      throw error;
    }
  }

  transformData(rawData: any): any {
    return {
      title: rawData.vod_name,
      description: rawData.vod_content,
      cover: rawData.vod_pic,
      year: parseInt(rawData.vod_year),
      area: rawData.vod_area,
      language: rawData.vod_lang,
      actors: rawData.vod_actor?.split(','),
      directors: rawData.vod_director?.split(','),
      category: rawData.type_name,
      rating: parseFloat(rawData.vod_score),
      updateStatus: rawData.vod_remarks,
      playUrls: this.transformPlayUrls(rawData.vod_play_url),
    };
  }

  private transformPlayUrls(playUrl: string): any[] {
    if (!playUrl) return [];

    const episodes = [];
    const sources = playUrl.split('$$$');

    sources.forEach((source) => {
      const [sourceName, episodesStr] = source.split('$');
      if (!episodesStr) return;

      const episodeList = episodesStr.split('#');
      episodeList.forEach((item, index) => {
        const [title, url] = item.split('$');
        episodes.push({
          title,
          episode: index + 1,
          playUrl: url,
          source: sourceName,
        });
      });
    });

    return episodes;
  }

  private baseUrl: string;
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async getCategories(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}?ac=list`);
      const data = await response.json();
      
      // 从返回的数据中提取分类信息
      const categories = data.class || [];
      return categories.map(category => ({
        id: category.type_id.toString(),
        name: category.type_name,
      }));
    } catch (error) {
      this.logger.error('Failed to get categories from Nangua', error.stack, 'NanguaAdapter');
      throw error;
    }
  }
} 