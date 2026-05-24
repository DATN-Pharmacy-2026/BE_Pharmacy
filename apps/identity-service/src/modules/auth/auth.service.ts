import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccessStatus, RefreshToken, UserStatus } from '.prisma/client/identity';
import { AuthenticatedUser, JwtPayload } from '@app/auth';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PERMISSION_CODES, ROLE_CODES } from './rbac.constants';

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

type ScopeMode = 'ALL' | 'ASSIGNED' | 'NONE';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ username: dto.username }, { email: dto.username }],
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        branchAccesses: true,
        warehouseAccesses: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      this.logger.warn('Login failed: user missing/inactive', {
        username: dto.username,
        ipAddress: meta.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      this.logger.warn('Login failed: password mismatch', {
        userId: user.id,
        username: user.username,
        ipAddress: meta.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser = this.buildAuthenticatedUser(user);
    const tokenResult = await this.issueTokens(authUser);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        branchId: authUser.branchIds[0],
        loggedInAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    this.logger.log('Login success', {
      userId: user.id,
      username: user.username,
      ipAddress: meta.ipAddress,
    });

    return {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresIn: tokenResult.accessExpiresInSeconds,
      user: {
        id: authUser.id,
        username: authUser.username,
        email: authUser.email,
        fullName: user.fullName,
        roles: authUser.roles,
        permissions: authUser.permissions,
        branchAccess: user.branchAccesses,
        warehouseAccess: user.warehouseAccesses,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const tokenRecord = await this.findActiveRefreshToken(
      payload.sub,
      payload.refreshTokenId,
    );

    const matched = await bcrypt.compare(
      dto.refreshToken,
      tokenRecord.tokenHash,
    );
    if (!matched) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        branchAccesses: true,
        warehouseAccesses: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const authUser = this.buildAuthenticatedUser(user);
    const tokenResult = await this.issueTokens(authUser);
    this.logger.log('Refresh token used', { userId: user.id });

    return {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresIn: tokenResult.accessExpiresInSeconds,
    };
  }

  async logout(user: AuthenticatedUser) {
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.userSession.updateMany({
      where: { userId: user.id, loggedOutAt: null },
      data: { loggedOutAt: new Date() },
    });
    this.logger.log('Logout success', { userId: user.id });

    return { message: 'Logged out successfully' };
  }

  async me(user: AuthenticatedUser) {
    const fullUser = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
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

    if (!fullUser || fullUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive');
    }

    const authUser = this.buildAuthenticatedUser(fullUser);
    const activeBranchAccesses = fullUser.branchAccesses.filter(
      (entry) => entry.status === AccessStatus.ACTIVE,
    );
    const activeWarehouseAccesses = fullUser.warehouseAccesses.filter(
      (entry) => entry.status === AccessStatus.ACTIVE,
    );
    const branchScopeMode = this.resolveBranchScopeMode(authUser.roles, activeBranchAccesses.length);
    const warehouseScopeMode = this.resolveWarehouseScopeMode(authUser.roles, activeWarehouseAccesses.length);
    const defaultBranchId = this.resolveDefaultBranchId(activeBranchAccesses, branchScopeMode);
    const defaultWarehouseId = this.resolveDefaultWarehouseId(
      activeWarehouseAccesses,
      warehouseScopeMode,
    );
    const canAccessAdmin = this.hasPermission(authUser, PERMISSION_CODES.ADMIN_ACCESS);
    const canAccessPos = this.hasPermission(authUser, PERMISSION_CODES.POS_ACCESS);

    return {
      id: fullUser.id,
      name: fullUser.fullName,
      username: fullUser.username,
      email: fullUser.email,
      status: fullUser.status,
      fullName: fullUser.fullName,
      avatarUrl: fullUser.avatarUrl,
      isSystemAdmin: fullUser.isSystemAdmin,
      roles: fullUser.userRoles.map((entry) => ({
        code: entry.role.code,
        name: entry.role.name,
      })),
      permissions: authUser.permissions,
      scope: {
        branchScopeMode,
        warehouseScopeMode,
        branches: activeBranchAccesses.map((entry) => ({
          id: entry.branchId,
          code: null,
          name: null,
          isDefault: entry.isDefaultBranch,
        })),
        warehouses: activeWarehouseAccesses.map((entry) => ({
          id: entry.warehouseId,
          code: null,
          name: null,
          branchId: null,
          isDefault: entry.warehouseId === defaultWarehouseId,
        })),
        defaultBranchId,
        defaultWarehouseId,
      },
      access: {
        canAccessAdmin,
        canAccessPos,
      },
    };
  }

  async hashPassword(rawPassword: string): Promise<string> {
    const rounds = this.configService.get<number>('auth.bcryptSaltRounds', 10);
    return bcrypt.hash(rawPassword, rounds);
  }

  private buildAuthenticatedUser(user: {
    id: string;
    username: string;
    email: string;
    isSystemAdmin: boolean;
    userRoles: Array<{
      role: {
        code: string;
        rolePermissions: Array<{ permission: { code: string } }>;
      };
    }>;
    branchAccesses: Array<{
      branchId: string;
      roleId: string | null;
      status: string;
    }>;
    warehouseAccesses: Array<{
      warehouseId: string;
      roleId: string | null;
      status: string;
    }>;
  }): AuthenticatedUser {
    const roles = [...new Set(user.userRoles.map((entry) => entry.role.code))];
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((entry) =>
          entry.role.rolePermissions.map(
            (permissionEntry) => permissionEntry.permission.code,
          ),
        ),
      ),
    ];

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isSystemAdmin: user.isSystemAdmin,
      roles,
      permissions,
      branchIds: user.branchAccesses
        .filter((entry) => entry.status === AccessStatus.ACTIVE)
        .map((entry) => entry.branchId),
      warehouseIds: user.warehouseAccesses
        .filter((entry) => entry.status === AccessStatus.ACTIVE)
        .map((entry) => entry.warehouseId),
      branchAccess: user.branchAccesses
        .filter((entry) => entry.status === AccessStatus.ACTIVE)
        .map((entry) => ({
        id: entry.branchId,
        roleId: entry.roleId,
        status: entry.status,
      })),
      warehouseAccess: user.warehouseAccesses
        .filter((entry) => entry.status === AccessStatus.ACTIVE)
        .map((entry) => ({
        id: entry.warehouseId,
        roleId: entry.roleId,
        status: entry.status,
      })),
    };
  }

  private hasPermission(user: AuthenticatedUser, permissionCode: string): boolean {
    return (
      user.isSystemAdmin ||
      user.roles.includes(ROLE_CODES.SUPER_ADMIN) ||
      user.permissions.includes('*') ||
      user.permissions.includes(permissionCode)
    );
  }

  private resolveBranchScopeMode(roles: string[], branchCount: number): ScopeMode {
    if (
      roles.includes(ROLE_CODES.SUPER_ADMIN) ||
      roles.includes(ROLE_CODES.COMPANY_ADMIN)
    ) {
      return 'ALL';
    }

    if (roles.includes(ROLE_CODES.CUSTOMER)) {
      return 'NONE';
    }

    if (branchCount > 0) {
      return 'ASSIGNED';
    }

    return 'NONE';
  }

  private resolveWarehouseScopeMode(roles: string[], warehouseCount: number): ScopeMode {
    if (
      roles.includes(ROLE_CODES.SUPER_ADMIN) ||
      roles.includes(ROLE_CODES.COMPANY_ADMIN)
    ) {
      return 'ALL';
    }

    if (roles.includes(ROLE_CODES.CUSTOMER)) {
      return 'NONE';
    }

    if (warehouseCount > 0) {
      return 'ASSIGNED';
    }

    return 'NONE';
  }

  private resolveDefaultBranchId(
    accesses: Array<{ branchId: string; isDefaultBranch: boolean }>,
    mode: ScopeMode,
  ): string | null {
    if (mode === 'ALL' || accesses.length === 0) {
      return null;
    }

    if (accesses.length === 1) {
      return accesses[0].branchId;
    }

    const defaultEntries = accesses.filter((entry) => entry.isDefaultBranch);
    if (defaultEntries.length === 1) {
      return defaultEntries[0].branchId;
    }

    return null;
  }

  private resolveDefaultWarehouseId(
    accesses: Array<{ warehouseId: string }>,
    mode: ScopeMode,
  ): string | null {
    if (mode === 'ALL' || accesses.length === 0) {
      return null;
    }

    if (accesses.length === 1) {
      return accesses[0].warehouseId;
    }

    return null;
  }

  private async issueTokens(user: AuthenticatedUser) {
    const accessPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      isSystemAdmin: user.isSystemAdmin,
      roles: user.roles,
      permissions: user.permissions,
      branchIds: user.branchIds,
      warehouseIds: user.warehouseIds,
      tokenType: 'access',
    };

    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'auth.jwtRefreshExpiresIn',
    );
    const accessExpiresIn = this.durationToSeconds(
      this.configService.getOrThrow<string>('auth.jwtAccessExpiresIn'),
    );
    const refreshExpiresInSeconds = this.durationToSeconds(refreshExpiresIn);
    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: 'pending',
        expiresAt: this.buildExpiryDate(refreshExpiresInSeconds),
      },
    });

    const refreshPayload: JwtPayload = {
      ...accessPayload,
      tokenType: 'refresh',
      refreshTokenId: refreshTokenRecord.id,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('auth.jwtAccessSecret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('auth.jwtRefreshSecret'),
        expiresIn: refreshExpiresInSeconds,
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      this.configService.get<number>('auth.bcryptSaltRounds', 10),
    );

    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { tokenHash: hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresInSeconds: accessExpiresIn,
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>(
            'auth.jwtRefreshSecret',
          ),
        },
      );

      if (payload.tokenType !== 'refresh' || !payload.refreshTokenId) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async findActiveRefreshToken(
    userId: string,
    refreshTokenId?: string,
  ): Promise<RefreshToken> {
    if (!refreshTokenId) {
      throw new BadRequestException('Missing refresh token id');
    }

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        id: refreshTokenId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    return tokenRecord;
  }

  private durationToSeconds(duration: string): number {
    const parsed = /^([0-9]+)([smhd])$/.exec(duration);
    if (!parsed) {
      return 900;
    }

    const value = Number(parsed[1]);
    const unit = parsed[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }

  private buildExpiryDate(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }
}
