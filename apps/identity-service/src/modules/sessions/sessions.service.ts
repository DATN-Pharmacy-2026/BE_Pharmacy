import { Injectable, NotFoundException } from '@nestjs/common';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: IdentityPrismaService) {}

  async listUserSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { loggedInAt: 'desc' },
    });
  }

  async revokeSession(id: string) {
    const session = await this.prisma.userSession.findUnique({ where: { id } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.userSession.update({
      where: { id },
      data: { loggedOutAt: new Date() },
    });
  }
}
