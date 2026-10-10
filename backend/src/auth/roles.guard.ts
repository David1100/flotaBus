import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? [];

    if (!roles.length) return true;

    const userRole = ctx.switchToHttp().getRequest().user?.rol;
    if (!roles.includes(userRole)) throw new ForbiddenException('Insufficient role');

    return true;
  }
}
