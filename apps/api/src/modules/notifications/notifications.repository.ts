import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type {
  NotificationImportance,
  NotificationLocale,
  PermissionKey,
  PushDevicePlatform,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";

export type CreateNotificationInput = {
  organizationId: string;
  projectId?: string | null;
  userId: string;
  type: string;
  title: string;
  message: string;
  importance?: NotificationImportance;
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
  importance: NotificationImportance;
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
interface DeviceRow extends RowDataPacket {
  id: string;
  platform: PushDevicePlatform;
  locale: NotificationLocale;
  active: number;
  lastRegisteredAt: Date;
}
export interface PendingPushDelivery extends RowDataPacket {
  id: string;
  notificationId: string;
  deviceId: string;
  expoPushToken: string;
  locale: NotificationLocale;
  type: string;
  title: string;
  message: string;
  deepLink: string | null;
  organizationId: string;
  projectId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  importance: NotificationImportance;
  attemptCount: number;
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
        `INSERT INTO notifications (id, organization_id, project_id, user_id, type, title, message, importance, reference_type, reference_id, deep_link, metadata, dedupe_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id`,
        [
          randomUUID(),
          input.organizationId,
          input.projectId ?? null,
          input.userId,
          input.type,
          input.title,
          input.message,
          input.importance ??
            (input.type.endsWith("_REQUIRED") ? "HIGH" : "NORMAL"),
          input.referenceType ?? null,
          input.referenceId ?? null,
          input.deepLink ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
          input.dedupeKey,
        ],
        connection,
      );
      await this.database.execute(
        `INSERT IGNORE INTO notification_push_deliveries (id, notification_id, device_id)
         SELECT UUID(), n.id, d.id FROM notifications n
         INNER JOIN notification_push_devices d ON d.organization_id = n.organization_id AND d.user_id = n.user_id AND d.active = 1
         WHERE n.organization_id = ? AND n.user_id = ? AND n.dedupe_key = ?`,
        [input.organizationId, input.userId, input.dedupeKey],
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
      `SELECT DISTINCT om.user_id FROM organization_members om
       INNER JOIN permission p ON p.roleId = om.role_id AND p.resource = ? AND p.action = ?
       LEFT JOIN project_members pm ON pm.organization_id = om.organization_id AND pm.project_id = ? AND pm.member_id = om.id AND pm.status = 'ACTIVE'
        AND (pm.starts_on IS NULL OR pm.starts_on <= CURRENT_DATE) AND (pm.ends_on IS NULL OR pm.ends_on >= CURRENT_DATE)
       WHERE om.organization_id = ? AND om.status = 'ACTIVE' AND (om.organization_wide_project_access = 1 OR (pm.id IS NOT NULL AND
        (pm.permission_mode = 'ROLE_DEFAULT' OR EXISTS (SELECT 1 FROM project_member_permission_grants pmpg WHERE pmpg.organization_id = om.organization_id
          AND pmpg.project_id = pm.project_id AND pmpg.member_id = om.id AND pmpg.permission_key = ?))))`,
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
      `SELECT id, organization_id organizationId, project_id projectId, user_id userId, type, title, message, importance,
        reference_type referenceType, reference_id referenceId, deep_link deepLink, metadata, read_at readAt, created_at createdAt
       FROM notifications WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [organizationId, userId, pageSize, (page - 1) * pageSize],
    );
    const total = Number(count?.total ?? 0);
    return {
      items: rows.map((row) => ({
        ...row,
        metadata: this.parseMetadata(row.metadata),
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async summary(organizationId: string, userId: string) {
    const [row] = await this.database.query<CountRow>(
      "SELECT COUNT(*) total FROM notifications WHERE organization_id = ? AND user_id = ? AND read_at IS NULL",
      [organizationId, userId],
    );
    return { unreadCount: Number(row?.total ?? 0) };
  }

  async markRead(
    organizationId: string,
    userId: string,
    notificationId: string,
  ) {
    const result = await this.database.execute(
      "UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3)) WHERE id = ? AND organization_id = ? AND user_id = ?",
      [notificationId, organizationId, userId],
    );
    return result.affectedRows > 0;
  }
  async markAllRead(organizationId: string, userId: string) {
    const result = await this.database.execute(
      "UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE organization_id = ? AND user_id = ? AND read_at IS NULL",
      [organizationId, userId],
    );
    return result.affectedRows;
  }

  async registerDevice(
    organizationId: string,
    userId: string,
    expoPushToken: string,
    platform: PushDevicePlatform,
    locale: NotificationLocale,
  ) {
    await this.database.execute(
      "UPDATE notification_push_devices SET active = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE expo_push_token = ? AND NOT (organization_id = ? AND user_id = ?)",
      [expoPushToken, organizationId, userId],
    );
    await this.database.execute(
      `INSERT INTO notification_push_devices (id, organization_id, user_id, expo_push_token, platform, locale, active, last_registered_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE platform = VALUES(platform), locale = VALUES(locale), active = 1,
       last_registered_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)`,
      [randomUUID(), organizationId, userId, expoPushToken, platform, locale],
    );
    const [row] = await this.database.query<DeviceRow>(
      "SELECT id, platform, locale, active, last_registered_at lastRegisteredAt FROM notification_push_devices WHERE organization_id = ? AND user_id = ? AND expo_push_token = ?",
      [organizationId, userId, expoPushToken],
    );
    if (!row) throw new Error("NOTIFICATION_DEVICE_NOT_FOUND");
    return {
      id: row.id,
      platform: row.platform,
      locale: row.locale,
      active: Boolean(row.active),
      lastRegisteredAt: row.lastRegisteredAt.toISOString(),
    };
  }
  async deactivateDevice(
    organizationId: string,
    userId: string,
    deviceId: string,
  ) {
    const result = await this.database.execute(
      "UPDATE notification_push_devices SET active = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND organization_id = ? AND user_id = ?",
      [deviceId, organizationId, userId],
    );
    return result.affectedRows > 0;
  }

  async claimPushDeliveries(limit = 50) {
    return this.database.transaction(async (connection) => {
      const rows = await this.database.query<PendingPushDelivery>(
        `SELECT pd.id, pd.notification_id notificationId, pd.device_id deviceId, d.expo_push_token expoPushToken, d.locale,
          n.type, n.title, n.message, n.deep_link deepLink, n.organization_id organizationId, n.project_id projectId,
          n.reference_type referenceType, n.reference_id referenceId, n.importance, pd.attempt_count attemptCount
         FROM notification_push_deliveries pd INNER JOIN notification_push_devices d ON d.id = pd.device_id AND d.active = 1
         INNER JOIN notifications n ON n.id = pd.notification_id
         WHERE ((pd.status IN ('PENDING','RETRY') AND pd.next_attempt_at <= CURRENT_TIMESTAMP(3)) OR
           (pd.status = 'PROCESSING' AND pd.locked_at < DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 5 MINUTE)))
         ORDER BY pd.next_attempt_at, pd.created_at LIMIT ? FOR UPDATE`,
        [limit],
        connection,
      );
      for (const row of rows)
        await this.database.execute(
          "UPDATE notification_push_deliveries SET status = 'PROCESSING', locked_at = CURRENT_TIMESTAMP(3), attempt_count = attempt_count + 1 WHERE id = ?",
          [row.id],
          connection,
        );
      return rows;
    });
  }
  async completePushDelivery(id: string, ticketId: string | null) {
    await this.database.execute(
      "UPDATE notification_push_deliveries SET status = 'SENT', provider_ticket_id = ?, delivered_at = CURRENT_TIMESTAMP(3), locked_at = NULL, last_error = NULL WHERE id = ?",
      [ticketId, id],
    );
  }
  async failPushDelivery(
    id: string,
    deviceId: string,
    attemptCount: number,
    error: string,
    permanent: boolean,
  ) {
    const failed = permanent || attemptCount + 1 >= 5;
    await this.database.execute(
      "UPDATE notification_push_deliveries SET status = ?, last_error = ?, locked_at = NULL, next_attempt_at = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? MINUTE) WHERE id = ?",
      [
        failed ? "FAILED" : "RETRY",
        error.slice(0, 1000),
        Math.min(60, 2 ** Math.min(attemptCount + 1, 6)),
        id,
      ],
    );
    if (permanent)
      await this.database.execute(
        "UPDATE notification_push_devices SET active = 0 WHERE id = ?",
        [deviceId],
      );
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
