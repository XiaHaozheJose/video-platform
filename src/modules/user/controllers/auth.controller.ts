import { Controller, Post, Body, UseGuards, Get, Put, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { UpdatePasswordDto, ResetPasswordDto, ConfirmResetPasswordDto, UpdateProfileDto } from '../dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { OperationLog } from '@common/decorators/operation-log.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @RateLimit({
    points: 5,           // 5次机会
    duration: 300,       // 5分钟窗口
    errorMessage: '登录尝试次数过多，请5分钟后再试',
  })
  @OperationLog({
    module: '用户',
    type: 'LOGIN',
    description: '用户登录',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取个人信息' })
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新个人信息' })
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, updateProfileDto);
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  updatePassword(
    @CurrentUser() user: User,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(user.id, updatePasswordDto);
  }

  @Post('password/reset')
  @ApiOperation({ summary: '请求密码重置' })
  @RateLimit({
    points: 3,           // 3次机会
    duration: 3600,      // 1小时窗口
    errorMessage: '密码重置请求过于频繁，请1小时后再试',
  })
  @OperationLog({
    module: '用户',
    type: 'OTHER',
    description: '请求密码重置',
  })
  requestPasswordReset(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.requestPasswordReset(resetPasswordDto);
  }

  @Post('password/reset/confirm')
  @ApiOperation({ summary: '确认密码重置' })
  confirmPasswordReset(@Body() confirmResetPasswordDto: ConfirmResetPasswordDto) {
    return this.authService.confirmPasswordReset(confirmResetPasswordDto);
  }

  @Post('dev-token')
  @ApiOperation({ summary: '获取开发测试token（仅开发环境可用）' })
  async getDevToken() {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('该接口仅在开发环境可用');
    }
    return {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcwOTI4MTYwMCwiZXhwIjoxNzQwODE3NjAwfQ.2vTUgbP983RvF2Ld-TJbZ_2Qh_HrD4C1yQqE_0zgego'
    };
  }
} 