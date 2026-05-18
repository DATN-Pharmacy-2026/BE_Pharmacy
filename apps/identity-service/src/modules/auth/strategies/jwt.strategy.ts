import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessStatus, UserStatus } from '.prisma/client/identity';
import { AuthenticatedUser, JwtPayload } from '@app/auth';
import { IdentityPrismaService } from '../../../prisma/identity-prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: IdentityPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtAccessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
        branchAccesses: true,
        warehouseAccesses: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive or deleted');
    }

    const roles = [...new Set(user.userRoles.map((entry) => entry.role.code))];
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((entry) =>
          entry.role.rolePermissions.map(
            (rolePermission) => rolePermission.permission.code,
          ),
        ),
      ),
    ];
    const activeBranchAccesses = user.branchAccesses.filter(
      (entry) => entry.status === AccessStatus.ACTIVE,
    );
    const activeWarehouseAccesses = user.warehouseAccesses.filter(
      (entry) => entry.status === AccessStatus.ACTIVE,
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isSystemAdmin: user.isSystemAdmin,
      roles,
      permissions,
      branchIds: activeBranchAccesses.map((entry) => entry.branchId),
      warehouseIds: activeWarehouseAccesses.map((entry) => entry.warehouseId),
      branchAccess: activeBranchAccesses.map((entry) => ({
        id: entry.branchId,
        roleId: entry.roleId,
        status: entry.status,
      })),
      warehouseAccess: activeWarehouseAccesses.map((entry) => ({
        id: entry.warehouseId,
        roleId: entry.roleId,
        status: entry.status,
      })),
    };
  }
}
