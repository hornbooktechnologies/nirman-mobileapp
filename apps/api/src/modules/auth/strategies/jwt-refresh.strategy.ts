import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

function cookieExtractor(request: Request): string | null {
  const token = request.cookies?.refresh_token as string | undefined;
  return token ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
    });
  }

  validate(request: Request) {
    const rawToken = cookieExtractor(request);
    if (!rawToken) throw new UnauthorizedException();
    return { rawToken };
  }
}
