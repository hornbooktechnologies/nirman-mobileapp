import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { PermissionKey } from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";

export type CreateNotificationInput = {
  organizationId: string;
  projectId?: string | null;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: string | null;
  deepLink?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupeKey: string;
};

interface NotificationRow extends RowDataPacket {
  id: string;
  organizationId: string;
  projectId: string | null;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  deepLink: string | null;
  metadata: string | Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface RecipientRow extends RowDataPacket {
  user_id: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createMany(
    inputs: readonly CreateNotificationInput[],
    connection?: DatabaseConnection,
  ) {
    for (const input of inputs) {
      await this.database.execute(
        `INSERT INTO notifications (
          id, organization_id, project_id, user_id, type, title, message,
          reference_type, reference_id, deep_link, metadata, dedupe_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE id = id`,
        [
          randomUUID(),
          input.organizationId,
          input.projectId ?? null,
          input.userId,
          input.type,
          input.title,
          input.message,
          input.referenceType ?? null,
          input.referenceId ?? null,
          input.deepLink ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
          input.dedupeKey,
        ],
        connection,
      );
    }
  }

  async findProjectRecipients(
    organizationId: string,
    projectId: string,
    permission: PermissionKey,
    connection?: DatabaseConnection,
  ) {
    const [resource, action] = permission.split(":");
    const rows = await this.database.query<RecipientRow>(
      `SELECT DISTINCT om.user_id
       FROM organization_members om
       INNER JOIN permission p
         ON p.roleId = om.role_id AND p.resource = ? AND p.action = ?
       LEFT JOIN project_members pm
         ON pm.organization_id = om.organization_id
        AND pm.project_id = ?
        AND pm.member_id = om.id
        AND pm.status = 'ACTIVE'
        AND (pm.starts_on IS NULL OR pm.starts_on <= CURRENT_DATE)
        AND (pm.ends_on IS NULL OR pm.ends_on >= CURRENT_DATE)
       WHERE om.organization_id = ?
         AND om.status = 'ACTIVE'
         AND (
           om.organization_wide_project_access = 1
           OR (
             pm.id IS NOT NULL
             AND (
               pm.permission_mode = 'ROLE_DEFAULT'
               OR EXISTS (
                 SELECT 1 FROM project_member_permission_grants pmpg
                 WHERE pmpg.organization_id = om.organization_id
                   AND pmpg.project_id = pm.project_id
                   AND pmpg.member_id = om.id
                   AND pmpg.permission_key = ?
               )
             )
           )
         )`,
      [resource, action, projectId, organizationId, permission],
      connection,
    );
    return rows.map((row) => row.user_id);
  }

  async findMany(
    organizationId: string,
    userId: string,
    page: number,
    pageSize: number,
    unreadOnly: boolean,
  ) {
    const where = `organization_id = ? AND user_id = ?${unreadOnly ? " AND read_at IS NULL" : ""}`;
    const [count] = await this.database.query<CountRow>(
      `SELECT COUNT(*) total FROM notifications WHERE ${where}`,
      [organizationId, userId],
    );
    const rows = await this.database.query<NotificationRow>(
      `SELECT id, organization_id organizationId, project_id projectId,
        user_id userId, type, title, message, reference_type referenceType,
        reference_id referenceId, deep_link deepLink, metadata,
        read_at readAt, created_at createdAt
       FROM notifications
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [organizationId, userId, pageSize, (page - 1) * pageSize],
    );
    return {
      items: rows.map((row) => ({
        ...row,
        metadata: this.parseMetadata(row.metadata),
      })),
      pagination: {
        page,
        pageSize,
        total: Number(count?.total ?? 0),
        totalPages: Math.ceil(Number(count?.total ?? 0) / pageSize),
      },
    };
  }

  async markRead(
    organizationId: string,
    userId: string,
    notificationId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
       WHERE id = ? AND organization_id = ? AND user_id = ?`,
      [notificationId, organizationId, userId],
    );
    return result.affectedRows > 0;
  }

  async markAllRead(organizationId: string, userId: string) {
    const result = await this.database.execute(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3)
       WHERE organization_id = ? AND user_id = ? AND read_at IS NULL`,
      [organizationId, userId],
    );
    return result.affectedRows;
  }

  private parseMetadata(value: NotificationRow["metadata"]) {
    if (!value || typeof value === "object") return value;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
