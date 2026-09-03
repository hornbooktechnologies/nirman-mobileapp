import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  PROJECT_PROGRESS_STAGES,
  type ProjectProgressStage,
  type ProjectProgressUpdate,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import type {
  QueryProgressHistoryDto,
  RecordProgressUpdateDto,
} from "./dto/progress.dto";

interface ProgressRow extends RowDataPacket {
  id: string;
  organizationId: string;
  projectId: string;
  stage: ProjectProgressStage;
  percentage: string;
  previousPercentage: string | null;
  updateDate: string;
  notes: string | null;
  updatedByUserId: string;
  updatedByMemberId: string;
  updatedBy: string;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

type Actor = { userId: string; memberId: string };

@Injectable()
export class ProgressRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findLatestUpdates(
    organizationId: string,
    projectId: string,
    connection?: DatabaseConnection,
  ) {
    const rows = await this.database.query<ProgressRow>(
      `${this.select()}
       WHERE p.organization_id = ? AND p.project_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM project_progress_updates newer
           WHERE newer.organization_id = p.organization_id
             AND newer.project_id = p.project_id
             AND newer.stage = p.stage
             AND (
               newer.update_date > p.update_date OR
               (newer.update_date = p.update_date AND newer.created_at > p.created_at) OR
               (newer.update_date = p.update_date AND newer.created_at = p.created_at AND newer.id > p.id)
             )
         )
       ORDER BY p.update_date DESC, p.created_at DESC, p.id DESC`,
      [organizationId, projectId],
      connection,
    );
    return rows.map((row) => this.map(row));
  }

  async findHistory(
    organizationId: string,
    projectId: string,
    query: QueryProgressHistoryDto,
  ) {
    const where = ["p.organization_id = ?", "p.project_id = ?"];
    const params: Array<string | number> = [organizationId, projectId];
    if (query.stage) {
      where.push("p.stage = ?");
      params.push(query.stage);
    }
    if (query.dateFrom) {
      where.push("p.update_date >= ?");
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      where.push("p.update_date <= ?");
      params.push(query.dateTo);
    }
    const clause = where.join(" AND ");
    const [count] = await this.database.query<CountRow>(
      `SELECT COUNT(*) total FROM project_progress_updates p WHERE ${clause}`,
      params,
    );
    const rows = await this.database.query<ProgressRow>(
      `${this.select()} WHERE ${clause}
       ORDER BY p.update_date DESC, p.created_at DESC, p.id DESC
       LIMIT ? OFFSET ?`,
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

  async record(
    organizationId: string,
    projectId: string,
    dto: RecordProgressUpdateDto,
    actor: Actor,
  ) {
    const normalized = {
      projectId,
      stage: dto.stage,
      percentage: Number(dto.percentage.toFixed(2)),
      updateDate: dto.updateDate.slice(0, 10),
      notes: dto.notes?.trim() || null,
      expectedPreviousPercentage:
        dto.expectedPreviousPercentage === undefined
          ? null
          : dto.expectedPreviousPercentage,
    };
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");

    return this.database.transaction(async (connection) => {
      const [replay] = await this.database.query<ProgressRow>(
        `${this.select()} WHERE p.organization_id = ? AND p.idempotency_key = ?`,
        [organizationId, dto.idempotencyKey],
        connection,
      );
      if (replay) {
        if (
          replay.projectId !== projectId ||
          replay.requestFingerprint !== fingerprint
        ) {
          this.fail("PROGRESS_IDEMPOTENCY_CONFLICT");
        }
        return this.map(replay);
      }

      const [latest] = await this.database.query<ProgressRow>(
        `${this.select()} WHERE p.organization_id = ? AND p.project_id = ? AND p.stage = ?
         ORDER BY p.update_date DESC, p.created_at DESC, p.id DESC LIMIT 1 FOR UPDATE`,
        [organizationId, projectId, dto.stage],
        connection,
      );
      const previous = latest ? Number(latest.percentage) : null;
      if (
        !this.samePercentage(previous, normalized.expectedPreviousPercentage)
      ) {
        this.fail("PROGRESS_VERSION_CONFLICT");
      }
      if (
        previous !== null &&
        normalized.percentage < previous &&
        !normalized.notes
      ) {
        this.fail("PROGRESS_REGRESSION_NOTE_REQUIRED");
      }

      const id = randomUUID();
      await this.database.execute(
        `INSERT INTO project_progress_updates (
          id, organization_id, project_id, stage, percentage, previous_percentage,
          update_date, notes, updated_by_user_id, updated_by_member_id,
          idempotency_key, request_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          normalized.stage,
          normalized.percentage,
          previous,
          normalized.updateDate,
          normalized.notes,
          actor.userId,
          actor.memberId,
          dto.idempotencyKey,
          fingerprint,
        ],
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId: actor.userId,
          action: "progress.update.recorded",
          entityType: "project_progress_update",
          entityId: id,
          oldValues: { stage: normalized.stage, percentage: previous },
          newValues: {
            stage: normalized.stage,
            percentage: normalized.percentage,
            updateDate: normalized.updateDate,
            notes: normalized.notes,
          },
          metadata: {
            regression: previous !== null && normalized.percentage < previous,
          },
        },
        connection,
      );
      const [created] = await this.database.query<ProgressRow>(
        `${this.select()} WHERE p.id = ? AND p.organization_id = ? AND p.project_id = ?`,
        [id, organizationId, projectId],
        connection,
      );
      if (!created) this.fail("PROGRESS_NOT_FOUND");
      return this.map(created);
    });
  }

  buildSummary(
    organizationId: string,
    projectId: string,
    latest: ProjectProgressUpdate[],
  ) {
    const byStage = new Map(latest.map((update) => [update.stage, update]));
    const stages = PROJECT_PROGRESS_STAGES.map((stage) => {
      const lastUpdate = byStage.get(stage) ?? null;
      return { stage, percentage: lastUpdate?.percentage ?? 0, lastUpdate };
    });
    const overallPercentage = Number(
      (
        stages.reduce((sum, stage) => sum + stage.percentage, 0) /
        PROJECT_PROGRESS_STAGES.length
      ).toFixed(1),
    );
    return {
      organizationId,
      projectId,
      overallPercentage,
      completedStages: stages.filter((stage) => stage.percentage === 100)
        .length,
      updatedStages: stages.filter((stage) => stage.lastUpdate !== null).length,
      stages,
      latestUpdate: latest[0] ?? null,
    };
  }

  private select() {
    return `SELECT p.id, p.organization_id organizationId, p.project_id projectId,
      p.stage, p.percentage, p.previous_percentage previousPercentage,
      p.update_date updateDate, p.notes, p.updated_by_user_id updatedByUserId,
      p.updated_by_member_id updatedByMemberId, u.name updatedBy,
      p.idempotency_key idempotencyKey, p.request_fingerprint requestFingerprint,
      p.created_at createdAt
      FROM project_progress_updates p
      INNER JOIN \`user\` u ON u.id = p.updated_by_user_id`;
  }

  private map(row: ProgressRow): ProjectProgressUpdate {
    return {
      id: row.id,
      organizationId: row.organizationId,
      projectId: row.projectId,
      stage: row.stage,
      percentage: Number(row.percentage),
      previousPercentage:
        row.previousPercentage === null ? null : Number(row.previousPercentage),
      updateDate: row.updateDate,
      notes: row.notes,
      updatedByUserId: row.updatedByUserId,
      updatedByMemberId: row.updatedByMemberId,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private samePercentage(left: number | null, right: number | null) {
    return (
      left === right ||
      (left !== null && right !== null && Math.abs(left - right) < 0.001)
    );
  }

  private fail(code: string): never {
    const error = new Error(code) as Error & { code: string };
    error.code = code;
    throw error;
  }
}
