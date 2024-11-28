import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { AuthException } from '@common/exceptions/business.exception';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role !== UserRole.ADMIN) {
      throw AuthException.noPermission();
    }

    return true;
  }
} 