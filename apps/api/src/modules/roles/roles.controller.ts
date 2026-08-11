import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { assertPlatformPermission } from '../auth/platform-access';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    assertPlatformPermission(user, 'platform-roles:read');
    const data = await this.rolesService.findAll();
    return { success: true, message: 'Roles retrieved', data };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertPlatformPermission(user, 'platform-roles:read');
    const data = await this.rolesService.findById(id);
    return { success: true, message: 'Role retrieved', data };
  }

  @Post()
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertPlatformPermission(user, 'platform-roles:create');
    const data = await this.rolesService.create(dto);
    return { success: true, message: 'Role created', data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertPlatformPermission(user, 'platform-roles:update');
    const data = await this.rolesService.update(id, dto);
    return { success: true, message: 'Role updated', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertPlatformPermission(user, 'platform-roles:delete');
    await this.rolesService.delete(id);
    return { success: true, message: 'Role deleted', data: null };
  }

  @Get(':id/permissions')
  async getPermissions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertPlatformPermission(user, 'platform-roles:read');
    const data = await this.rolesService.getPermissions(id);
    return { success: true, message: 'Permissions retrieved', data };
  }

  @Put(':id/permissions')
  async replacePermissions(
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertPlatformPermission(user, 'platform-roles:manage');
    const data = await this.rolesService.replacePermissions(id, dto);
    return { success: true, message: 'Permissions saved', data };
  }
}
