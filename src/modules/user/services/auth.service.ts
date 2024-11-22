import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { UpdatePasswordDto, ResetPasswordDto, ConfirmResetPasswordDto, UpdateProfileDto } from '../dto/user.dto';
import { MailService } from './mail.service';
import { RedisService } from '@shared/services/redis.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { username, password, email } = registerDto;

    // 检查用户名和邮箱是否已存在
    const existUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existUser) {
      throw new BadRequestException('用户名或邮箱已存在');
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      email,
    });

    return await this.userRepository.save(user);
  }

  async login(loginDto: LoginDto) {
    const { account, password } = loginDto;

    // 查找用户
    const user = await this.userRepository.findOne({
      where: [{ username: account }, { email: account }],
      select: ['id', 'username', 'password'], // 需要选择password字段用于验证
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成Token
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(id: string): Promise<User> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (updateProfileDto.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateProfileDto.username }
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('用户名已存在');
      }
    }

    if (updateProfileDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email }
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('邮箱已存在');
      }
    }

    Object.assign(user, updateProfileDto);
    return await this.userRepository.save(user);
  }

  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    const isPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('当前密码错误');
    }

    user.password = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    await this.userRepository.save(user);
  }

  async requestPasswordReset(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: resetPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const token = this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      { expiresIn: '1h' },
    );

    // 存储token到Redis，设置1小时过期
    await this.redisService.set(
      `password_reset:${token}`,
      user.id,
      60 * 60,
    );

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        user.username,
        token
      );
    } catch (error) {
      // 删除Redis中的token
      await this.redisService.del(`password_reset:${token}`);
      throw error;
    }
  }

  async confirmPasswordReset(confirmResetPasswordDto: ConfirmResetPasswordDto): Promise<void> {
    const { token, newPassword } = confirmResetPasswordDto;

    const userId = await this.redisService.get(`password_reset:${token}`);
    if (!userId) {
      throw new BadRequestException('重置链接已过期或无效');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    // 删除Redis中的token
    await this.redisService.del(`password_reset:${token}`);
  }
} 