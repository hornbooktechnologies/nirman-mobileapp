import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";

export type RecordAuditEventInput = {
  organizationId: string;
  projectId?: string | null;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class AuditRepository {
  constructor(private readonly database: DatabaseService) {}

  async record(input: RecordAuditEventInput, connection?: DatabaseConnection) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO audit_events (
        id, organization_id, project_id, actor_user_id, action,
        entity_type, entity_id, old_values, new_values, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.organizationId,
        input.projectId ?? null,
        input.actorUserId,
        input.action,
        input.entityType,
        input.entityId,
        this.serialize(input.oldValues),
        this.serialize(input.newValues),
        this.serialize(input.metadata),
      ],
      connection,
    );
    return id;
  }

  private serialize(value?: Record<string, unknown> | null) {
    return value ? JSON.stringify(value) : null;
  }
}
