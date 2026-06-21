import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  PLATFORM_ADMIN_LEVELS_KEY,
  PlatformAdminLevelValue
} from '../decorators/require-platform-admin-levels.decorator';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator access is required');
    }

    const requiredLevels = this.reflector.getAllAndOverride<PlatformAdminLevelValue[]>(
      PLATFORM_ADMIN_LEVELS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredLevels || requiredLevels.length === 0) {
      return true;
    }

    if (!user.platformAdminLevel || !requiredLevels.includes(user.platformAdminLevel as PlatformAdminLevelValue)) {
      throw new ForbiddenException('Insufficient platform administrator level');
    }

    return true;
  }
}
