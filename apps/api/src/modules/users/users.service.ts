import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  findAll(query: QueryUserDto) {
    return this.usersRepo.findAll(query);
  }

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email is already in use');

    const password = await bcrypt.hash(dto.password, 12);
    return this.usersRepo.create({ ...dto, password });
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    await this.findById(id);
    if (id === actorId && (dto.roleId || dto.isActive === false)) {
      throw new ForbiddenException('You cannot change your own role or status');
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
    if (id === actorId) throw new ForbiddenException('You cannot deactivate yourself');
    await this.usersRepo.delete(id);
  }
}
