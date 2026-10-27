import { UploadModule } from "../upload/upload.module";
import { ProfilePhotoService } from "./profile-photo.service";
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

@Module({
  imports: [UploadModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, ProfilePhotoService],
  exports: [UsersService],
})
export class UsersModule {}
