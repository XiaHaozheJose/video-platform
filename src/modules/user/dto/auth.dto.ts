import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;

  @ApiProperty({ description: '邮箱' })
  @IsEmail()
  email: string;
}

export class LoginDto {
  @ApiProperty({ description: '用户名或邮箱' })
  @IsString()
  account: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username?: string;

  @ApiProperty({ description: '头像' })
  @IsString()
  avatar?: string;
} 