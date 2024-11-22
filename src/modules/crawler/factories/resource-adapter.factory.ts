import { Injectable } from '@nestjs/common';
import { NanguaAdapter } from '../adapters/nangua.adapter';
import { ResourceAdapter } from '../interfaces/resource-adapter.interface';

@Injectable()
export class ResourceAdapterFactory {
  constructor(private nanguaAdapter: NanguaAdapter) {}

  createAdapter(type: string, baseUrl: string): ResourceAdapter {
    switch (type) {
      case 'nangua':
        this.nanguaAdapter.setBaseUrl(baseUrl);
        return this.nanguaAdapter;
      // 可以添加其他资源站的适配器
      default:
        throw new Error(`Unsupported resource type: ${type}`);
    }
  }
} 