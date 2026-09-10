import { Injectable } from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import type { GalleryEntry, GalleryStatus } from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { QueryGalleryDto, UploadGalleryEntryDto } from "./dto/gallery.dto";

interface GalleryRow extends RowDataPacket {
  id: string;
  organizationId: string;
  projectId: string;
  storageKey: string;
  mimeType: string;
  byteSize: string | number;
  width: number | null;
  height: number | null;
  caption: string | null;
  category: GalleryEntry["category"];
  stage: GalleryEntry["stage"];
  capturedAt: Date;
  status: GalleryStatus;
  version: number;
  uploadedByUserId: string;
  uploadedByMemberId: string;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: Date;
}
interface CountRow extends RowDataPacket {
  total: number;
}

type Actor = { userId: string; memberId: string };
type UploadRecord = {
  dto: UploadGalleryEntryDto;
  actor: Actor;
  fileAssetId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
  workflowMode: "DIRECT" | "REVIEW_REQUIRED";
  status: GalleryStatus;
  fingerprint: string;
};

@Injectable()
export class GalleryRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async findReplay(organizationId: string, idempotencyKey: string) {
    const [row] = await this.database.query<GalleryRow>(
      `${this.select()} WHERE g.organization_id = ? AND g.idempotency_key = ?`,
      [organizationId, idempotencyKey],
    );
    return row
      ? {
          entry: this.map(row),
          fingerprint: row.requestFingerprint,
          storageKey: row.storageKey,
        }
      : null;
  }

  async create(organizationId: string, projectId: string, input: UploadRecord) {
    return this.database.transaction(async (connection) => {
      await this.database.execute(
        `INSERT INTO file_assets (id, organization_id, project_id, context_type, context_id, storage_key,
          original_filename, mime_type, byte_size, checksum_sha256, width, height,
          uploaded_by_user_id, uploaded_by_member_id) VALUES (?, ?, ?, 'GALLERY_ENTRY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.fileAssetId,
          organizationId,
          projectId,
          input.dto.entryId,
          input.storageKey,
          input.originalFilename,
          input.mimeType,
          input.byteSize,
          input.checksum,
          input.dto.width ?? null,
          input.dto.height ?? null,
          input.actor.userId,
          input.actor.memberId,
        ],
        connection,
      );
      await this.database.execute(
        `INSERT INTO gallery_entries (id, organization_id, project_id, file_asset_id, category, stage, caption,
          captured_at, workflow_mode, status, uploaded_by_user_id, uploaded_by_member_id,
          idempotency_key, request_fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.dto.entryId,
          organizationId,
          projectId,
          input.fileAssetId,
          input.dto.category,
          input.dto.stage ?? null,
          input.dto.caption ?? null,
          new Date(input.dto.capturedAt),
          input.workflowMode,
          input.status,
          input.actor.userId,
          input.actor.memberId,
          input.dto.idempotencyKey,
          input.fingerprint,
        ],
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId: input.actor.userId,
          action: "gallery.entry.uploaded",
          entityType: "gallery_entry",
          entityId: input.dto.entryId,
          newValues: {
            category: input.dto.category,
            stage: input.dto.stage ?? null,
            capturedAt: input.dto.capturedAt,
            status: input.status,
            byteSize: input.byteSize,
          },
          metadata: {
            workflowMode: input.workflowMode,
            checksumSha256: input.checksum,
          },
        },
        connection,
      );
      if (input.status === "PENDING") {
        const recipients = await this.notifications.findProjectRecipients(
          organizationId,
          projectId,
          "gallery:approve",
          connection,
        );
        await this.notifications.createMany(
          recipients
            .filter((id) => id !== input.actor.userId)
            .map((userId) => ({
              organizationId,
              projectId,
              userId,
              type: "GALLERY_APPROVAL_REQUIRED",
              title: "Gallery review required",
              message: "A new Project diary photo is waiting for review.",
              referenceType: "gallery_entry",
              referenceId: input.dto.entryId,
              deepLink: "/(app)/gallery",
              dedupeKey: `gallery:${input.dto.entryId}:pending:${userId}`,
            })),
          connection,
        );
      }
      return (await this.findById(
        organizationId,
        projectId,
        input.dto.entryId,
        connection,
      ))!;
    });
  }

  async findMany(
    organizationId: string,
    projectId: string,
    query: QueryGalleryDto,
    actorUserId: string,
    canReview: boolean,
  ) {
    const where = [
      "g.organization_id = ?",
      "g.project_id = ?",
      canReview
        ? "1 = 1"
        : "(g.status = 'APPROVED' OR g.uploaded_by_user_id = ?)",
    ];
    const params: Array<string | number> = [organizationId, projectId];
    if (!canReview) params.push(actorUserId);
    if (query.category) {
      where.push("g.category = ?");
      params.push(query.category);
    }
    if (query.stage) {
      where.push("g.stage = ?");
      params.push(query.stage);
    }
    if (query.status) {
      where.push("g.status = ?");
      params.push(query.status);
    }
    if (query.dateFrom) {
      where.push("g.captured_at >= ?");
      params.push(`${query.dateFrom.slice(0, 10)} 00:00:00`);
    }
    if (query.dateTo) {
      where.push("g.captured_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(query.dateTo.slice(0, 10));
    }
    const clause = where.join(" AND ");
    const [count] = await this.database.query<CountRow>(
      `SELECT COUNT(*) total FROM gallery_entries g WHERE ${clause}`,
      params,
    );
    const rows = await this.database.query<GalleryRow>(
      `${this.select()} WHERE ${clause} ORDER BY g.captured_at DESC, g.created_at DESC, g.id DESC LIMIT ? OFFSET ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    const total = Number(count?.total ?? 0);
    return {
      items: rows.map((row) => this.map(row)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async summary(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    canReview: boolean,
  ) {
    const visible = canReview
      ? "1 = 1"
      : "(g.status = 'APPROVED' OR g.uploaded_by_user_id = ?)";
    const params = canReview
      ? [organizationId, projectId]
      : [organizationId, projectId, actorUserId];
    const [counts] = await this.database.query<
      RowDataPacket & {
        totalApproved: number;
        pendingReview: number;
        uploadedToday: number;
      }
    >(
      `SELECT SUM(g.status = 'APPROVED') totalApproved, SUM(g.status = 'PENDING') pendingReview,
       SUM(DATE(g.created_at) = CURRENT_DATE) uploadedToday FROM gallery_entries g
       WHERE g.organization_id = ? AND g.project_id = ? AND ${visible}`,
      params,
    );
    const [latest] = await this.database.query<GalleryRow>(
      `${this.select()} WHERE g.organization_id = ? AND g.project_id = ? AND g.status = 'APPROVED' ORDER BY g.captured_at DESC, g.id DESC LIMIT 1`,
      [organizationId, projectId],
    );
    return {
      totalApproved: Number(counts?.totalApproved ?? 0),
      pendingReview: Number(counts?.pendingReview ?? 0),
      uploadedToday: Number(counts?.uploadedToday ?? 0),
      latestApproved: latest ? this.map(latest) : null,
    };
  }

  async findById(
    organizationId: string,
    projectId: string,
    entryId: string,
    connection?: DatabaseConnection,
  ) {
    const [row] = await this.database.query<GalleryRow>(
      `${this.select()} WHERE g.id = ? AND g.organization_id = ? AND g.project_id = ?`,
      [entryId, organizationId, projectId],
      connection,
    );
    return row ? this.map(row) : null;
  }

  async findStorageKey(
    organizationId: string,
    projectId: string,
    entryId: string,
  ) {
    const [row] = await this.database.query<
      RowDataPacket & { storageKey: string }
    >(
      `SELECT f.storage_key storageKey FROM gallery_entries g
       INNER JOIN file_assets f ON f.id = g.file_asset_id
       WHERE g.id = ? AND g.organization_id = ? AND g.project_id = ?`,
      [entryId, organizationId, projectId],
    );
    return row?.storageKey ?? null;
  }

  async review(
    organizationId: string,
    projectId: string,
    entryId: string,
    expectedVersion: number,
    status: "APPROVED" | "REJECTED",
    reason: string | null,
    actor: Actor,
  ) {
    return this.database.transaction(async (connection) => {
      const [row] = await this.database.query<GalleryRow>(
        `${this.select()} WHERE g.id = ? AND g.organization_id = ? AND g.project_id = ? FOR UPDATE`,
        [entryId, organizationId, projectId],
        connection,
      );
      if (!row) this.fail("GALLERY_ENTRY_NOT_FOUND");
      if (row.uploadedByUserId === actor.userId)
        this.fail("GALLERY_SELF_REVIEW_FORBIDDEN");
      if (row.status !== "PENDING")
        this.fail("GALLERY_STATUS_TRANSITION_INVALID");
      if (row.version !== expectedVersion)
        this.fail("GALLERY_VERSION_CONFLICT");
      await this.database.execute(
        `UPDATE gallery_entries SET status = ?, rejection_reason = ?, reviewed_by_user_id = ?, reviewed_by_member_id = ?, reviewed_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE id = ? AND organization_id = ? AND project_id = ?`,
        [
          status,
          reason,
          actor.userId,
          actor.memberId,
          entryId,
          organizationId,
          projectId,
        ],
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId: actor.userId,
          action:
            status === "APPROVED"
              ? "gallery.entry.approved"
              : "gallery.entry.rejected",
          entityType: "gallery_entry",
          entityId: entryId,
          oldValues: { status: row.status, version: row.version },
          newValues: {
            status,
            version: row.version + 1,
            rejectionReason: reason,
          },
        },
        connection,
      );
      await this.notifications.createMany(
        [
          {
            organizationId,
            projectId,
            userId: row.uploadedByUserId,
            type:
              status === "APPROVED" ? "GALLERY_APPROVED" : "GALLERY_REJECTED",
            title:
              status === "APPROVED"
                ? "Gallery photo approved"
                : "Gallery photo needs attention",
            message:
              status === "APPROVED"
                ? "Your Project diary photo is now published."
                : "Your Project diary photo was rejected. Review the reason in Gallery.",
            referenceType: "gallery_entry",
            referenceId: entryId,
            deepLink: "/(app)/gallery",
            dedupeKey: `gallery:${entryId}:${status}`,
          },
        ],
        connection,
      );
      return (await this.findById(
        organizationId,
        projectId,
        entryId,
        connection,
      ))!;
    });
  }

  private select() {
    return `SELECT g.id, g.organization_id organizationId, g.project_id projectId,
    f.storage_key storageKey, f.mime_type mimeType, f.byte_size byteSize, f.width, f.height,
    g.caption, g.category, g.stage, g.captured_at capturedAt, g.status, g.version,
    g.uploaded_by_user_id uploadedByUserId, g.uploaded_by_member_id uploadedByMemberId,
    uploader.name uploadedBy, reviewer.name reviewedBy, g.reviewed_at reviewedAt,
    g.rejection_reason rejectionReason, g.idempotency_key idempotencyKey,
    g.request_fingerprint requestFingerprint, g.created_at createdAt
    FROM gallery_entries g INNER JOIN file_assets f ON f.id = g.file_asset_id
    INNER JOIN \`user\` uploader ON uploader.id = g.uploaded_by_user_id
    LEFT JOIN \`user\` reviewer ON reviewer.id = g.reviewed_by_user_id`;
  }

  private map(row: GalleryRow): GalleryEntry {
    return {
      id: row.id,
      organizationId: row.organizationId,
      projectId: row.projectId,
      mediaPath: `/organizations/${row.organizationId}/projects/${row.projectId}/gallery/entries/${row.id}/media`,
      mimeType: row.mimeType,
      byteSize: Number(row.byteSize),
      width: row.width,
      height: row.height,
      caption: row.caption,
      category: row.category,
      stage: row.stage,
      capturedAt: row.capturedAt.toISOString(),
      status: row.status,
      version: row.version,
      uploadedByUserId: row.uploadedByUserId,
      uploadedByMemberId: row.uploadedByMemberId,
      uploadedBy: row.uploadedBy,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt.toISOString(),
    };
  }
  private fail(code: string): never {
    const error = new Error(code) as Error & { code: string };
    error.code = code;
    throw error;
  }
}
