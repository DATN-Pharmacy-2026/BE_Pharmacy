import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BRANCH_ACCESS_KEY } from '../decorators/branch-access.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class BranchAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      BRANCH_ACCESS_KEY,
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

    const branchId =
      request.params?.branchId ??
      request.body?.branchId ??
      request.query?.branchId;
    if (!branchId || !user.branchIds.includes(branchId)) {
      throw new ForbiddenException('No branch access');
    }

    return true;
  }
}
