import { BadRequestException } from "@nestjs/common";
import { BrochuresService } from "./brochures.service";

describe("BrochuresService", () => {
  const repo = {
    findReplay: jest.fn(),
    create: jest.fn(),
    validateAssets: jest.fn(),
    createShare: jest.fn(),
    findShare: jest.fn(),
    projectNames: jest.fn(),
    updateDelivery: jest.fn(),
    addLeadActivity: jest.fn(),
  };
  const access = { resolveProjectAccess: jest.fn() };
  const storage = { upload: jest.fn(), delete: jest.fn(), download: jest.fn() };
  const email = { sendBrochureShare: jest.fn() };
  const service = new BrochuresService(
    repo as never,
    access as never,
    storage as never,
    email as never,
  );
  const actor = {
    id: "user-1",
    name: "Asha",
    email: "asha@example.test",
  } as never;
  const dto = {
    assetId: "11111111-1111-4111-8111-111111111111",
    idempotencyKey: "upload-key-1",
    title: "Project overview",
    category: "PROJECT" as const,
    sortOrder: 0,
  };
  const file = {
    mimetype: "application/pdf",
    size: 9,
    buffer: Buffer.from("%PDF-test"),
    originalname: "overview.pdf",
  } as Express.Multer.File;

  beforeAll(() => {
    process.env.JWT_SECRET = "test-brochure-secret";
  });

  beforeEach(() => {
    jest.clearAllMocks();
    access.resolveProjectAccess.mockResolvedValue({
      project: { status: "ACTIVE" },
      membership: { id: "member-1" },
      permissions: ["brochures:read", "brochures:upload", "brochures:share"],
    });
    repo.findReplay.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: dto.assetId });
    storage.upload.mockResolvedValue(undefined);
    storage.delete.mockResolvedValue(undefined);
  });

  it("stores a signature-validated PDF in the private project prefix", async () => {
    await expect(
      service.upload("org", "project", dto, file, actor),
    ).resolves.toEqual({ id: dto.assetId });
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^organizations\/org\/projects\/project\/assets\/brochures\/11111111-1111-4111-8111-111111111111\/[0-9a-f-]+\.pdf$/,
      ),
      file.buffer,
      file.mimetype,
    );
  });

  it("accepts a supported file above the former 50 MiB ceiling", async () => {
    const buffer = Buffer.alloc(50 * 1024 * 1024 + 1);
    buffer.write("%PDF-");
    await expect(
      service.upload(
        "org",
        "project",
        dto,
        { ...file, buffer, size: buffer.length },
        actor,
      ),
    ).resolves.toEqual({ id: dto.assetId });
    expect(repo.create).toHaveBeenCalledWith(
      "org",
      "project",
      expect.objectContaining({ byteSize: buffer.length }),
    );
  });

  it("rejects files above 1 GiB before storage", async () => {
    await expect(
      service.upload(
        "org",
        "project",
        dto,
        { ...file, size: 1024 * 1024 * 1024 + 1 },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("returns a readable error and cleans storage when project capacity is exceeded", async () => {
    repo.create.mockRejectedValueOnce(
      Object.assign(new Error("full"), { code: "BROCHURE_QUOTA_EXCEEDED" }),
    );
    await expect(
      service.upload("org", "project", dto, file, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.delete).toHaveBeenCalled();
  });

  it("rejects empty files before storage", async () => {
    await expect(
      service.upload(
        "org",
        "project",
        dto,
        { ...file, buffer: Buffer.alloc(0), size: 0 },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects mismatched file signatures before storage", async () => {
    await expect(
      service.upload(
        "org",
        "project",
        dto,
        { ...file, buffer: Buffer.from("not-a-pdf") },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("removes newly uploaded bytes when persistence fails", async () => {
    repo.create.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(
      service.upload("org", "project", dto, file, actor),
    ).rejects.toThrow("database unavailable");
    expect(storage.delete).toHaveBeenCalledWith(
      expect.stringContaining("/assets/brochures/"),
    );
  });

  it("uses the canonical live origin for production brochure links", () => {
    const previous = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.PUBLIC_WEB_APP_URL = "http://localhost:3000";
      expect(
        (service as unknown as { url(token: string): string }).url("a/b"),
      ).toBe("https://app.nirmansite.com/brochure-share/a%2Fb");
    } finally {
      process.env = previous;
    }
  });

  it("rejects unavailable Lead-share selections before Lead creation", async () => {
    repo.validateAssets.mockResolvedValue([]);
    await expect(
      service.validateLeadShare("org", "project", [dto.assetId], actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a Lead-linked recipient mismatch before creating a share", async () => {
    await expect(
      service.shareEmail(
        "org",
        "project",
        {
          assetIds: [dto.assetId],
          idempotencyKey: "share-key",
          recipientEmail: "other@example.test",
        },
        actor,
        "lead@example.test",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.createShare).not.toHaveBeenCalled();
  });
});
