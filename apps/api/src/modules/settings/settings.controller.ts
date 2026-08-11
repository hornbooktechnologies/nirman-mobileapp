import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import {
  UpdateEmailSettingsDto,
  UpdateGeneralDto,
} from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('platform-settings:read')
  async getAll() {
    const data = await this.settingsService.getAll();
    return { success: true, message: 'Settings retrieved', data };
  }

  @Patch('general')
  @RequirePermissions('platform-settings:update')
  async updateGeneral(
    @Body() dto: UpdateGeneralDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.settingsService.updateGeneral(dto, actor.id);
    return { success: true, message: 'General settings updated', data };
  }

  @Patch('email')
  @RequirePermissions('platform-settings:update')
  async updateEmail(
    @Body() dto: UpdateEmailSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.settingsService.updateEmail(dto, actor.id);
    return { success: true, message: 'Email settings updated', data };
  }
}
