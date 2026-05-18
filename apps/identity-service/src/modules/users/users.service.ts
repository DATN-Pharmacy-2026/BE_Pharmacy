import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma, UserStatus } from '.prisma/client/identity';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map(this.toSafeUser),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(user);
  }

  async create(dto: CreateUserDto) {
    await this.ensureUnique(dto.username, dto.email);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        phone: dto.phone ?? '',
        passwordHash: await this.normalizePasswordHash(dto.passwordHash),
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        status: dto.status ?? UserStatus.ACTIVE,
        isSystemAdmin: dto.isSystemAdmin ?? false,
      },
    });

    return this.toSafeUser(user);
  }

  private async normalizePasswordHash(input: string): Promise<string> {
    if (
      input.startsWith('$2a$') ||
      input.startsWith('$2b$') ||
      input.startsWith('$2y$')
    ) {
      return input;
    }

    const rounds = this.configService.get<number>('auth.bcryptSaltRounds', 10);
    return bcrypt.hash(input, rounds);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      await this.ensureUnique(undefined, dto.email, id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    return this.toSafeUser(user);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'User soft deleted' };
  }

  private async ensureUnique(
    username?: string,
    email?: string,
    excludeUserId?: string,
  ) {
    if (username) {
      const user = await this.prisma.user.findFirst({
        where: {
          username,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
      });
      if (user) {
        throw new BadRequestException('Username already exists');
      }
    }

    if (email) {
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
      });
      if (user) {
        throw new BadRequestException('Email already exists');
      }
    }
  }

  private toSafeUser(user: Prisma.UserGetPayload<Record<string, never>>) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
