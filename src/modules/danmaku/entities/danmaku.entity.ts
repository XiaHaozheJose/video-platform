import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Video } from "../../content/entities/video.entity";

export enum DanmakuType {
  SCROLL = 'scroll',  // 滚动弹幕
  TOP = 'top',       // 顶部固定弹幕
  BOTTOM = 'bottom'  // 底部固定弹幕
}

@Entity('danmakus')
export class Danmaku extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Video)
  video: Video;

  @Column()
  content: string;

  @Column('float')
  timestamp: number;  // 视频时间点

  @Column({
    type: 'enum',
    enum: DanmakuType,
    default: DanmakuType.SCROLL
  })
  type: DanmakuType;

  @Column({ default: '#FFFFFF' })
  color: string;

  @Column({ default: 25 })
  fontSize: number;

  @Column({ type: 'boolean', default: false })
  isFiltered: boolean;  // 是否被过滤

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ip?: string;           // 发送者IP
    platform?: string;     // 发送平台
    reportCount?: number;  // 举报次数
    isVip?: boolean;      // 是否VIP用户
  };
} 