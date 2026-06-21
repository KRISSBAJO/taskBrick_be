import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  REQUIRED_PERMISSIONS_KEY
} from '../decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authenticated user context is missing');
    }

    const userPermissions = new Set(user.permissions);

    if (userPermissions.has('manage:all')) {
      return true;
    }

    const hasRequiredPermission = requiredPermissions.every((permission) => {
      if (userPermissions.has(permission)) {
        return true;
      }

      const [_action, subject] = permission.split(':');
      return Boolean(subject && userPermissions.has(`manage:${subject}`));
    });

    if (!hasRequiredPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
