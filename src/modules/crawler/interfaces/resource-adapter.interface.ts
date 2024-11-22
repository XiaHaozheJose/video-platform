export interface ResourceAdapter {
  getList(page: number): Promise<any[]>;
  getDetail(id: string): Promise<any>;
  transformData(rawData: any): any;
  getCategories(): Promise<Array<{ id: string; name: string }>>;
} 