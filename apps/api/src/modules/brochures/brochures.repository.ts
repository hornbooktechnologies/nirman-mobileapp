import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  BROCHURE_PROJECT_QUOTA_BYTES,
  type BrochureAsset,
  type BrochureShare,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import type { UpdateBrochureDto, UploadBrochureDto } from "./dto/brochures.dto";

type Row = RowDataPacket & Record<string, unknown>;
type Actor = { userId: string; memberId: string };

@Injectable()
export class BrochuresRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(
    organizationId: string,
    projectId: string,
    includeArchived = false,
  ) {
    const rows = await this.database.query<Row>(
      `${this.assetSelect()} WHERE b.organization_id = ? AND b.project_id = ? AND b.status ${includeArchived ? "IN ('ACTIVE','ARCHIVED')" : "= 'ACTIVE'"} ORDER BY b.sort_order, b.created_at DESC`,
      [organizationId, projectId],
    );
    return {
      items: rows.map((row) => this.mapAsset(row)),
      quota: await this.quota(organizationId, projectId),
    };
  }

  async quota(
    organizationId: string,
    projectId: string,
    connection?: DatabaseConnection,
  ) {
    const [row] = await this.database.query<Row>(
      `SELECT COALESCE(SUM(f.byte_size), 0) usedBytes FROM brochure_assets b INNER JOIN file_assets f ON f.id = b.file_asset_id WHERE b.organization_id = ? AND b.project_id = ? AND b.status IN ('ACTIVE','ARCHIVED')`,
      [organizationId, projectId],
      connection,
    );
    const usedBytes = Number(row?.usedBytes ?? 0);
    return {
      usedBytes,
      limitBytes: BROCHURE_PROJECT_QUOTA_BYTES,
      remainingBytes: Math.max(0, BROCHURE_PROJECT_QUOTA_BYTES - usedBytes),
      percentage: Math.min(
        100,
        Math.round((usedBytes / BROCHURE_PROJECT_QUOTA_BYTES) * 100),
      ),
    };
  }

  async findReplay(organizationId: string, key: string) {
    const [row] = await this.database.query<Row>(
      `${this.assetSelect()} WHERE b.organization_id = ? AND b.idempotency_key = ? LIMIT 1`,
      [organizationId, key],
    );
    return row
      ? {
          asset: this.mapAsset(row),
          fingerprint: String(row.requestFingerprint),
        }
      : null;
  }

  async create(
    organizationId: string,
    projectId: string,
    input: {
      dto: UploadBrochureDto;
      actor: Actor;
      fileAssetId: string;
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      byteSize: number;
      checksum: string;
      fingerprint: string;
    },
  ) {
    return this.database.transaction(async (connection) => {
      await this.database.query<Row>(
        `SELECT id FROM projects WHERE id = ? AND organization_id = ? FOR UPDATE`,
        [projectId, organizationId],
        connection,
      );
      const quota = await this.quota(organizationId, projectId, connection);
      if (quota.usedBytes + input.byteSize > BROCHURE_PROJECT_QUOTA_BYTES)
        this.fail("BROCHURE_QUOTA_EXCEEDED");
      await this.database.execute(
        `INSERT INTO file_assets (id, organization_id, project_id, context_type, context_id, storage_key, original_filename, mime_type, byte_size, checksum_sha256, width, height, uploaded_by_user_id, uploaded_by_member_id) VALUES (?, ?, ?, 'BROCHURE_ASSET', ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
        [
          input.fileAssetId,
          organizationId,
          projectId,
          input.dto.assetId,
          input.storageKey,
          input.originalFilename,
          input.mimeType,
          input.byteSize,
          input.checksum,
          input.actor.userId,
          input.actor.memberId,
        ],
        connection,
      );
      await this.database.execute(
        `INSERT INTO brochure_assets (id, organization_id, project_id, file_asset_id, title, description, category, sort_order, uploaded_by_user_id, uploaded_by_member_id, idempotency_key, request_fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.dto.assetId,
          organizationId,
          projectId,
          input.fileAssetId,
          input.dto.title,
          input.dto.description || null,
          input.dto.category,
          input.dto.sortOrder,
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
          action: "brochure.asset.uploaded",
          entityType: "brochure_asset",
          entityId: input.dto.assetId,
          newValues: {
            title: input.dto.title,
            category: input.dto.category,
            byteSize: input.byteSize,
            mimeType: input.mimeType,
          },
        },
        connection,
      );
      return (await this.findById(
        organizationId,
        projectId,
        input.dto.assetId,
        connection,
      ))!;
    });
  }

  async findById(
    organizationId: string,
    projectId: string,
    assetId: string,
    connection?: DatabaseConnection,
  ) {
    const [row] = await this.database.query<Row>(
      `${this.assetSelect()} WHERE b.organization_id = ? AND b.project_id = ? AND b.id = ? LIMIT 1`,
      [organizationId, projectId, assetId],
      connection,
    );
    return row ? this.mapAsset(row) : null;
  }

  async storage(organizationId: string, projectId: string, assetId: string) {
    const [row] = await this.database.query<Row>(
      `SELECT b.status, f.storage_key storageKey, f.mime_type mimeType, f.original_filename originalFilename FROM brochure_assets b INNER JOIN file_assets f ON f.id = b.file_asset_id WHERE b.organization_id = ? AND b.project_id = ? AND b.id = ?`,
      [organizationId, projectId, assetId],
    );
    return row ?? null;
  }

  async update(
    organizationId: string,
    projectId: string,
    assetId: string,
    dto: UpdateBrochureDto,
    actorId: string,
  ) {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];
    for (const [key, column] of Object.entries({
      title: "title",
      description: "description",
      category: "category",
      sortOrder: "sort_order",
    })) {
      const value = dto[key as keyof UpdateBrochureDto];
      if (value !== undefined) {
        fields.push(`${column} = ?`);
        values.push(value === "" ? null : value);
      }
    }
    if (fields.length)
      await this.database.execute(
        `UPDATE brochure_assets SET ${fields.join(", ")} WHERE organization_id = ? AND project_id = ? AND id = ? AND status <> 'DELETED'`,
        [...values, organizationId, projectId, assetId],
      );
    await this.audit.record({
      organizationId,
      projectId,
      actorUserId: actorId,
      action: "brochure.asset.updated",
      entityType: "brochure_asset",
      entityId: assetId,
      newValues: dto as Record<string, unknown>,
    });
    return this.findById(organizationId, projectId, assetId);
  }

  async setStatus(
    organizationId: string,
    projectId: string,
    assetId: string,
    status: "ACTIVE" | "ARCHIVED" | "DELETED",
    actorId: string,
  ) {
    const stamp =
      status === "ARCHIVED"
        ? ", archived_at = CURRENT_TIMESTAMP(3), archived_by_user_id = ?"
        : status === "DELETED"
          ? ", deleted_at = CURRENT_TIMESTAMP(3), deleted_by_user_id = ?"
          : ", archived_at = NULL, archived_by_user_id = NULL";
    const params =
      status === "ACTIVE"
        ? [status, organizationId, projectId, assetId]
        : [status, actorId, organizationId, projectId, assetId];
    const result = await this.database.execute(
      `UPDATE brochure_assets SET status = ?${stamp} WHERE organization_id = ? AND project_id = ? AND id = ? AND status <> 'DELETED'`,
      params,
    );
    if (!result.affectedRows) this.fail("BROCHURE_ASSET_NOT_FOUND");
    await this.audit.record({
      organizationId,
      projectId,
      actorUserId: actorId,
      action: `brochure.asset.${status.toLowerCase()}`,
      entityType: "brochure_asset",
      entityId: assetId,
      newValues: { status },
    });
    return this.findById(organizationId, projectId, assetId);
  }

  async validateAssets(
    organizationId: string,
    projectId: string,
    ids: string[],
  ) {
    const placeholders = ids.map(() => "?").join(",");
    const rows = await this.database.query<Row>(
      `${this.assetSelect()} WHERE b.organization_id = ? AND b.project_id = ? AND b.status = 'ACTIVE' AND b.id IN (${placeholders})`,
      [organizationId, projectId, ...ids],
    );
    const byId = new Map(
      rows.map((row) => [String(row.id), this.mapAsset(row)]),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((v): v is BrochureAsset => Boolean(v));
  }

  async leadForShare(
    organizationId: string,
    projectId: string,
    leadId: string,
  ) {
    const [row] = await this.database.query<Row>(
      `SELECT id, email, customer_name customerName, created_by createdBy, assigned_to assignedTo FROM sales_leads WHERE organization_id = ? AND project_id = ? AND id = ?`,
      [organizationId, projectId, leadId],
    );
    return row ?? null;
  }

  async projectNames(organizationId: string, projectId: string) {
    const [row] = await this.database.query<Row>(
      `SELECT o.name organizationName, p.name projectName FROM projects p INNER JOIN organizations o ON o.id = p.organization_id WHERE p.organization_id = ? AND p.id = ?`,
      [organizationId, projectId],
    );
    return row
      ? {
          organizationName: String(row.organizationName),
          projectName: String(row.projectName),
        }
      : null;
  }

  async addLeadActivity(
    organizationId: string,
    projectId: string,
    leadId: string,
    shareId: string,
    actorId: string,
    delivery: string,
    assetCount: number,
  ) {
    await this.database.execute(
      `INSERT INTO sales_activities (id, organization_id, project_id, lead_id, activity_type, summary, details_json, actor_id, occurred_at) VALUES (?, ?, ?, ?, 'BROCHURE_SHARED', 'Marketing brochures shared', ?, ?, CURRENT_TIMESTAMP(3))`,
      [
        randomUUID(),
        organizationId,
        projectId,
        leadId,
        JSON.stringify({
          shareId,
          channel: "EMAIL",
          deliveryStatus: delivery,
          assetCount,
        }),
        actorId,
      ],
    );
  }

  async createShare(input: {
    shareId: string;
    organizationId: string;
    projectId: string;
    leadId?: string;
    channel: "EMAIL" | "OTHER";
    recipientEmail?: string;
    recipientName?: string;
    assetIds: string[];
    tokenHash: string;
    idempotencyKey: string;
    fingerprint: string;
    actor: Actor;
    delivery: string;
  }) {
    return this.database.transaction(async (connection) => {
      const [replay] = await this.database.query<Row>(
        `SELECT id, request_fingerprint fingerprint FROM brochure_shares WHERE organization_id = ? AND idempotency_key = ? FOR UPDATE`,
        [input.organizationId, input.idempotencyKey],
        connection,
      );
      if (replay) {
        if (replay.fingerprint !== input.fingerprint)
          this.fail("BROCHURE_IDEMPOTENCY_CONFLICT");
        return { id: String(replay.id), replayed: true };
      }
      const id = input.shareId;
      await this.database.execute(
        `INSERT INTO brochure_shares (id, organization_id, project_id, lead_id, channel, recipient_email_normalized, recipient_name, token_hash, email_delivery_status, expires_at, created_by_user_id, created_by_member_id, idempotency_key, request_fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY), ?, ?, ?, ?)`,
        [
          id,
          input.organizationId,
          input.projectId,
          input.leadId ?? null,
          input.channel,
          input.recipientEmail?.toLowerCase() ?? null,
          input.recipientName ?? null,
          input.tokenHash,
          input.delivery,
          input.actor.userId,
          input.actor.memberId,
          input.idempotencyKey,
          input.fingerprint,
        ],
        connection,
      );
      for (let index = 0; index < input.assetIds.length; index++)
        await this.database.execute(
          `INSERT INTO brochure_share_assets (share_id, brochure_asset_id, position) VALUES (?, ?, ?)`,
          [id, input.assetIds[index], index],
          connection,
        );
      await this.audit.record(
        {
          organizationId: input.organizationId,
          projectId: input.projectId,
          actorUserId: input.actor.userId,
          action: "brochure.share.created",
          entityType: "brochure_share",
          entityId: id,
          newValues: {
            channel: input.channel,
            leadId: input.leadId ?? null,
            assetCount: input.assetIds.length,
          },
        },
        connection,
      );
      return { id, replayed: false };
    });
  }

  async findShare(shareId: string) {
    const [row] = await this.database.query<Row>(
      `${this.shareSelect()} WHERE s.id = ? GROUP BY s.id`,
      [shareId],
    );
    return row ? this.mapShare(row) : null;
  }

  async listShares(organizationId: string, projectId: string) {
    const rows = await this.database.query<Row>(
      `${this.shareSelect()} WHERE s.organization_id = ? AND s.project_id = ? GROUP BY s.id ORDER BY s.created_at DESC LIMIT 100`,
      [organizationId, projectId],
    );
    return rows.map((row) => this.mapShare(row));
  }

  async publicShare(tokenHash: string) {
    const [share] = await this.database.query<Row>(
      `${this.shareSelect()} WHERE s.token_hash = ? AND s.status = 'ACTIVE' AND s.expires_at > CURRENT_TIMESTAMP(3) GROUP BY s.id`,
      [tokenHash],
    );
    if (!share) return null;
    const assets = await this.validateAssets(
      String(share.organizationId),
      String(share.projectId),
      this.assetIds(share.assetIds),
    );
    return { share: this.mapShare(share), assets };
  }

  async updateDelivery(input: {
    shareId: string;
    organizationId: string;
    projectId: string;
    actorId: string;
    status: string;
    event: "EMAIL_ACCEPTED" | "EMAIL_FAILED";
  }) {
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `UPDATE brochure_shares SET email_delivery_status = ?, last_email_attempt_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [input.status, input.shareId],
        connection,
      );
      await this.database.execute(
        `INSERT INTO brochure_share_events (id, share_id, event_type) VALUES (?, ?, ?)`,
        [randomUUID(), input.shareId, input.event],
        connection,
      );
      await this.audit.record(
        {
          organizationId: input.organizationId,
          projectId: input.projectId,
          actorUserId: input.actorId,
          action: "brochure.share.email_attempted",
          entityType: "brochure_share",
          entityId: input.shareId,
          newValues: { deliveryStatus: input.status },
        },
        connection,
      );
      await this.audit.record(
        {
          organizationId: input.organizationId,
          projectId: input.projectId,
          actorUserId: input.actorId,
          action:
            input.event === "EMAIL_ACCEPTED"
              ? "brochure.share.email_accepted"
              : "brochure.share.email_failed",
          entityType: "brochure_share",
          entityId: input.shareId,
          newValues: { deliveryStatus: input.status },
        },
        connection,
      );
    });
  }

  async rotateToken(shareId: string, tokenHash: string) {
    await this.database.execute(
      `UPDATE brochure_shares SET token_hash = ?, status = 'ACTIVE', expires_at = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY) WHERE id = ?`,
      [tokenHash, shareId],
    );
  }
  async revoke(
    organizationId: string,
    projectId: string,
    shareId: string,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE brochure_shares SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP(3), revoked_by_user_id = ? WHERE id = ? AND organization_id = ? AND project_id = ? AND status = 'ACTIVE'`,
      [actorId, shareId, organizationId, projectId],
    );
    if (!result.affectedRows) this.fail("BROCHURE_SHARE_NOT_FOUND");
    await this.audit.record({
      organizationId,
      projectId,
      actorUserId: actorId,
      action: "brochure.share.revoked",
      entityType: "brochure_share",
      entityId: shareId,
    });
  }
  async addPublicEvent(shareId: string, assetId?: string) {
    await this.database.execute(
      `INSERT INTO brochure_share_events (id, share_id, brochure_asset_id, event_type) VALUES (?, ?, ?, ?)`,
      [
        randomUUID(),
        shareId,
        assetId ?? null,
        assetId ? "ASSET_OPENED" : "LINK_OPENED",
      ],
    );
  }

  private assetSelect() {
    return `SELECT b.id, b.organization_id organizationId, b.project_id projectId, b.title, b.description, b.category, b.status, b.sort_order sortOrder, b.request_fingerprint requestFingerprint, f.mime_type mimeType, f.byte_size byteSize, f.original_filename originalFilename, uploader.name uploadedBy, b.created_at createdAt, b.updated_at updatedAt FROM brochure_assets b INNER JOIN file_assets f ON f.id = b.file_asset_id INNER JOIN \`user\` uploader ON uploader.id = b.uploaded_by_user_id`;
  }
  private shareSelect() {
    return `SELECT s.id, s.organization_id organizationId, s.project_id projectId, s.lead_id leadId, s.channel, s.recipient_email_normalized recipientEmail, s.recipient_name recipientName, s.status, s.email_delivery_status emailDeliveryStatus, s.expires_at expiresAt, s.created_at createdAt, JSON_ARRAYAGG(sa.brochure_asset_id) assetIds FROM brochure_shares s INNER JOIN brochure_share_assets sa ON sa.share_id = s.id`;
  }
  private mapAsset(row: Row): BrochureAsset {
    return {
      id: String(row.id),
      organizationId: String(row.organizationId),
      projectId: String(row.projectId),
      title: String(row.title),
      description: row.description ? String(row.description) : null,
      category: row.category as BrochureAsset["category"],
      status: row.status as BrochureAsset["status"],
      mimeType: String(row.mimeType),
      byteSize: Number(row.byteSize),
      originalFilename: String(row.originalFilename),
      mediaPath: `/organizations/${row.organizationId}/projects/${row.projectId}/brochures/${row.id}/media`,
      sortOrder: Number(row.sortOrder),
      uploadedBy: String(row.uploadedBy),
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    };
  }
  private mapShare(row: Row): BrochureShare {
    const ids = this.assetIds(row.assetIds);
    return {
      id: String(row.id),
      organizationId: String(row.organizationId),
      projectId: String(row.projectId),
      leadId: row.leadId ? String(row.leadId) : null,
      channel: row.channel as BrochureShare["channel"],
      recipientEmail: row.recipientEmail ? String(row.recipientEmail) : null,
      recipientName: row.recipientName ? String(row.recipientName) : null,
      status: row.status as BrochureShare["status"],
      emailDeliveryStatus:
        row.emailDeliveryStatus as BrochureShare["emailDeliveryStatus"],
      assetIds: ids,
      assetCount: ids.length,
      shareUrl: null,
      expiresAt: (row.expiresAt as Date).toISOString(),
      createdAt: (row.createdAt as Date).toISOString(),
    };
  }
  private assetIds(value: unknown) {
    try {
      const parsed = Buffer.isBuffer(value)
        ? (JSON.parse(value.toString("utf8")) as unknown)
        : typeof value === "string"
          ? (JSON.parse(value) as unknown)
          : value;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  private fail(code: string): never {
    throw Object.assign(new Error(code), { code });
  }
}
