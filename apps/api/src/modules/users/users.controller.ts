import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  ProfilePhotoService,
  PROFILE_PHOTO_MAX_BYTES,
} from "./profile-photo.service";
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
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from "@nestjs/common";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly photos: ProfilePhotoService,
  ) {}

  @Get()
  @RequirePermissions("platform-users:read")
  async findAll(@Query() query: QueryUserDto) {
    const data = await this.usersService.findAll(query);
    return { success: true, message: "Users retrieved", data };
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.usersService.findById(user.id);
    return { success: true, message: "Profile retrieved", data };
  }

  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: PROFILE_PHOTO_MAX_BYTES, files: 1 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return {
      success: true,
      message: "Profile photo updated",
      data: await this.photos.upload(user.id, file),
    };
  }

  @Get("me/avatar")
  async avatar(
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const media = await this.photos.media(user.id);
    response.setHeader("Content-Type", media.contentType);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.send(media.body);
  }

  @Delete("me/avatar")
  async removeAvatar(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: "Profile photo removed",
      data: await this.photos.remove(user.id),
    };
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.usersService.updateProfile(user.id, dto);
    return { success: true, message: "Profile updated", data };
  }

  @Patch("me/password")
  @HttpCode(HttpStatus.OK)
  async changeMyPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.id, dto);
    return { success: true, message: "Password updated", data: null };
  }

  @Get(":id")
  @RequirePermissions("platform-users:read")
  async findOne(@Param("id") id: string) {
    const data = await this.usersService.findById(id);
    return { success: true, message: "User retrieved", data };
  }

  @Post()
  @RequirePermissions("platform-users:create")
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.usersService.create(dto, actor);
    return { success: true, message: "User created", data };
  }

  @Patch(":id")
  @RequirePermissions("platform-users:update")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.usersService.update(id, dto, actor);
    return { success: true, message: "User updated", data };
  }

  @Delete(":id")
  @RequirePermissions("platform-users:deactivate")
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.usersService.delete(id, actor.id);
    return { success: true, message: "User deactivated", data: null };
  }
}
