import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  OTHER = 'other',
  ERROR = 'error',
}

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  module: string;

  @Column({
    type: 'enum',
    enum: OperationType,
    default: OperationType.OTHER,
  })
  type: OperationType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  params: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  @Column({ nullable: true })
  userId: string;

  @Column({ length: 50, nullable: true })
  username: string;

  @Column({ length: 20 })
  ip: string;

  @Column({ type: 'int', nullable: true })
  timeConsuming: number;

  @CreateDateColumn()
  createdAt: Date;
} 