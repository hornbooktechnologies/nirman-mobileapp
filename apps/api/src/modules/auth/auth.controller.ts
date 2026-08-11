import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/auth.types';

const COOKIE_NAME = 'refresh_token';
const COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, expiresInSeconds, user, ...session } =
      await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return {
      success: true,
      message: 'Login successful',
      data: { accessToken, expiresInSeconds, user, ...session },
    };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() payload: { rawToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!payload.rawToken) throw new UnauthorizedException();
    const { accessToken, refreshToken, expiresInSeconds } = await this.authService.refresh(
      payload.rawToken,
    );
    this.setRefreshCookie(res, refreshToken);
    return {
      success: true,
      message: 'Token refreshed',
      data: { accessToken, expiresInSeconds },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const req = res.req as Request;
    const cookie = req.cookies[COOKIE_NAME] as string | undefined;
    if (cookie) await this.authService.logout(cookie);
    res.clearCookie(COOKIE_NAME);
    return { success: true, message: 'Logged out successfully', data: null };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'Current user retrieved',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        role: { id: user.roleId, name: user.roleName },
        permissions: user.permissions.map(
          (permission) => `${permission.resource}:${permission.action}`,
        ),
      },
    };
  }

  @Get('session')
  async session(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
  ) {
    const data = await this.authService.session(user, organizationId);
    return {
      success: true,
      message: 'Session retrieved',
      data,
    };
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangeOwnPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.changeOwnPassword(user.id, dto);
    return {
      success: true,
      message: 'Password changed successfully',
      data: null,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_TTL_MS,
    });
  }
}
