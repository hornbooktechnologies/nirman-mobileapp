import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { UsersRepository } from "./users.repository";
import { StorageService } from "../upload/storage.service";
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
@Injectable()
export class ProfilePhotoService {
  private readonly logger = new Logger(ProfilePhotoService.name);
  constructor(
    private readonly users: UsersRepository,
    private readonly storage: StorageService,
  ) {}
  private owned(id: string, key: string | null) {
    return key?.startsWith(`profile-photos/${id}/`) === true;
  }
  async upload(id: string, file?: Express.Multer.File) {
    if (!file?.size || file.size > PROFILE_PHOTO_MAX_BYTES)
      throw new BadRequestException("Choose an image up to 5 MB");
    const b = file.buffer;
    const valid =
      file.mimetype === "image/jpeg"
        ? b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255
        : file.mimetype === "image/png"
          ? b.length >= 8 &&
            b
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : file.mimetype === "image/webp" &&
            b.length >= 12 &&
            b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP";
    if (!valid)
      throw new BadRequestException("Use a valid JPEG, PNG or WebP image");
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException("User not found");
    const ext =
      file.mimetype === "image/jpeg"
        ? "jpg"
        : file.mimetype === "image/png"
          ? "png"
          : "webp";
    const key = `profile-photos/${id}/${randomUUID()}.${ext}`;
    await this.storage.upload(key, b, file.mimetype);
    try {
      if (!(await this.users.replaceAvatar(id, user.avatar, key)))
        throw new ConflictException(
          "Profile photo changed. Refresh and try again.",
        );
    } catch (error) {
      await this.storage
        .delete(key)
        .catch(() => this.logger.warn("Profile photo cleanup failed"));
      throw error;
    }
    if (this.owned(id, user.avatar))
      await this.storage
        .delete(user.avatar!)
        .catch(() => this.logger.warn("Old profile photo cleanup failed"));
    return { avatar: key };
  }
  async media(id: string) {
    const user = await this.users.findById(id);
    if (!user || !this.owned(id, user.avatar))
      throw new NotFoundException("Profile photo not found");
    return this.storage.download(user.avatar!);
  }
  async remove(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException("User not found");
    if (!user.avatar) return { avatar: null };
    if (!(await this.users.replaceAvatar(id, user.avatar, null)))
      throw new ConflictException(
        "Profile photo changed. Refresh and try again.",
      );
    if (this.owned(id, user.avatar))
      await this.storage
        .delete(user.avatar)
        .catch(() => this.logger.warn("Profile photo cleanup failed"));
    return { avatar: null };
  }
}
