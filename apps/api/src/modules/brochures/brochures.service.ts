import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  BROCHURE_ALLOWED_MIME_TYPES,
  BROCHURE_PROJECT_QUOTA_BYTES,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { EmailService } from "../email/email.service";
import { ProjectAccessService } from "../project-access/project-access.service";
import { StorageService } from "../upload/storage.service";
import { BrochuresRepository } from "./brochures.repository";
import type {
  BrochureSelectionDto,
  EmailBrochureShareDto,
  UpdateBrochureDto,
  UploadBrochureDto,
} from "./dto/brochures.dto";

@Injectable()
export class BrochuresService {
  constructor(
    private readonly repo: BrochuresRepository,
    private readonly access: ProjectAccessService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
  ) {}

  async list(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
    includeArchived = false,
  ) {
    const resolved = await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:read",
    );
    return this.repo.list(
      organizationId,
      projectId,
      includeArchived && resolved.permissions.includes("brochures:manage"),
    );
  }

  async upload(
    organizationId: string,
    projectId: string,
    dto: UploadBrochureDto,
    file: Express.Multer.File | undefined,
    actor: AuthenticatedUser,
  ) {
    const resolved = await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:upload",
    );
    this.active(resolved.project.status);
    if (!file)
      throw this.bad(
        "BROCHURE_FILE_REQUIRED",
        "Select a PDF, image, or video to upload",
      );
    if (
      !(BROCHURE_ALLOWED_MIME_TYPES as readonly string[]).includes(
        file.mimetype,
      )
    )
      throw this.bad(
        "BROCHURE_FILE_TYPE_UNSUPPORTED",
        "Use PDF, JPEG, PNG, WebP, MP4, or MOV files",
      );
    if (!file.size || file.size > BROCHURE_PROJECT_QUOTA_BYTES)
      throw this.bad(
        "BROCHURE_FILE_TOO_LARGE",
        "File must be 50 MiB or smaller",
      );
    if (!this.filenameMatches(file.originalname, file.mimetype))
      throw this.bad(
        "BROCHURE_FILE_SIGNATURE_INVALID",
        "The file extension does not match its selected file type",
      );
    if (!this.signature(file.buffer, file.mimetype))
      throw this.bad(
        "BROCHURE_FILE_SIGNATURE_INVALID",
        "The selected file does not match its file type",
      );
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          projectId,
          assetId: dto.assetId,
          title: dto.title,
          description: dto.description ?? null,
          category: dto.category,
          sortOrder: dto.sortOrder,
          checksum,
        }),
      )
      .digest("hex");
    const replay = await this.repo.findReplay(
      organizationId,
      dto.idempotencyKey,
    );
    if (replay) {
      if (
        replay.fingerprint !== fingerprint ||
        replay.asset.projectId !== projectId ||
        replay.asset.id !== dto.assetId
      )
        throw new ConflictException({
          code: "BROCHURE_IDEMPOTENCY_CONFLICT",
          message: "This retry key was used for another upload",
        });
      return replay.asset;
    }
    const fileAssetId = randomUUID();
    const ext = this.extension(file.mimetype);
    const key = `organizations/${organizationId}/projects/${projectId}/assets/brochures/${dto.assetId}/${fileAssetId}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    try {
      return await this.repo.create(organizationId, projectId, {
        dto,
        actor: { userId: actor.id, memberId: resolved.membership.id },
        fileAssetId,
        storageKey: key,
        originalFilename: this.safeName(file.originalname, `brochure.${ext}`),
        mimeType: file.mimetype,
        byteSize: file.size,
        checksum,
        fingerprint,
      });
    } catch (error) {
      await this.storage.delete(key).catch(() => undefined);
      if (this.code(error) === "BROCHURE_QUOTA_EXCEEDED")
        throw this.bad(
          "BROCHURE_QUOTA_EXCEEDED",
          "This upload exceeds the Project's 50 MiB brochure limit",
        );
      throw error;
    }
  }

  async media(
    organizationId: string,
    projectId: string,
    assetId: string,
    actor: AuthenticatedUser,
  ) {
    await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:read",
    );
    const record = await this.repo.storage(organizationId, projectId, assetId);
    if (!record || record.status === "DELETED")
      throw this.notFound("BROCHURE_ASSET_NOT_FOUND", "Brochure not found");
    return {
      ...(await this.storage.download(String(record.storageKey))),
      filename: String(record.originalFilename),
    };
  }

  async update(
    organizationId: string,
    projectId: string,
    assetId: string,
    dto: UpdateBrochureDto,
    actor: AuthenticatedUser,
  ) {
    const resolved = await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:manage",
    );
    this.active(resolved.project.status);
    const current = await this.repo.findById(
      organizationId,
      projectId,
      assetId,
    );
    if (!current || current.status === "DELETED")
      throw this.notFound("BROCHURE_ASSET_NOT_FOUND", "Brochure not found");
    return this.repo.update(organizationId, projectId, assetId, dto, actor.id);
  }
  async archive(
    organizationId: string,
    projectId: string,
    assetId: string,
    actor: AuthenticatedUser,
  ) {
    await this.manage(organizationId, projectId, actor);
    return this.repo.setStatus(
      organizationId,
      projectId,
      assetId,
      "ARCHIVED",
      actor.id,
    );
  }
  async restore(
    organizationId: string,
    projectId: string,
    assetId: string,
    actor: AuthenticatedUser,
  ) {
    await this.manage(organizationId, projectId, actor);
    return this.repo.setStatus(
      organizationId,
      projectId,
      assetId,
      "ACTIVE",
      actor.id,
    );
  }
  async delete(
    organizationId: string,
    projectId: string,
    assetId: string,
    actor: AuthenticatedUser,
  ) {
    await this.manage(organizationId, projectId, actor);
    const current = await this.repo.findById(
      organizationId,
      projectId,
      assetId,
    );
    if (!current || current.status !== "ARCHIVED")
      throw this.bad(
        "VALIDATION_FAILED",
        "Archive this brochure before permanent deletion",
      );
    const stored = await this.repo.storage(organizationId, projectId, assetId);
    if (!stored)
      throw this.notFound("BROCHURE_ASSET_NOT_FOUND", "Brochure not found");
    await this.storage.delete(String(stored.storageKey));
    return this.repo.setStatus(
      organizationId,
      projectId,
      assetId,
      "DELETED",
      actor.id,
    );
  }

  async shares(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:read",
    );
    return this.repo.listShares(organizationId, projectId);
  }

  async validateLeadShare(
    organizationId: string,
    projectId: string,
    assetIds: string[],
    actor: AuthenticatedUser,
  ) {
    const resolved = await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:share",
    );
    this.active(resolved.project.status);
    const unique = [...new Set(assetIds)];
    if (!unique.length)
      throw this.bad(
        "BROCHURE_SELECTION_REQUIRED",
        "Select at least one brochure",
      );
    const assets = await this.repo.validateAssets(
      organizationId,
      projectId,
      unique,
    );
    if (assets.length !== unique.length)
      throw this.bad(
        "BROCHURE_SELECTION_INVALID",
        "One or more selected brochures are unavailable",
      );
  }

  async shareOther(
    organizationId: string,
    projectId: string,
    dto: BrochureSelectionDto,
    actor: AuthenticatedUser,
  ) {
    const resolved = await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:share",
    );
    this.active(resolved.project.status);
    const { share, url } = await this.createShare(
      organizationId,
      projectId,
      dto.assetIds,
      "OTHER",
      dto.idempotencyKey,
      actor,
      resolved.membership.id,
    );
    return { share: { ...share, shareUrl: url }, message: "Share link ready" };
  }

  async shareEmail(
    organizationId: string,
    projectId: string,
    dto: EmailBrochureShareDto,
    actor: AuthenticatedUser,
    expectedLeadEmail?: string,
  ) {
    const resolved = await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:share",
    );
    this.active(resolved.project.status);
    if (
      expectedLeadEmail &&
      this.normalize(expectedLeadEmail) !== this.normalize(dto.recipientEmail)
    )
      throw this.bad(
        "BROCHURE_LEAD_EMAIL_MISMATCH",
        "The brochure recipient must match the Lead email",
      );
    if (dto.leadId) {
      const lead = await this.repo.leadForShare(
        organizationId,
        projectId,
        dto.leadId,
      );
      if (!lead) throw this.notFound("LEAD_NOT_FOUND", "Lead not found");
      const visible =
        lead.createdBy === actor.id ||
        lead.assignedTo === actor.id ||
        resolved.permissions.includes("leads:read-team") ||
        resolved.permissions.includes("leads:read-all");
      if (!visible)
        throw new ForbiddenException({
          code: "LEAD_ACCESS_DENIED",
          message: "This Lead is not available",
        });
      if (
        this.normalize(String(lead.email ?? "")) !==
        this.normalize(dto.recipientEmail)
      )
        throw this.bad(
          "BROCHURE_LEAD_EMAIL_MISMATCH",
          "The brochure recipient must match the Lead email",
        );
    }
    const { share, url, assets, replayed } = await this.createShare(
      organizationId,
      projectId,
      dto.assetIds,
      "EMAIL",
      dto.idempotencyKey,
      actor,
      resolved.membership.id,
      dto.recipientEmail,
      dto.recipientName,
      dto.leadId,
    );
    if (replayed)
      return {
        share: { ...share, shareUrl: url },
        message: "This brochure share was already processed",
      };
    const names = await this.repo.projectNames(organizationId, projectId);
    const delivery = await this.email.sendBrochureShare(
      share.id,
      dto.recipientEmail,
      {
        recipientName: dto.recipientName,
        organizationName: names?.organizationName ?? "NirmanSite",
        projectName: names?.projectName ?? "Project",
        senderName: actor.name,
        assetCount: assets.length,
        shareUrl: url,
        expiresAt: share.expiresAt,
      },
    );
    await this.repo.updateDelivery({
      shareId: share.id,
      organizationId,
      projectId,
      actorId: actor.id,
      status: delivery,
      event: delivery === "EMAIL_SENT" ? "EMAIL_ACCEPTED" : "EMAIL_FAILED",
    });
    if (dto.leadId)
      await this.repo.addLeadActivity(
        organizationId,
        projectId,
        dto.leadId,
        share.id,
        actor.id,
        delivery,
        assets.length,
      );
    const refreshed = (await this.repo.findShare(share.id))!;
    return {
      share: { ...refreshed, shareUrl: url },
      message:
        delivery === "EMAIL_SENT"
          ? "Brochure email sent"
          : delivery === "MANUAL"
            ? "Lead saved; email delivery needs SMTP configuration"
            : "Lead saved; brochure email failed and can be retried",
    };
  }

  async shareForLead(
    organizationId: string,
    projectId: string,
    lead: { id: string; email?: string | null; customerName: string },
    assetIds: string[],
    actor: AuthenticatedUser,
  ) {
    if (!lead.email)
      throw this.bad(
        "BROCHURE_LEAD_EMAIL_REQUIRED",
        "Email is required to share brochures",
      );
    return this.shareEmail(
      organizationId,
      projectId,
      {
        leadId: lead.id,
        recipientEmail: lead.email,
        recipientName: lead.customerName,
        assetIds,
        idempotencyKey: `lead-${lead.id}-brochure`,
      },
      actor,
      lead.email,
    );
  }

  async retryEmail(
    organizationId: string,
    projectId: string,
    shareId: string,
    actor: AuthenticatedUser,
  ) {
    await this.access.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "brochures:share",
    );
    const share = await this.repo.findShare(shareId);
    if (
      !share ||
      share.organizationId !== organizationId ||
      share.projectId !== projectId ||
      share.channel !== "EMAIL" ||
      !share.recipientEmail
    )
      throw this.notFound("BROCHURE_SHARE_NOT_FOUND", "Email share not found");
    const token = this.token(share.id);
    await this.repo.rotateToken(share.id, this.hash(token));
    const url = this.url(token);
    const names = await this.repo.projectNames(organizationId, projectId);
    const delivery = await this.email.sendBrochureShare(
      share.id,
      share.recipientEmail,
      {
        recipientName: share.recipientName ?? undefined,
        organizationName: names?.organizationName ?? "NirmanSite",
        projectName: names?.projectName ?? "Project",
        senderName: actor.name,
        assetCount: share.assetCount,
        shareUrl: url,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    );
    await this.repo.updateDelivery({
      shareId: share.id,
      organizationId,
      projectId,
      actorId: actor.id,
      status: delivery,
      event: delivery === "EMAIL_SENT" ? "EMAIL_ACCEPTED" : "EMAIL_FAILED",
    });
    return {
      share: { ...(await this.repo.findShare(share.id))!, shareUrl: url },
      message:
        delivery === "EMAIL_SENT"
          ? "Brochure email sent"
          : "Brochure email could not be sent",
    };
  }

  async revoke(
    organizationId: string,
    projectId: string,
    shareId: string,
    actor: AuthenticatedUser,
  ) {
    await this.manage(organizationId, projectId, actor);
    await this.repo.revoke(organizationId, projectId, shareId, actor.id);
  }
  async publicShare(token: string) {
    const record = await this.repo.publicShare(this.hash(token));
    if (!record)
      throw this.notFound(
        "BROCHURE_SHARE_UNAVAILABLE",
        "This brochure link is unavailable",
      );
    void this.repo.addPublicEvent(record.share.id).catch(() => undefined);
    return {
      expiresAt: record.share.expiresAt,
      assets: record.assets.map(
        ({ id, title, description, category, mimeType, byteSize }) => ({
          id,
          title,
          description,
          category,
          mimeType,
          byteSize,
        }),
      ),
    };
  }
  async publicMedia(token: string, assetId: string) {
    const record = await this.repo.publicShare(this.hash(token));
    if (!record || !record.assets.some((asset) => asset.id === assetId))
      throw this.notFound(
        "BROCHURE_SHARE_UNAVAILABLE",
        "This brochure is unavailable",
      );
    const stored = await this.repo.storage(
      record.share.organizationId,
      record.share.projectId,
      assetId,
    );
    if (!stored)
      throw this.notFound("BROCHURE_ASSET_NOT_FOUND", "Brochure not found");
    void this.repo
      .addPublicEvent(record.share.id, assetId)
      .catch(() => undefined);
    return {
      ...(await this.storage.download(String(stored.storageKey))),
      filename: String(stored.originalFilename),
    };
  }

  private async createShare(
    organizationId: string,
    projectId: string,
    assetIds: string[],
    channel: "EMAIL" | "OTHER",
    idempotencyKey: string,
    actor: AuthenticatedUser,
    memberId: string,
    recipientEmail?: string,
    recipientName?: string,
    leadId?: string,
  ) {
    const unique = [...new Set(assetIds)];
    if (!unique.length)
      throw this.bad(
        "BROCHURE_SELECTION_REQUIRED",
        "Select at least one brochure",
      );
    const assets = await this.repo.validateAssets(
      organizationId,
      projectId,
      unique,
    );
    if (assets.length !== unique.length)
      throw this.bad(
        "BROCHURE_SELECTION_INVALID",
        "One or more selected brochures are unavailable",
      );
    const shareId = randomUUID();
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          projectId,
          channel,
          recipientEmail: recipientEmail?.toLowerCase() ?? null,
          leadId: leadId ?? null,
          assetIds: unique,
        }),
      )
      .digest("hex");
    const initialToken = this.token(shareId);
    const created = await this.repo.createShare({
      shareId,
      organizationId,
      projectId,
      leadId,
      channel,
      recipientEmail,
      recipientName,
      assetIds: unique,
      tokenHash: this.hash(initialToken),
      idempotencyKey,
      fingerprint,
      actor: { userId: actor.id, memberId },
      delivery: channel === "EMAIL" ? "PENDING" : "NOT_APPLICABLE",
    });
    const token = this.token(created.id);
    const share = (await this.repo.findShare(created.id))!;
    return { share, url: this.url(token), assets, replayed: created.replayed };
  }
  private async manage(o: string, p: string, actor: AuthenticatedUser) {
    const r = await this.access.resolveProjectAccess(
      actor,
      o,
      p,
      "brochures:manage",
    );
    this.active(r.project.status);
  }
  private active(status: string) {
    if (status !== "ACTIVE")
      throw this.bad(
        "PROJECT_STATUS_INVALID",
        "Brochure changes require an active Project",
      );
  }
  private token(shareId: string) {
    const secret =
      process.env.BROCHURE_SHARE_SECRET?.trim() ||
      process.env.JWT_SECRET?.trim();
    if (!secret) throw new Error("Brochure share signing is not configured");
    return `${shareId}.${createHmac("sha256", secret).update(shareId).digest("base64url")}`;
  }
  private hash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
  private url(token: string) {
    const base =
      process.env.PUBLIC_WEB_APP_URL?.trim() ||
      process.env.FRONTEND_URL?.split(",")[0]?.trim() ||
      "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/brochure-share/${encodeURIComponent(token)}`;
  }
  private normalize(value: string) {
    return value.trim().toLowerCase();
  }
  private safeName(name: string, fallback: string) {
    const safe = name
      .replace(/[\r\n"/\\]/g, "-")
      .trim()
      .slice(0, 255);
    return safe || fallback;
  }
  private extension(mime: string) {
    return (
      (
        {
          "application/pdf": "pdf",
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "video/mp4": "mp4",
          "video/quicktime": "mov",
        } as Record<string, string>
      )[mime] ?? "bin"
    );
  }
  private filenameMatches(filename: string, mime: string) {
    const extension = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    const allowed: Record<string, readonly string[]> = {
      "application/pdf": ["pdf"],
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
      "video/mp4": ["mp4"],
      "video/quicktime": ["mov"],
    };
    return Boolean(extension && allowed[mime]?.includes(extension));
  }
  private signature(buffer: Buffer, mime: string) {
    if (mime === "application/pdf")
      return buffer.subarray(0, 5).toString() === "%PDF-";
    if (mime === "image/jpeg")
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mime === "image/png")
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mime === "image/webp")
      return (
        buffer.subarray(0, 4).toString() === "RIFF" &&
        buffer.subarray(8, 12).toString() === "WEBP"
      );
    return buffer.length >= 12 && buffer.subarray(4, 8).toString() === "ftyp";
  }
  private code(error: unknown) {
    return error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  }
  private bad(code: string, message: string) {
    return new BadRequestException({ code, message });
  }
  private notFound(code: string, message: string) {
    return new NotFoundException({ code, message });
  }
}
