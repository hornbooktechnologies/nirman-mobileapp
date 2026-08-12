import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  isCustomerSystemRoleName,
  isPlatformSystemRoleName,
} from "@nirman-app/shared";
import * as bcrypt from "bcryptjs";
import { isPlatformSuperAdmin } from "../auth/platform-access";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  findAll(query: QueryUserDto) {
    return this.usersRepo.findAll(query);
  }

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException("Email is already in use");

    await this.assertPlatformRoleAssignment(dto.roleId, actor);

    const password = await bcrypt.hash(dto.password, 12);
    return this.usersRepo.create({ ...dto, password });
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    await this.findById(id);
    if (id === actor.id && (dto.roleId || dto.isActive === false)) {
      throw new ForbiddenException("You cannot change your own role or status");
    }

    if (dto.roleId) {
      await this.assertPlatformRoleAssignment(dto.roleId, actor);
    }

    return this.usersRepo.update(id, dto);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.findById(id);
    return this.usersRepo.updateProfile(id, dto);
  }

  async changePassword(id: string, password: string) {
    await this.findById(id);
    await this.usersRepo.updatePassword(id, await bcrypt.hash(password, 12));
  }

  async delete(id: string, actorId: string) {
    await this.findById(id);
    if (id === actorId)
      throw new ForbiddenException("You cannot deactivate yourself");
    await this.usersRepo.delete(id);
  }

  private async assertPlatformRoleAssignment(
    roleId: string,
    actor: AuthenticatedUser,
  ) {
    const role = await this.usersRepo.findRoleById(roleId);
    if (!role) throw new NotFoundException("Platform role not found");

    if (role.isSystem && isCustomerSystemRoleName(role.name)) {
      throw new ForbiddenException(
        "Customer organization roles must be assigned through organization membership",
      );
    }
    if (role.isSystem && !isPlatformSystemRoleName(role.name)) {
      throw new ForbiddenException("This system role cannot be assigned here");
    }
    if (
      ["Platform Super Admin", "Super Admin"].includes(role.name) &&
      !isPlatformSuperAdmin(actor)
    ) {
      throw new ForbiddenException(
        "Only a Platform Super Admin can assign the platform owner role",
      );
    }
  }
}
