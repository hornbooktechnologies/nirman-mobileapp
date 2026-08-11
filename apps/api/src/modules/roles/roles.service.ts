import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepo: RolesRepository) {}

  async findAll() {
    const roles = await this.rolesRepo.findAll();
    return roles.map((role) => ({
      ...role,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
    }));
  }

  async findById(id: string) {
    const role = await this.rolesRepo.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  create(dto: CreateRoleDto) {
    return this.rolesRepo.create(dto);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findById(id);
    if (role.isSystem) throw new ConflictException('System roles are read-only');
    return this.rolesRepo.update(id, dto);
  }

  async delete(id: string) {
    const role = await this.findById(id);
    if (role.isSystem) throw new ConflictException('System roles cannot be deleted');
    if (role._count.users > 0) {
      throw new ConflictException('Cannot delete a role assigned to users');
    }
    await this.rolesRepo.delete(id);
  }

  async getPermissions(id: string) {
    await this.findById(id);
    return this.rolesRepo.findPermissions(id);
  }

  async replacePermissions(id: string, dto: SetPermissionsDto) {
    const role = await this.findById(id);
    if (role.isSystem) throw new ConflictException('System roles are read-only');
    await this.rolesRepo.replacePermissions(id, dto.permissions);
    return this.findById(id);
  }
}
