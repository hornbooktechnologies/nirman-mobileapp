import { BadRequestException, ConflictException } from "@nestjs/common";
import { GalleryService } from "./gallery.service";

describe("GalleryService", () => {
  const repository = {
    findReplay: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    summary: jest.fn(),
    findById: jest.fn(),
    review: jest.fn(),
  };
  const projectAccess = { resolveProjectAccess: jest.fn() };
  const storage = {
    upload: jest.fn(),
    delete: jest.fn(),
    getPresignedUrl: jest.fn(),
  };
  const service = new GalleryService(
    repository as never,
    projectAccess as never,
    storage as never,
  );
  const actor = { id: "actor-user" } as never;
  const access = {
    project: { status: "ACTIVE" },
    organization: { operatingProfile: "CUSTOM" },
    membership: { id: "member-1" },
    permissions: ["gallery:upload", "gallery:read", "gallery:approve"],
  };
  const dto = {
    entryId: "11111111-1111-4111-8111-111111111111",
    idempotencyKey: "upload-key-1",
    category: "WORK" as const,
    capturedAt: "2025-09-03T08:00:00.000Z",
  };
  const file = {
    mimetype: "image/jpeg",
    size: 3,
    buffer: Buffer.from([0xff, 0xd8, 0xff]),
    originalname: "site.jpg",
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue(access);
    repository.findReplay.mockResolvedValue(null);
    storage.upload.mockResolvedValue({});
    storage.delete.mockResolvedValue(undefined);
    repository.create.mockResolvedValue({ id: dto.entryId, status: "PENDING" });
  });

  it("uploads review-required metadata after durable object storage", async () => {
    await expect(
      service.upload("org", "project", dto, file, actor),
    ).resolves.toMatchObject({ status: "PENDING" });
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringContaining(dto.entryId),
      file.buffer,
      "image/jpeg",
    );
    expect(repository.create).toHaveBeenCalledWith(
      "org",
      "project",
      expect.objectContaining({
        workflowMode: "REVIEW_REQUIRED",
        status: "PENDING",
      }),
    );
  });

  it("returns the existing item without uploading bytes for an exact replay", async () => {
    await service.upload("org", "project", dto, file, actor);
    const fingerprint = (
      repository.create.mock.calls[0] as unknown as readonly [
        unknown,
        unknown,
        { fingerprint: string },
      ]
    )[2].fingerprint;
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue(access);
    repository.findReplay.mockResolvedValue({
      entry: { id: dto.entryId, projectId: "project" },
      fingerprint,
    });
    await expect(
      service.upload("org", "project", dto, file, actor),
    ).resolves.toMatchObject({ id: dto.entryId });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects a conflicting retry key", async () => {
    repository.findReplay.mockResolvedValue({
      entry: { id: dto.entryId, projectId: "project" },
      fingerprint: "different",
    });
    await expect(
      service.upload("org", "project", dto, file, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects unsupported media before storage", async () => {
    await expect(
      service.upload(
        "org",
        "project",
        dto,
        { ...file, mimetype: "video/mp4" },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
