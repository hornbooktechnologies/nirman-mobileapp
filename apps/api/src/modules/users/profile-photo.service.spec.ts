import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  ProfilePhotoService,
  PROFILE_PHOTO_MAX_BYTES,
} from "./profile-photo.service";
import type { UsersRepository } from "./users.repository";
import type { StorageService } from "../upload/storage.service";
describe("ProfilePhotoService", () => {
  const users = { findById: jest.fn(), replaceAvatar: jest.fn() };
  const storage = { upload: jest.fn(), delete: jest.fn(), download: jest.fn() };
  const service = new ProfilePhotoService(
    users as unknown as UsersRepository,
    storage as unknown as StorageService,
  );
  const file = {
    mimetype: "image/png",
    size: 8,
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    originalname: "photo.png",
  } as Express.Multer.File;
  beforeEach(() => {
    jest.resetAllMocks();
    users.findById.mockResolvedValue({ id: "user", avatar: null });
    users.replaceAvatar.mockResolvedValue(true);
    storage.upload.mockResolvedValue({});
    storage.delete.mockResolvedValue(undefined);
  });
  it("stores valid photos under the authenticated user and updates the avatar reference", async () => {
    const result = await service.upload("user", file);
    expect(result.avatar).toMatch(/^profile-photos\/user\/[a-f0-9-]+\.png$/);
    expect(storage.upload).toHaveBeenCalledWith(
      result.avatar,
      file.buffer,
      "image/png",
    );
    expect(users.replaceAvatar).toHaveBeenCalledWith(
      "user",
      null,
      result.avatar,
    );
  });
  it("rejects unsupported or spoofed types and oversized/empty files before storage", async () => {
    for (const bad of [
      { ...file, mimetype: "image/svg+xml" },
      { ...file, buffer: Buffer.from("not png!") },
      { ...file, size: 0 },
      { ...file, size: PROFILE_PHOTO_MAX_BYTES + 1 },
    ]) {
      await expect(service.upload("user", bad)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it("cleans the new object when another update wins the concurrency check", async () => {
    users.replaceAvatar.mockResolvedValue(false);
    await expect(service.upload("user", file)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(storage.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^profile-photos\/user\//),
    );
  });
  it("cleans a previous owned photo only after replacement succeeds", async () => {
    users.findById.mockResolvedValue({ avatar: "profile-photos/user/old.png" });
    await service.upload("user", file);
    expect(storage.delete).toHaveBeenCalledWith("profile-photos/user/old.png");
  });
  it("never downloads an avatar reference owned by another user", async () => {
    users.findById.mockResolvedValue({
      avatar: "profile-photos/other/photo.png",
    });
    await expect(service.media("user")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.download).not.toHaveBeenCalled();
  });
  it("never deletes legacy external images", async () => {
    users.findById.mockResolvedValue({
      avatar: "https://example.test/photo.png",
    });
    await expect(service.remove("user")).resolves.toEqual({ avatar: null });
    expect(users.replaceAvatar).toHaveBeenCalledWith(
      "user",
      "https://example.test/photo.png",
      null,
    );
    expect(storage.delete).not.toHaveBeenCalled();
  });
  it("clears and deletes the current owned photo", async () => {
    users.findById.mockResolvedValue({ avatar: "profile-photos/user/old.png" });
    await expect(service.remove("user")).resolves.toEqual({ avatar: null });
    expect(users.replaceAvatar).toHaveBeenCalledWith(
      "user",
      "profile-photos/user/old.png",
      null,
    );
    expect(storage.delete).toHaveBeenCalledWith("profile-photos/user/old.png");
  });
  it("allows removing an already empty photo without updating storage", async () => {
    await expect(service.remove("user")).resolves.toEqual({ avatar: null });
    expect(users.replaceAvatar).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });
  it("cleans uploaded bytes after a database failure", async () => {
    users.replaceAvatar.mockRejectedValue(new Error("database unavailable"));
    await expect(service.upload("user", file)).rejects.toThrow(
      "database unavailable",
    );
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });
});
