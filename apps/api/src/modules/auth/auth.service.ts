import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { AuthTokens, AuthenticatedUser, JwtPayload } from './types/auth.types';
import { ProjectAccessService } from '../project-access/project-access.service';

const REFRESH_TOKEN_TTL_DAYS = 7;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens & { user: AuthenticatedUser }> {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user.id, user.email, user.roleId);

    const authenticatedUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        roleId: user.roleId,
        roleName: user.role.name,
        permissions: user.role.permissions.map((permission) => ({
          resource: permission.resource,
          action: permission.action,
        })),
      };

    const session = await this.projectAccess.getSessionForUser(authenticatedUser);

    return {
      ...tokens,
      ...session,
      user: authenticatedUser,
    };
  }

  async session(user: AuthenticatedUser, preferredOrganizationId?: string) {
    return this.projectAccess.getSessionForUser(user, preferredOrganizationId);
  }

  async refresh(rawToken: string): Promise<AuthTokens> {
    const lookupKey = this.hashToken(rawToken);
    const stored = await this.authRepo.findRefreshToken(lookupKey);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepo.deleteRefreshToken(lookupKey);
    return this.issueTokens(stored.user.id, stored.user.email, stored.user.roleId);
  }

  async logout(rawToken: string): Promise<void> {
    await this.authRepo.deleteRefreshToken(this.hashToken(rawToken));
  }

  async changeOwnPassword(
    userId: string,
    dto: ChangeOwnPasswordDto,
  ): Promise<void> {
    const user = await this.authRepo.findUserById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.authRepo.updatePassword(userId, hashed);
  }

  private async issueTokens(
    userId: string,
    email: string,
    roleId: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, roleId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.authRepo.storeRefreshToken(
      userId,
      this.hashToken(refreshToken),
      expiresAt,
    );

    return { accessToken, refreshToken, expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
