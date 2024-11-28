import { Injectable } from '@nestjs/common';
import { NanguaAdapter } from '../adapters/nangua.adapter';
import { ResourceAdapter } from '../interfaces/resource-adapter.interface';

@Injectable()
export class ResourceAdapterFactory {
  constructor(private nanguaAdapter: NanguaAdapter) {}

  createAdapter(baseUrl: string): ResourceAdapter {
    this.nanguaAdapter.setBaseUrl(baseUrl);
    return this.nanguaAdapter;
  }
} 