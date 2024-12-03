import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from '@modules/user/entities/user.entity';

export enum ReportType {
  DANMAKU = 'danmaku',   // 弹幕举报
  COMMENT = 'comment',   // 评论举报
  USER = 'user',        // 用户举报
  VIDEO = 'video',      // 视频举报
}

export enum ReportStatus {
  PENDING = 'pending',    // 待处理
  APPROVED = 'approved',  // 已通过
  REJECTED = 'rejected',  // 已驳回
  IGNORED = 'ignored',    // 已忽略
}

export enum ReportReason {
  SPAM = 'spam',              // 垃圾内容
  INAPPROPRIATE = 'inappropriate', // 不当内容
  SENSITIVE = 'sensitive',     // 敏感内容
  VIOLENCE = 'violence',       // 暴力内容
  PORN = 'porn',              // 色情内容
  ILLEGAL = 'illegal',        // 违法内容
  OTHER = 'other',            // 其他原因
}

@Entity('reports')
export class Report extends BaseEntity {
  @ManyToOne(() => User)
  reporter: User;  // 举报人

  @Column({
    type: 'enum',
    enum: ReportType
  })
  type: ReportType;  // 举报类型

  @Column({
    type: 'enum',
    enum: ReportReason
  })
  reason: ReportReason;  // 举报原因

  @Column({ type: 'text', nullable: true })
  description: string;  // 详细描述

  @Column()
  targetId: string;  // 被举报对象ID

  @Column({ type: 'jsonb', nullable: true })
  evidence: {        // 证据
    screenshots?: string[];  // 截图
    videos?: string[];      // 视频
    links?: string[];       // 相关链接
  };

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING
  })
  status: ReportStatus;  // 处理状态

  @Column({ type: 'jsonb', nullable: true })
  result: {          // 处理结果
    processor?: string;     // 处理人
    action?: string;       // 采取的行动
    note?: string;         // 处理说明
    processedAt?: Date;    // 处理时间
  };

  @Column({ type: 'int', default: 1 })
  reportCount: number;  // 举报次数
} 