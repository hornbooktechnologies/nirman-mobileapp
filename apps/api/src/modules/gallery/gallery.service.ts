import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  GALLERY_ALLOWED_MIME_TYPES,
  GALLERY_DIRECT_OPERATING_PROFILES,
  GALLERY_MAX_FILE_BYTES,
  type ErrorCode,
  type PermissionKey,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { StorageService } from "../upload/storage.service";
import type {
  QueryGalleryDto,
  RejectGalleryEntryDto,
  ReviewGalleryEntryDto,
  UploadGalleryEntryDto,
} from "./dto/gallery.dto";
import { GalleryRepository } from "./gallery.repository";

@Injectable()
export class GalleryService {
  constructor(
    private readonly repository: GalleryRepository,
    private readonly projectAccess: ProjectAccessService,
    private readonly storage: StorageService,
  ) {}

  async list(
    organizationId: string,
    projectId: string,
    query: QueryGalleryDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "gallery:read",
    );
    this.validateRange(query.dateFrom, query.dateTo);
    return this.repository.findMany(
      organizationId,
      projectId,
      query,
      actor.id,
      access.permissions.includes("gallery:approve") ||
        access.permissions.includes("gallery:reject"),
    );
  }
  async summary(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "gallery:read",
    );
    return this.repository.summary(
      organizationId,
      projectId,
      actor.id,
      access.permissions.includes("gallery:approve") ||
        access.permissions.includes("gallery:reject"),
    );
  }

  async upload(
    organizationId: string,
    projectId: string,
    dto: UploadGalleryEntryDto,
    file: Express.Multer.File | undefined,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "gallery:upload",
    );
    if (access.project.status !== "ACTIVE")
      throw new BadRequestException(
        this.error(
          "PROJECT_STATUS_INVALID",
          "Gallery uploads require an active Project",
        ),
      );
    if (!file)
      throw new BadRequestException(
        this.error("GALLERY_MEDIA_REQUIRED", "Select a photo to upload"),
      );
    if (
      !(GALLERY_ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)
    )
      throw new BadRequestException(
        this.error(
          "GALLERY_MEDIA_TYPE_UNSUPPORTED",
          "Only JPEG, PNG, and WebP images are supported",
        ),
      );
    if (file.size > GALLERY_MAX_FILE_BYTES)
      throw new BadRequestException(
        this.error(
          "GALLERY_MEDIA_TOO_LARGE",
          "Photo must be 10 MiB or smaller",
        ),
      );
    if (new Date(dto.capturedAt).getTime() > Date.now() + 60_000)
      throw new BadRequestException(
        this.error(
          "GALLERY_CAPTURED_AT_IN_FUTURE",
          "Capture time cannot be in the future",
        ),
      );
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const workflowMode = (
      GALLERY_DIRECT_OPERATING_PROFILES as readonly string[]
    ).includes(access.organization.operatingProfile)
      ? ("DIRECT" as const)
      : ("REVIEW_REQUIRED" as const);
    const normalized = {
      entryId: dto.entryId,
      projectId,
      category: dto.category,
      stage: dto.stage ?? null,
      caption: dto.caption?.trim() || null,
      capturedAt: new Date(dto.capturedAt).toISOString(),
      width: dto.width ?? null,
      height: dto.height ?? null,
      checksum,
      workflowMode,
    };
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");
    const replay = await this.repository.findReplay(
      organizationId,
      dto.idempotencyKey.trim(),
    );
    if (replay) {
      if (
        replay.fingerprint !== fingerprint ||
        replay.entry.id !== dto.entryId ||
        replay.entry.projectId !== projectId
      )
        throw new ConflictException(
          this.error(
            "GALLERY_IDEMPOTENCY_CONFLICT",
            "This retry key was already used for a different upload",
          ),
        );
      return replay.entry;
    }
    if (!this.matchesImageSignature(file.buffer, file.mimetype))
      throw new BadRequestException(
        this.error(
          "GALLERY_MEDIA_TYPE_UNSUPPORTED",
          "The selected file does not match its image type",
        ),
      );
    const extension =
      file.mimetype === "image/png"
        ? "png"
        : file.mimetype === "image/webp"
          ? "webp"
          : "jpg";
    const fileAssetId = randomUUID();
    const storageKey = `organizations/${organizationId}/projects/${projectId}/gallery/${dto.entryId}/${fileAssetId}.${extension}`;
    await this.storage.upload(storageKey, file.buffer, file.mimetype);
    try {
      return await this.translate(() =>
        this.repository.create(organizationId, projectId, {
          dto: {
            ...dto,
            caption: dto.caption?.trim(),
            idempotencyKey: dto.idempotencyKey.trim(),
            capturedAt: normalized.capturedAt,
          },
          actor: { userId: actor.id, memberId: access.membership.id },
          fileAssetId,
          storageKey,
          originalFilename:
            file.originalname.slice(0, 255) || `photo.${extension}`,
          mimeType: file.mimetype,
          byteSize: file.size,
          checksum,
          workflowMode,
          status: workflowMode === "DIRECT" ? "APPROVED" : "PENDING",
          fingerprint,
        }),
      );
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async media(
    organizationId: string,
    projectId: string,
    entryId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "gallery:read",
    );
    const record = await this.repository.findById(
      organizationId,
      projectId,
      entryId,
    );
    if (!record)
      throw new NotFoundException(
        this.error("GALLERY_ENTRY_NOT_FOUND", "Gallery entry not found"),
      );
    const canReview =
      access.permissions.includes("gallery:approve") ||
      access.permissions.includes("gallery:reject");
    if (
      record.status !== "APPROVED" &&
      record.uploadedByUserId !== actor.id &&
      !canReview
    )
      throw new ForbiddenException(
        this.error(
          "PROJECT_PERMISSION_DENIED",
          "This Gallery media is not available",
        ),
      );
    const storageKey = await this.repository.findStorageKey(
      organizationId,
      projectId,
      entryId,
    );
    if (!storageKey)
      throw new NotFoundException(
        this.error("GALLERY_ENTRY_NOT_FOUND", "Gallery media not found"),
      );
    return this.storage.download(storageKey);
  }

  approve(
    organizationId: string,
    projectId: string,
    entryId: string,
    dto: ReviewGalleryEntryDto,
    actor: AuthenticatedUser,
  ) {
    return this.review(
      organizationId,
      projectId,
      entryId,
      dto.expectedVersion,
      "APPROVED",
      null,
      actor,
      "gallery:approve",
    );
  }
  reject(
    organizationId: string,
    projectId: string,
    entryId: string,
    dto: RejectGalleryEntryDto,
    actor: AuthenticatedUser,
  ) {
    return this.review(
      organizationId,
      projectId,
      entryId,
      dto.expectedVersion,
      "REJECTED",
      dto.reason.trim(),
      actor,
      "gallery:reject",
    );
  }
  private async review(
    organizationId: string,
    projectId: string,
    entryId: string,
    version: number,
    status: "APPROVED" | "REJECTED",
    reason: string | null,
    actor: AuthenticatedUser,
    permission: PermissionKey,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      permission,
    );
    return this.translate(() =>
      this.repository.review(
        organizationId,
        projectId,
        entryId,
        version,
        status,
        reason,
        { userId: actor.id, memberId: access.membership.id },
      ),
    );
  }
  private access(
    actor: AuthenticatedUser,
    organizationId: string,
    projectId: string,
    permission: PermissionKey,
  ) {
    return this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      permission,
    );
  }
  private validateRange(start?: string, end?: string) {
    if (start && end && end < start)
      throw new BadRequestException(
        this.error("VALIDATION_FAILED", "End date cannot be before start date"),
      );
  }
  private matchesImageSignature(buffer: Buffer, mimeType: string) {
    if (mimeType === "image/jpeg")
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    if (mimeType === "image/png")
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    return (
      mimeType === "image/webp" &&
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  private async translate<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code === "GALLERY_ENTRY_NOT_FOUND")
        throw new NotFoundException(
          this.error(code, "Gallery entry not found"),
        );
      if (
        [
          "GALLERY_VERSION_CONFLICT",
          "GALLERY_IDEMPOTENCY_CONFLICT",
          "ER_DUP_ENTRY",
        ].includes(code)
      )
        throw new ConflictException(
          this.error(
            code === "ER_DUP_ENTRY"
              ? "GALLERY_IDEMPOTENCY_CONFLICT"
              : (code as ErrorCode),
            "The Gallery item changed or this retry conflicts",
          ),
        );
      if (
        [
          "GALLERY_SELF_REVIEW_FORBIDDEN",
          "GALLERY_STATUS_TRANSITION_INVALID",
        ].includes(code)
      )
        throw new BadRequestException(
          this.error(
            code as ErrorCode,
            code === "GALLERY_SELF_REVIEW_FORBIDDEN"
              ? "You cannot review your own upload"
              : "This Gallery item cannot be reviewed now",
          ),
        );
      throw error;
    }
  }
  private error(code: ErrorCode | "VALIDATION_FAILED", message: string) {
    return { code, message };
  }
}
