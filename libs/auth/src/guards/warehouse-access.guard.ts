import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WAREHOUSE_ACCESS_KEY } from '../decorators/warehouse-access.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class WarehouseAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      WAREHOUSE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: Record<string, string>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    if (user.isSystemAdmin) {
      return true;
    }

    const warehouseId =
      request.params?.warehouseId ??
      request.body?.warehouseId ??
      request.query?.warehouseId;
    if (!warehouseId || !user.warehouseIds.includes(warehouseId)) {
      throw new ForbiddenException('No warehouse access');
    }

    return true;
  }
}
