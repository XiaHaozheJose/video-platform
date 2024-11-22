import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, code: number = HttpStatus.BAD_REQUEST) {
    super(
      {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
      code,
    );
  }
}

export class UserException extends BusinessException {
  static userNotFound() {
    return new BusinessException('用户不存在', 1001);
  }

  static userExists() {
    return new BusinessException('用户已存在', 1002);
  }

  static passwordError() {
    return new BusinessException('密码错误', 1003);
  }

  static emailExists() {
    return new BusinessException('邮箱已存在', 1004);
  }
}

export class AuthException extends BusinessException {
  static tokenExpired() {
    return new BusinessException('令牌已过期', 1101);
  }

  static invalidToken() {
    return new BusinessException('无效的令牌', 1102);
  }

  static noPermission() {
    return new BusinessException('没有权限', 1103);
  }
} 