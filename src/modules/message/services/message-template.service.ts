import { Injectable } from '@nestjs/common';
import { MessageType } from '../entities/message.entity';

@Injectable()
export class MessageTemplateService {
  private templates = new Map<string, string>();

  constructor() {
    this.initTemplates();
  }

  private initTemplates() {
    // 举报相关模板
    this.templates.set('report.created', `
      <h2>新举报待处理</h2>
      <p>收到一个新的{{type}}举报，请及时处理。</p>
      <p><strong>举报类型：</strong>{{type}}</p>
      <p><strong>举报原因：</strong>{{reason}}</p>
      <p><strong>举报时间：</strong>{{time}}</p>
      <a href="{{link}}" style="padding: 10px 20px; background: #1890ff; color: #fff; text-decoration: none; border-radius: 4px;">
        查看详情
      </a>
    `);

    this.templates.set('report.processed', `
      <h2>举报处理结果通知</h2>
      <p>您的举报已处理完成。</p>
      <p><strong>处理结果：</strong>{{status}}</p>
      <p><strong>处理说明：</strong>{{note}}</p>
      <p><strong>处理时间：</strong>{{time}}</p>
    `);

    // 评论相关模板
    this.templates.set('comment.reply', `
      <h2>收到新回复</h2>
      <p>您的评论收到了新回复：</p>
      <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
        {{content}}
      </div>
      <a href="{{link}}">查看详情</a>
    `);
  }

  getTemplate(key: string): string {
    return this.templates.get(key) || '';
  }

  compile(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  }

  getMessageContent(key: string, data: Record<string, any>): string {
    const template = this.getTemplate(key);
    return this.compile(template, data);
  }
} 