import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DatabaseConnection, QueryParam } from '../../database/database.types';
import { DatabaseService } from '../../database/database.service';
import type { AssignOrganizationSubscriptionDto } from './dto/assign-organization-subscription.dto';
import type { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import type { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import type {
  CapacityCountRow,
  OrganizationSubscriptionRow,
  SubscriptionPlanRow,
} from './types/subscriptions.types';

function mapPlan(row: SubscriptionPlanRow) {
  return {
    id: row.id,
    planKey: row.plan_key,
    name: row.name,
    description: row.description,
    maxActiveProjects: row.max_active_projects,
    maxActiveMembers: row.max_active_members,
    storageLimitBytes:
      row.storage_limit_bytes === null ? null : Number(row.storage_limit_bytes),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPlans() {
    const rows = await this.database.query<SubscriptionPlanRow>(
      'SELECT * FROM subscription_plans ORDER BY is_active DESC, name ASC',
    );
    return rows.map(mapPlan);
  }

  async findPlanById(planId: string) {
    const rows = await this.database.query<SubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ? LIMIT 1',
      [planId],
    );
    return rows[0] ? mapPlan(rows[0]) : null;
  }

  async createPlan(dto: CreateSubscriptionPlanDto, actorId: string) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO subscription_plans
        (id, plan_key, name, description, max_active_projects, max_active_members,
          storage_limit_bytes, is_active, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.planKey.trim().toUpperCase(),
        dto.name.trim(),
        dto.description ?? null,
        dto.maxActiveProjects ?? null,
        dto.maxActiveMembers ?? null,
        dto.storageLimitBytes ?? null,
        dto.isActive === false ? 0 : 1,
        actorId,
        actorId,
      ],
    );
    return this.findPlanById(id);
  }

  async updatePlan(planId: string, dto: UpdateSubscriptionPlanDto, actorId: string) {
    const entries = (
      [
        ['name', dto.name?.trim()],
        ['description', dto.description],
        ['max_active_projects', dto.maxActiveProjects],
        ['max_active_members', dto.maxActiveMembers],
        ['storage_limit_bytes', dto.storageLimitBytes],
        ['is_active', dto.isActive === undefined ? undefined : dto.isActive ? 1 : 0],
      ] as Array<[string, QueryParam | undefined]>
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);
    if (entries.length) {
      await this.database.execute(
        `UPDATE subscription_plans
        SET ${entries.map(([column]) => `${column} = ?`).join(', ')},
          updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?`,
        [...entries.map(([, value]) => value), actorId, planId],
      );
    }
    return this.findPlanById(planId);
  }

  async findOrganizationSubscription(
    organizationId: string,
    connection?: DatabaseConnection,
    lock = false,
  ) {
    const rows = await this.database.query<OrganizationSubscriptionRow>(
      `SELECT
        os.id AS subscription_id, os.organization_id, os.plan_id,
        os.status AS subscription_status, os.starts_at, os.ends_at,
        os.internal_note, os.assigned_by,
        os.created_at AS subscription_created_at,
        os.updated_at AS subscription_updated_at,
        sp.*
      FROM organization_subscriptions os
      INNER JOIN subscription_plans sp ON sp.id = os.plan_id
      WHERE os.organization_id = ?
      LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [organizationId],
      connection,
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.subscription_id,
      organizationId: row.organization_id,
      planId: row.plan_id,
      status: row.subscription_status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      internalNote: row.internal_note,
      assignedBy: row.assigned_by,
      createdAt: row.subscription_created_at,
      updatedAt: row.subscription_updated_at,
      plan: mapPlan(row),
    };
  }

  async assignOrganizationSubscription(
    organizationId: string,
    dto: AssignOrganizationSubscriptionDto,
    actorId: string,
  ) {
    await this.database.execute(
      `INSERT INTO organization_subscriptions
        (id, organization_id, plan_id, status, starts_at, ends_at, internal_note, assigned_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        plan_id = VALUES(plan_id), status = VALUES(status),
        starts_at = VALUES(starts_at), ends_at = VALUES(ends_at),
        internal_note = VALUES(internal_note), assigned_by = VALUES(assigned_by),
        updated_at = CURRENT_TIMESTAMP(3)`,
      [
        randomUUID(),
        organizationId,
        dto.planId,
        dto.status,
        dto.startsAt,
        dto.endsAt ?? null,
        dto.internalNote ?? null,
        actorId,
      ],
    );
    return this.findOrganizationSubscription(organizationId);
  }

  async countCapacity(organizationId: string, connection?: DatabaseConnection) {
    const rows = await this.database.query<CapacityCountRow>(
      `SELECT
        (SELECT COUNT(*) FROM projects WHERE organization_id = ? AND status = 'ACTIVE') AS active_projects,
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = ? AND status = 'ACTIVE') AS active_members`,
      [organizationId, organizationId],
      connection,
    );
    return {
      activeProjects: Number(rows[0]?.active_projects ?? 0),
      activeMembers: Number(rows[0]?.active_members ?? 0),
    };
  }
}

