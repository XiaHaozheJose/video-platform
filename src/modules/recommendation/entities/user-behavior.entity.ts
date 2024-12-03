import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Video } from "../../content/entities/video.entity";

@Entity('user_behaviors')
export class UserBehavior extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Video)
  video: Video;

  @Column({
    type: 'enum',
    enum: ['view', 'like', 'collect', 'comment', 'share']
  })
  type: string;

  @Column({ type: 'int', nullable: true })
  duration: number;  // 观看时长(秒)

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    deviceInfo?: string;
    location?: string;
    timeOfDay?: string;
    completionRate?: number; // 完成率
    replayCount?: number;    // 重播次数
  };

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 