import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from '@app/auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtAccessSecret'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      isSystemAdmin: Boolean(payload.isSystemAdmin),
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      branchIds: payload.branchIds ?? [],
      warehouseIds: payload.warehouseIds ?? [],
      branchAccess: [],
      warehouseAccess: [],
    };
  }
}
