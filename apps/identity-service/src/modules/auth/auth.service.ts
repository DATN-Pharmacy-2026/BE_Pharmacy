import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AccessStatus, RefreshToken, UserStatus } from '.prisma/client/identity';
import { AuthenticatedUser, JwtPayload } from '@app/auth';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const phone = dto.phone?.trim() ?? '';
    const usernameSeed = dto.username?.trim() || email.split('@')[0];
    const username = await this.generateUniqueUsername(usernameSeed);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true, email: true, username: true },
    });
    if (existing) {
      throw new BadRequestException(
        existing.email === email ? 'Email already exists' : 'Username already exists',
      );
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { code: ROLE_CODES.CUSTOMER },
      select: { id: true },
    });
    if (!customerRole) {
      throw new BadRequestException('Customer role is not configured');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username,
          email,
          phone,
          fullName,
          passwordHash,
          status: UserStatus.ACTIVE,
          isSystemAdmin: false,
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: customerRole.id,
        },
      });

      return createdUser;
    });

    this.logger.log('Register success', { userId: user.id, email: user.email });
    return {
      message: 'Register successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been created',
        resetLink: null,
      };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + this.getPasswordResetTtlMs());

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    this.logger.log('Password reset token created', { userId: user.id, email: user.email });

    return {
      message: 'Password reset link created',
      resetLink: this.buildPasswordResetLink(token),
      user: {
        email: user.email,
        fullName: user.fullName,
      },
      expiresAt,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(dto.token);
    const tokenRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, status: true, deletedAt: true },
        },
      },
    });

    if (!tokenRecord || tokenRecord.user.deletedAt || tokenRecord.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    this.logger.log('Password reset success', { userId: tokenRecord.userId });
    return { message: 'Password reset successfully' };
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

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getPasswordResetTtlMs(): number {
    const minutes = Number.parseInt(
      this.configService.get<string>('auth.passwordResetExpiresMinutes', '30'),
      10,
    );
    return (Number.isFinite(minutes) && minutes > 0 ? minutes : 30) * 60 * 1000;
  }

  private buildPasswordResetLink(token: string): string {
    const frontendUrl = this.configService.get<string>('gateway.frontendUrl', 'http://localhost:5173');
    const baseUrl = frontendUrl.replace(/\/+$/, '');
    return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
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

  private async generateUniqueUsername(seed: string): Promise<string> {
    const cleaned = seed
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 50);
    const base = cleaned.length >= 3 ? cleaned : `user${Date.now().toString().slice(-6)}`;

    const exact = await this.prisma.user.findFirst({
      where: { username: base },
      select: { id: true },
    });
    if (!exact) {
      return base;
    }

    for (let i = 1; i <= 9999; i++) {
      const candidate = `${base}${i}`;
      const found = await this.prisma.user.findFirst({
        where: { username: candidate },
        select: { id: true },
      });
      if (!found) {
        return candidate;
      }
    }

    throw new BadRequestException('Cannot generate unique username');
  }

  private buildExpiryDate(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }
}
