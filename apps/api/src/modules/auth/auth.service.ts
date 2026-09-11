import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { AuthTokens, AuthenticatedUser, JwtPayload } from './types/auth.types';
import { ProjectAccessService } from '../project-access/project-access.service';
import { EmailService } from '../email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const REFRESH_TOKEN_TTL_DAYS = 7;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const PASSWORD_RESET_TTL_MINUTES = 15;
const PASSWORD_RESET_RATE_WINDOW_MINUTES = 15;
const PASSWORD_RESET_MAX_PER_EMAIL = 3;
const PASSWORD_RESET_MAX_PER_IP = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly projectAccess: ProjectAccessService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens & { user: AuthenticatedUser }> {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

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
    if (!valid) {
      throw new BadRequestException({
        code: 'AUTH_CURRENT_PASSWORD_INVALID',
        message: 'Current password is incorrect',
      });
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.authRepo.updatePasswordAndRevokeSessions(userId, hashed);
    void this.emailService.sendPasswordChangedNotice(user.id, user.name, user.email);
  }

  async requestPasswordReset(dto: ForgotPasswordDto, requestIp?: string) {
    const email = dto.email.trim().toLowerCase();
    const emailHash = this.hashToken(email);
    const requestedIpHash = requestIp ? this.hashToken(requestIp) : null;
    const since = new Date(
      Date.now() - PASSWORD_RESET_RATE_WINDOW_MINUTES * 60 * 1000,
    );
    const rate = await this.authRepo.countRecentPasswordResetRequests(
      emailHash,
      requestedIpHash,
      since,
    );
    if (
      rate.emailTotal >= PASSWORD_RESET_MAX_PER_EMAIL ||
      rate.ipTotal >= PASSWORD_RESET_MAX_PER_IP
    ) {
      return;
    }

    const user = await this.authRepo.findUserByEmail(email);
    const recoverableUser = user?.isActive ? user : null;
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
    );
    const requestId = await this.authRepo.createPasswordResetRequest({
      userId: recoverableUser?.id ?? null,
      emailHash,
      tokenHash: this.hashToken(rawToken),
      requestedIpHash,
      expiresAt,
    });

    if (recoverableUser) {
      void this.emailService.sendPasswordReset(requestId, {
        recipientName: recoverableUser.name,
        recipientEmail: recoverableUser.email,
        expiresAt: expiresAt.toISOString(),
        resetUrl: this.webPasswordResetUrl(rawToken),
        mobileResetUrl: this.mobilePasswordResetUrl(rawToken),
      });
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.token.length < 32) this.invalidPasswordReset();
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const completed = await this.authRepo.completePasswordReset(
      this.hashToken(dto.token),
      passwordHash,
    );
    if (!completed) this.invalidPasswordReset();
    if (completed.email) {
      void this.emailService.sendPasswordChangedNotice(
        completed.userId,
        completed.name,
        completed.email,
      );
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    roleId: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, roleId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
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

  private webPasswordResetUrl(token: string) {
    const configuredBase =
      process.env.PUBLIC_WEB_APP_URL ??
      process.env.FRONTEND_URL?.split(',')[0]?.trim() ??
      'http://localhost:3000';
    return `${configuredBase.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private mobilePasswordResetUrl(token: string) {
    const expoGoProjectUrl = process.env.EXPO_GO_PROJECT_URL?.trim();
    if (expoGoProjectUrl) {
      return `${expoGoProjectUrl.replace(/\/$/, '')}/--/reset-password?token=${encodeURIComponent(token)}`;
    }
    const scheme = process.env.MOBILE_APP_SCHEME ?? 'nirmansite';
    return `${scheme}://reset-password?token=${encodeURIComponent(token)}`;
  }

  private invalidPasswordReset(): never {
    throw new BadRequestException({
      code: 'AUTH_PASSWORD_RESET_INVALID',
      message: 'This password reset link is invalid or expired',
    });
  }
}
