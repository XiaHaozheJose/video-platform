import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '@modules/user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initAdminUser();
  }

  private async initAdminUser() {
    try {
      // 检查是否已存在管理员账号
      const adminExists = await this.userRepository.findOne({
        where: { role: UserRole.ADMIN }
      });

      if (!adminExists) {
        // 创建管理员账号
        const hashedPassword = await bcrypt.hash('123456', 10);
        const admin = this.userRepository.create({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@example.com',
          role: UserRole.ADMIN,
          isActive: true
        });

        await this.userRepository.save(admin);
        this.logger.log('管理员账号初始化成功', 'InitService');
      }
    } catch (error) {
      this.logger.error('管理员账号初始化失败', error.stack, 'InitService');
    }
  }
} 