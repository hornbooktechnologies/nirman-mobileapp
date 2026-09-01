import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import type {
  BlockUnitDto,
  CancelBookingDto,
  CreateBookingDto,
  CreateFollowUpDto,
  CreateLeadDto,
  CreateSiteVisitDto,
  CreateUnitHoldRequestDto,
  CreateUnitInterestDto,
  CreateUnitDto,
  DecideUnitHoldRequestDto,
  QuerySalesDto,
  QueryScheduledSalesDto,
  QueryUnitsDto,
  UpdateFollowUpDto,
  UpdateLeadDto,
  UpdateSiteVisitDto,
  UpdateUnitDto,
} from "./dto/sales.dto";

type Row = RowDataPacket & Record<string, unknown>;
export type LeadVisibility = "OWN" | "TEAM" | "ALL";
export interface SalesLeadRecord {
  id: string;
  organizationId: string;
  projectId: string;
  customerName: string;
  primaryMobile: string;
  createdBy: string;
  assignedTo: string | null;
  currentStage: string;
  budgetMin: number | null;
  budgetMax: number | null;
  [key: string]: unknown;
}

@Injectable()
export class SalesRepository {
  constructor(private readonly database: DatabaseService) {}

  async isEligibleAssignee(
    organizationId: string,
    projectId: string,
    userId: string,
  ) {
    const rows = await this.database.query<Row>(
      `SELECT om.id
       FROM organization_members om
       LEFT JOIN project_members pm
         ON pm.organization_id = om.organization_id AND pm.member_id = om.id
        AND pm.project_id = ? AND pm.status = 'ACTIVE'
        AND (pm.starts_on IS NULL OR pm.starts_on <= CURRENT_DATE())
        AND (pm.ends_on IS NULL OR pm.ends_on >= CURRENT_DATE())
       WHERE om.organization_id = ? AND om.user_id = ? AND om.status = 'ACTIVE'
         AND (om.organization_wide_project_access = 1 OR pm.id IS NOT NULL)
       LIMIT 1`,
      [projectId, organizationId, userId],
    );
    return Boolean(rows[0]);
  }

  async listLeads(
    organizationId: string,
    projectId: string,
    query: QuerySalesDto,
    visibility: LeadVisibility,
    actorId: string,
  ) {
    const where = ["l.organization_id = ?", "l.project_id = ?"];
    const params: (string | number)[] = [organizationId, projectId];
    if (visibility === "OWN") {
      where.push("(l.assigned_to = ? OR l.created_by = ?)");
      params.push(actorId, actorId);
    } else if (visibility === "TEAM") {
      where.push(`(l.assigned_to IN (
        SELECT om.user_id FROM organization_members om
        INNER JOIN project_members pm ON pm.member_id = om.id AND pm.organization_id = om.organization_id
        WHERE om.organization_id = ? AND pm.project_id = ? AND om.status = 'ACTIVE' AND pm.status = 'ACTIVE'
          AND (pm.starts_on IS NULL OR pm.starts_on <= CURRENT_DATE())
          AND (pm.ends_on IS NULL OR pm.ends_on >= CURRENT_DATE())
      ) OR l.assigned_to IS NULL)`);
      params.push(organizationId, projectId);
    }
    if (query.stage) {
      where.push("l.current_stage = ?");
      params.push(query.stage);
    }
    if (query.assignedTo) {
      where.push("l.assigned_to = ?");
      params.push(query.assignedTo);
    }
    if (query.search) {
      where.push(
        "(l.customer_name LIKE ? OR l.primary_mobile LIKE ? OR l.email LIKE ?)",
      );
      const term = `%${query.search}%`;
      params.push(term, term, term);
    }
    const offset = (query.page - 1) * query.limit;
    const countRows = await this.database.query<Row>(
      `SELECT COUNT(*) total FROM sales_leads l WHERE ${where.join(" AND ")}`,
      params,
    );
    const rows = await this.database.query<Row>(
      `${this.leadSelect()} WHERE ${where.join(" AND ")}
       ORDER BY l.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, query.limit, offset],
    );
    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: rows.map((row) => this.mapLead(row)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async findLead(
    organizationId: string,
    projectId: string,
    leadId: string,
    connection?: DatabaseConnection,
  ) {
    const rows = await this.database.query<Row>(
      `${this.leadSelect()} WHERE l.organization_id = ? AND l.project_id = ? AND l.id = ? LIMIT 1`,
      [organizationId, projectId, leadId],
      connection,
    );
    return rows[0] ? this.mapLead(rows[0]) : null;
  }

  async createLead(
    organizationId: string,
    projectId: string,
    dto: CreateLeadDto,
    actorId: string,
    assigneeId: string | null,
  ) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `INSERT INTO sales_leads (
          id, organization_id, project_id, customer_name, primary_mobile, alternate_mobile, email,
          preferred_unit_type, budget_min, budget_max, purchase_purpose, purchase_timeline,
          source, source_detail, created_by, assigned_to, current_stage, priority, interested_unit_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          dto.customerName,
          dto.primaryMobile,
          dto.alternateMobile ?? null,
          dto.email ?? null,
          dto.preferredUnitType ?? null,
          dto.budgetMin ?? null,
          dto.budgetMax ?? null,
          dto.purchasePurpose ?? null,
          dto.purchaseTimeline ?? null,
          dto.source,
          dto.sourceDetail ?? null,
          actorId,
          assigneeId,
          dto.priority ?? "MEDIUM",
          dto.interestedUnitId ?? null,
        ],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        id,
        "LEAD_CREATED",
        "Lead created",
        actorId,
        { source: dto.source },
      );
      if (assigneeId) {
        await this.insertAssignment(
          connection,
          organizationId,
          projectId,
          id,
          null,
          assigneeId,
          actorId,
        );
        await this.addActivity(
          connection,
          organizationId,
          projectId,
          id,
          "LEAD_ASSIGNED",
          "Lead assigned",
          actorId,
          { assignedTo: assigneeId },
        );
      }
    });
    return this.findLead(organizationId, projectId, id);
  }

  async updateLead(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: UpdateLeadDto,
    actorId: string,
  ) {
    const columns: Record<string, string> = {
      customerName: "customer_name",
      primaryMobile: "primary_mobile",
      alternateMobile: "alternate_mobile",
      email: "email",
      preferredUnitType: "preferred_unit_type",
      budgetMin: "budget_min",
      budgetMax: "budget_max",
      purchasePurpose: "purchase_purpose",
      purchaseTimeline: "purchase_timeline",
      source: "source",
      sourceDetail: "source_detail",
      currentStage: "current_stage",
      priority: "priority",
      interestedUnitId: "interested_unit_id",
      lostReason: "lost_reason",
    };
    const entries = Object.entries(dto).filter(
      ([, value]) => value !== undefined,
    );
    if (!entries.length)
      return this.findLead(organizationId, projectId, leadId);
    const current = await this.findLead(organizationId, projectId, leadId);
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `UPDATE sales_leads SET ${entries.map(([key]) => `${columns[key]} = ?`).join(", ")}
         WHERE organization_id = ? AND project_id = ? AND id = ?`,
        [
          ...entries.map(([, value]) =>
            value === "" ? null : (value as string | number),
          ),
          organizationId,
          projectId,
          leadId,
        ],
        connection,
      );
      if (dto.currentStage && dto.currentStage !== current?.currentStage) {
        await this.addActivity(
          connection,
          organizationId,
          projectId,
          leadId,
          dto.currentStage === "LOST" ? "LEAD_LOST" : "STAGE_CHANGED",
          `Lead stage changed to ${dto.currentStage}`,
          actorId,
          { from: current?.currentStage, to: dto.currentStage },
        );
      }
    });
    return this.findLead(organizationId, projectId, leadId);
  }

  async assignLead(
    organizationId: string,
    projectId: string,
    leadId: string,
    assignedTo: string,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      const rows = await this.database.query<Row>(
        `SELECT assigned_to FROM sales_leads WHERE organization_id = ? AND project_id = ? AND id = ? FOR UPDATE`,
        [organizationId, projectId, leadId],
        connection,
      );
      const previous = (rows[0]?.assigned_to as string | null) ?? null;
      await this.database.execute(
        `UPDATE sales_leads SET assigned_to = ? WHERE organization_id = ? AND project_id = ? AND id = ?`,
        [assignedTo, organizationId, projectId, leadId],
        connection,
      );
      await this.insertAssignment(
        connection,
        organizationId,
        projectId,
        leadId,
        previous,
        assignedTo,
        actorId,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        leadId,
        previous ? "LEAD_REASSIGNED" : "LEAD_ASSIGNED",
        previous ? "Lead reassigned" : "Lead assigned",
        actorId,
        { assignedFrom: previous, assignedTo },
      );
    });
    return this.findLead(organizationId, projectId, leadId);
  }

  async listActivities(
    organizationId: string,
    projectId: string,
    leadId: string,
  ) {
    return this.database.query<Row>(
      `SELECT a.id, a.activity_type activityType, a.summary, a.details_json details,
              a.actor_id actorId, u.name actorName, a.occurred_at occurredAt
       FROM sales_activities a LEFT JOIN \`user\` u ON u.id = a.actor_id
       WHERE a.organization_id = ? AND a.project_id = ? AND a.lead_id = ?
       ORDER BY a.occurred_at DESC`,
      [organizationId, projectId, leadId],
    );
  }

  async createActivity(
    organizationId: string,
    projectId: string,
    leadId: string,
    type: string,
    summary: string,
    details: string | undefined,
    actorId: string,
  ) {
    await this.addActivity(
      undefined,
      organizationId,
      projectId,
      leadId,
      type,
      summary,
      actorId,
      details ? { details } : null,
    );
    return this.listActivities(organizationId, projectId, leadId);
  }

  async listFollowUps(
    organizationId: string,
    projectId: string,
    query: QueryScheduledSalesDto,
    actorId?: string,
  ) {
    const where = ["f.organization_id = ?", "f.project_id = ?"];
    const params: string[] = [organizationId, projectId];
    if (query.status) {
      where.push("f.status = ?");
      params.push(query.status);
    }
    if (query.assignedTo) {
      where.push("f.assigned_user_id = ?");
      params.push(query.assignedTo);
    } else if (actorId) {
      where.push("f.assigned_user_id = ?");
      params.push(actorId);
    }
    if (query.from) {
      where.push("f.scheduled_at >= ?");
      params.push(query.from);
    }
    if (query.to) {
      where.push("f.scheduled_at <= ?");
      params.push(query.to);
    }
    return this.database.query<Row>(
      `SELECT f.id, f.lead_id leadId, f.assigned_user_id assignedUserId, f.scheduled_at scheduledAt,
              f.type, f.status, f.outcome, f.notes, f.next_follow_up_at nextFollowUpAt,
              f.completed_at completedAt, f.created_by createdBy, f.created_at createdAt, f.updated_at updatedAt,
              l.customer_name customerName
       FROM sales_followups f INNER JOIN sales_leads l ON l.id = f.lead_id
       WHERE ${where.join(" AND ")} ORDER BY f.scheduled_at ASC`,
      params,
    );
  }

  async createFollowUp(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: CreateFollowUpDto,
    actorId: string,
    assignedUserId: string,
  ) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `INSERT INTO sales_followups
          (id, organization_id, project_id, lead_id, assigned_user_id, scheduled_at, type, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          leadId,
          assignedUserId,
          dto.scheduledAt,
          dto.type,
          dto.notes ?? null,
          actorId,
        ],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        leadId,
        "FOLLOW_UP_SCHEDULED",
        "Follow-up scheduled",
        actorId,
        { followUpId: id, scheduledAt: dto.scheduledAt, type: dto.type },
      );
    });
    return (await this.listFollowUps(organizationId, projectId, {})).find(
      (item) => item.id === id,
    );
  }

  async updateFollowUp(
    organizationId: string,
    projectId: string,
    leadId: string,
    followUpId: string,
    dto: UpdateFollowUpDto,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      const result = await this.database.execute(
        `UPDATE sales_followups SET status = ?, outcome = ?, notes = ?, next_follow_up_at = ?,
           completed_at = IF(? = 'COMPLETED', CURRENT_TIMESTAMP(3), completed_at)
         WHERE id = ? AND lead_id = ? AND organization_id = ? AND project_id = ?`,
        [
          dto.status,
          dto.outcome ?? null,
          dto.notes ?? null,
          dto.nextFollowUpAt ?? null,
          dto.status,
          followUpId,
          leadId,
          organizationId,
          projectId,
        ],
        connection,
      );
      if (!result.affectedRows) {
        throw Object.assign(new Error("FOLLOW_UP_NOT_FOUND"), {
          code: "FOLLOW_UP_NOT_FOUND",
        });
      }
      if (dto.status === "COMPLETED") {
        await this.addActivity(
          connection,
          organizationId,
          projectId,
          leadId,
          "FOLLOW_UP_COMPLETED",
          "Follow-up completed",
          actorId,
          { followUpId, outcome: dto.outcome },
        );
      }
    });
    return (await this.listFollowUps(organizationId, projectId, {})).find(
      (item) => item.id === followUpId,
    );
  }

  async listSiteVisits(
    organizationId: string,
    projectId: string,
    actorId?: string,
  ) {
    return this.database.query<Row>(
      `SELECT v.id, v.lead_id leadId, v.scheduled_at scheduledAt,
              v.assigned_salesperson assignedSalesperson, v.attendee_count attendeeCount,
              v.status, v.customer_feedback customerFeedback, v.objections_concerns objectionsConcerns,
              v.next_action nextAction, v.completed_at completedAt, l.customer_name customerName
       FROM sales_site_visits v INNER JOIN sales_leads l ON l.id = v.lead_id
       WHERE v.organization_id = ? AND v.project_id = ? ${actorId ? "AND v.assigned_salesperson = ?" : ""}
       ORDER BY v.scheduled_at DESC`,
      actorId
        ? [organizationId, projectId, actorId]
        : [organizationId, projectId],
    );
  }

  async createSiteVisit(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: CreateSiteVisitDto,
    actorId: string,
    assigneeId: string,
  ) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `INSERT INTO sales_site_visits
          (id, organization_id, project_id, lead_id, scheduled_at, assigned_salesperson, attendee_count, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          leadId,
          dto.scheduledAt,
          assigneeId,
          dto.attendeeCount ?? null,
          actorId,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_leads SET current_stage = 'SITE_VISIT_SCHEDULED'
         WHERE id = ? AND organization_id = ? AND project_id = ? AND current_stage NOT IN ('BOOKED','LOST')`,
        [leadId, organizationId, projectId],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        leadId,
        "SITE_VISIT_SCHEDULED",
        "Site visit scheduled",
        actorId,
        { siteVisitId: id, scheduledAt: dto.scheduledAt },
      );
    });
    return (await this.listSiteVisits(organizationId, projectId)).find(
      (item) => item.id === id,
    );
  }

  async updateSiteVisit(
    organizationId: string,
    projectId: string,
    leadId: string,
    visitId: string,
    dto: UpdateSiteVisitDto,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      const result = await this.database.execute(
        `UPDATE sales_site_visits SET status = ?, customer_feedback = ?, objections_concerns = ?, next_action = ?,
           completed_at = IF(? = 'COMPLETED', CURRENT_TIMESTAMP(3), completed_at)
         WHERE id = ? AND lead_id = ? AND organization_id = ? AND project_id = ?`,
        [
          dto.status,
          dto.customerFeedback ?? null,
          dto.objectionsConcerns ?? null,
          dto.nextAction ?? null,
          dto.status,
          visitId,
          leadId,
          organizationId,
          projectId,
        ],
        connection,
      );
      if (!result.affectedRows) {
        throw Object.assign(new Error("SITE_VISIT_NOT_FOUND"), {
          code: "SITE_VISIT_NOT_FOUND",
        });
      }
      if (dto.status === "COMPLETED") {
        await this.database.execute(
          `UPDATE sales_leads SET current_stage = 'SITE_VISIT_COMPLETED'
           WHERE id = ? AND organization_id = ? AND project_id = ? AND current_stage NOT IN ('BOOKED','LOST')`,
          [leadId, organizationId, projectId],
          connection,
        );
      }
      const activityType =
        dto.status === "COMPLETED"
          ? "SITE_VISIT_COMPLETED"
          : dto.status === "RESCHEDULED"
            ? "SITE_VISIT_RESCHEDULED"
            : dto.status === "NO_SHOW"
              ? "SITE_VISIT_NO_SHOW"
              : "SITE_VISIT_CANCELLED";
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        leadId,
        activityType,
        `Site visit ${dto.status.toLowerCase().replace("_", " ")}`,
        actorId,
        { siteVisitId: visitId },
      );
    });
    return (await this.listSiteVisits(organizationId, projectId)).find(
      (item) => item.id === visitId,
    );
  }

  async listUnits(
    organizationId: string,
    projectId: string,
    query: QueryUnitsDto,
  ) {
    await this.expireBlocks(organizationId, projectId);
    const where = ["u.organization_id = ?", "u.project_id = ?"];
    const params: string[] = [organizationId, projectId];
    if (query.status) {
      where.push("u.status = ?");
      params.push(query.status);
    }
    if (query.search) {
      where.push(
        "(u.unit_number LIKE ? OR u.unit_type LIKE ? OR u.wing_tower LIKE ?)",
      );
      const t = `%${query.search}%`;
      params.push(t, t, t);
    }
    return this.database.query<Row>(
      `SELECT u.id, u.unit_number unitNumber, u.unit_type unitType, u.wing_tower wingTower,
              u.floor, u.area_sqft areaSqft, u.facing, u.base_price basePrice,
              u.price_basis priceBasis, u.rate_per_sqft ratePerSqft, u.status,
              b.id activeBlockId, b.lead_id blockedForLeadId, b.blocked_by blockedBy, b.expires_at blockExpiresAt,
              (SELECT COUNT(*) FROM sales_unit_interests i
                WHERE i.unit_id = u.id AND i.status <> 'WITHDRAWN') interestCount,
              (SELECT COUNT(*) FROM sales_unit_hold_requests hr
                WHERE hr.unit_id = u.id AND hr.status = 'PENDING') pendingHoldRequestCount
       FROM sales_units u LEFT JOIN sales_unit_blocks b ON b.unit_id = u.id AND b.status = 'ACTIVE'
       WHERE ${where.join(" AND ")} ORDER BY u.wing_tower, u.floor, u.unit_number`,
      params,
    );
  }

  async createUnit(
    organizationId: string,
    projectId: string,
    dto: CreateUnitDto,
    actorId: string,
  ) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO sales_units
        (id, organization_id, project_id, unit_number, unit_type, wing_tower, floor, area_sqft, facing,
         base_price, price_basis, rate_per_sqft, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        projectId,
        dto.unitNumber,
        dto.unitType,
        dto.wingTower ?? null,
        dto.floor ?? null,
        dto.areaSqft ?? null,
        dto.facing ?? null,
        dto.basePrice ?? null,
        dto.priceBasis ?? "TOTAL",
        dto.ratePerSqft ?? null,
        dto.status ?? "AVAILABLE",
        actorId,
        actorId,
      ],
    );
    return (await this.listUnits(organizationId, projectId, {})).find(
      (unit) => unit.id === id,
    );
  }

  async findExistingUnitNumbers(
    organizationId: string,
    projectId: string,
    unitNumbers: readonly string[],
  ) {
    if (!unitNumbers.length) return [];
    const placeholders = unitNumbers.map(() => "?").join(", ");
    const rows = await this.database.query<Row>(
      `SELECT unit_number unitNumber FROM sales_units
       WHERE organization_id = ? AND project_id = ? AND unit_number IN (${placeholders})`,
      [organizationId, projectId, ...unitNumbers],
    );
    return rows.map((row) => row.unitNumber as string);
  }

  async createUnits(
    organizationId: string,
    projectId: string,
    units: readonly CreateUnitDto[],
    actorId: string,
  ) {
    const records = units.map((unit) => ({ id: randomUUID(), unit }));
    await this.database.transaction(async (connection) => {
      const placeholders = records
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");
      await this.database.execute(
        `INSERT INTO sales_units
          (id, organization_id, project_id, unit_number, unit_type, wing_tower, floor, area_sqft, facing,
           base_price, price_basis, rate_per_sqft, status, created_by, updated_by)
         VALUES ${placeholders}`,
        records.flatMap(({ id, unit }) => [
          id,
          organizationId,
          projectId,
          unit.unitNumber,
          unit.unitType,
          unit.wingTower ?? null,
          unit.floor ?? null,
          unit.areaSqft ?? null,
          unit.facing ?? null,
          unit.basePrice ?? null,
          unit.priceBasis ?? "TOTAL",
          unit.ratePerSqft ?? null,
          unit.status ?? "AVAILABLE",
          actorId,
          actorId,
        ]),
        connection,
      );
    });
    const ids = new Set<string>(records.map((record) => record.id));
    return (await this.listUnits(organizationId, projectId, {})).filter(
      (unit) => ids.has(unit.id as string),
    );
  }

  async updateUnit(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: UpdateUnitDto,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE sales_units SET unit_number = ?, unit_type = ?, wing_tower = ?, floor = ?, area_sqft = ?,
         facing = ?, base_price = ?, price_basis = ?, rate_per_sqft = ?, status = ?, updated_by = ?
       WHERE id = ? AND organization_id = ? AND project_id = ?`,
      [
        dto.unitNumber,
        dto.unitType,
        dto.wingTower ?? null,
        dto.floor ?? null,
        dto.areaSqft ?? null,
        dto.facing ?? null,
        dto.basePrice ?? null,
        dto.priceBasis ?? "TOTAL",
        dto.ratePerSqft ?? null,
        dto.status ?? "AVAILABLE",
        actorId,
        unitId,
        organizationId,
        projectId,
      ],
    );
    if (!result.affectedRows) {
      throw Object.assign(new Error("UNIT_NOT_FOUND"), {
        code: "UNIT_NOT_FOUND",
      });
    }
    return (await this.listUnits(organizationId, projectId, {})).find(
      (unit) => unit.id === unitId,
    );
  }

  async saveUnitInterest(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: CreateUnitInterestDto,
    actorId: string,
  ) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      const units = await this.database.query<Row>(
        `SELECT status FROM sales_units
         WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [unitId, organizationId, projectId],
        connection,
      );
      if (
        !units[0] ||
        ["BOOKED", "SOLD", "UNAVAILABLE"].includes(units[0].status as string)
      ) {
        throw Object.assign(new Error("UNIT_NOT_AVAILABLE"), {
          code: "UNIT_NOT_AVAILABLE",
        });
      }
      const existing = await this.database.query<Row>(
        `SELECT status FROM sales_unit_interests
         WHERE organization_id = ? AND project_id = ? AND unit_id = ? AND lead_id = ? FOR UPDATE`,
        [organizationId, projectId, unitId, dto.leadId],
        connection,
      );
      const effectiveStatus =
        units[0].status === "BLOCKED"
          ? existing[0]?.status === "SELECTED"
            ? "SELECTED"
            : dto.status === "WITHDRAWN"
              ? "WITHDRAWN"
              : "WAITLISTED"
          : (dto.status ?? "INTERESTED");
      await this.database.execute(
        `INSERT INTO sales_unit_interests
          (id, organization_id, project_id, unit_id, lead_id, status, notes, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), updated_by = VALUES(updated_by)`,
        [
          id,
          organizationId,
          projectId,
          unitId,
          dto.leadId,
          effectiveStatus,
          dto.notes ?? null,
          actorId,
          actorId,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_leads SET interested_unit_id = ? WHERE id = ?`,
        [unitId, dto.leadId],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        dto.leadId,
        existing[0] ? "UNIT_INTEREST_UPDATED" : "UNIT_INTEREST_RECORDED",
        existing[0] ? "Unit interest updated" : "Unit interest recorded",
        actorId,
        { unitId, status: effectiveStatus },
      );
    });
    return this.listLeadInterests(
      organizationId,
      projectId,
      dto.leadId,
      actorId,
    );
  }

  async listUnitInterests(
    organizationId: string,
    projectId: string,
    unitId: string,
    actorId?: string,
  ) {
    const own = actorId ? " AND (l.assigned_to = ? OR l.created_by = ?)" : "";
    const params = actorId
      ? [organizationId, projectId, unitId, actorId, actorId]
      : [organizationId, projectId, unitId];
    return this.database.query<Row>(
      `SELECT i.id, i.unit_id unitId, i.lead_id leadId, i.status, i.notes,
              i.created_at createdAt, i.updated_at updatedAt,
              l.customer_name customerName, l.primary_mobile primaryMobile,
              l.current_stage leadStage, l.priority leadPriority,
              l.assigned_to assignedTo, assignee.name assignedToName,
              u.unit_number unitNumber,
              hr.id holdRequestId, hr.status holdRequestStatus,
              hr.request_notes holdRequestNotes, hr.created_at holdRequestedAt,
              (SELECT MAX(a.occurred_at) FROM sales_activities a WHERE a.lead_id = l.id) lastActivityAt,
              (SELECT MIN(f.scheduled_at) FROM sales_followups f WHERE f.lead_id = l.id AND f.status = 'SCHEDULED') nextFollowUpAt
       FROM sales_unit_interests i
       INNER JOIN sales_leads l ON l.id = i.lead_id
       INNER JOIN sales_units u ON u.id = i.unit_id
       LEFT JOIN \`user\` assignee ON assignee.id = l.assigned_to
       LEFT JOIN sales_unit_hold_requests hr ON hr.unit_id = i.unit_id AND hr.lead_id = i.lead_id AND hr.status = 'PENDING'
       WHERE i.organization_id = ? AND i.project_id = ? AND i.unit_id = ?${own}
       ORDER BY FIELD(i.status, 'SELECTED','HIGH_INTENT','WAITLISTED','INTERESTED','WITHDRAWN'),
                i.updated_at DESC`,
      params,
    );
  }

  async listLeadInterests(
    organizationId: string,
    projectId: string,
    leadId: string,
    actorId?: string,
  ) {
    const own = actorId ? " AND (l.assigned_to = ? OR l.created_by = ?)" : "";
    const params = actorId
      ? [organizationId, projectId, leadId, actorId, actorId]
      : [organizationId, projectId, leadId];
    return this.database.query<Row>(
      `SELECT i.id, i.unit_id unitId, i.lead_id leadId, i.status, i.notes,
              i.created_at createdAt, i.updated_at updatedAt,
              l.customer_name customerName, l.primary_mobile primaryMobile,
              l.current_stage leadStage, l.priority leadPriority,
              l.assigned_to assignedTo, assignee.name assignedToName,
              u.unit_number unitNumber,
              hr.id holdRequestId, hr.status holdRequestStatus,
              hr.request_notes holdRequestNotes, hr.created_at holdRequestedAt,
              (SELECT MAX(a.occurred_at) FROM sales_activities a WHERE a.lead_id = l.id) lastActivityAt,
              (SELECT MIN(f.scheduled_at) FROM sales_followups f WHERE f.lead_id = l.id AND f.status = 'SCHEDULED') nextFollowUpAt
       FROM sales_unit_interests i
       INNER JOIN sales_leads l ON l.id = i.lead_id
       INNER JOIN sales_units u ON u.id = i.unit_id
       LEFT JOIN \`user\` assignee ON assignee.id = l.assigned_to
       LEFT JOIN sales_unit_hold_requests hr ON hr.unit_id = i.unit_id AND hr.lead_id = i.lead_id AND hr.status = 'PENDING'
       WHERE i.organization_id = ? AND i.project_id = ? AND i.lead_id = ?${own}
       ORDER BY i.updated_at DESC`,
      params,
    );
  }

  async requestUnitHold(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: CreateUnitHoldRequestDto,
    actorId: string,
  ) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      const interests = await this.database.query<Row>(
        `SELECT id FROM sales_unit_interests
         WHERE organization_id = ? AND project_id = ? AND unit_id = ? AND lead_id = ?
           AND status <> 'WITHDRAWN' FOR UPDATE`,
        [organizationId, projectId, unitId, dto.leadId],
        connection,
      );
      if (!interests[0])
        throw Object.assign(new Error("UNIT_INTEREST_REQUIRED"), {
          code: "UNIT_INTEREST_REQUIRED",
        });
      await this.database.execute(
        `INSERT INTO sales_unit_hold_requests
          (id, organization_id, project_id, unit_id, lead_id, requested_by, request_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          unitId,
          dto.leadId,
          actorId,
          dto.notes ?? null,
        ],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        dto.leadId,
        "UNIT_HOLD_REQUESTED",
        "Unit hold requested",
        actorId,
        { unitId, holdRequestId: id },
      );
    });
    return this.listLeadInterests(
      organizationId,
      projectId,
      dto.leadId,
      actorId,
    );
  }

  async decideUnitHoldRequest(
    organizationId: string,
    projectId: string,
    requestId: string,
    dto: DecideUnitHoldRequestDto,
    actorId: string,
  ) {
    let unitId = "";
    await this.database.transaction(async (connection) => {
      await this.expireBlocks(organizationId, projectId, connection);
      const requests = await this.database.query<Row>(
        `SELECT id, unit_id unitId, lead_id leadId, status
         FROM sales_unit_hold_requests
         WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [requestId, organizationId, projectId],
        connection,
      );
      const request = requests[0];
      if (!request)
        throw Object.assign(new Error("UNIT_HOLD_REQUEST_NOT_FOUND"), {
          code: "UNIT_HOLD_REQUEST_NOT_FOUND",
        });
      if (request.status !== "PENDING")
        throw Object.assign(new Error("UNIT_HOLD_REQUEST_NOT_PENDING"), {
          code: "UNIT_HOLD_REQUEST_NOT_PENDING",
        });
      unitId = request.unitId as string;
      const leadId = request.leadId as string;
      if (dto.decision === "REJECTED") {
        await this.database.execute(
          `UPDATE sales_unit_hold_requests SET status = 'REJECTED', decision_notes = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
          [dto.notes ?? null, actorId, requestId],
          connection,
        );
        await this.addActivity(
          connection,
          organizationId,
          projectId,
          leadId,
          "UNIT_HOLD_REJECTED",
          "Unit hold request rejected",
          actorId,
          { unitId, holdRequestId: requestId, notes: dto.notes ?? null },
        );
        return;
      }
      const units = await this.database.query<Row>(
        `SELECT status FROM sales_units WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [unitId, organizationId, projectId],
        connection,
      );
      if (units[0]?.status !== "AVAILABLE")
        throw Object.assign(new Error("UNIT_NOT_AVAILABLE"), {
          code: "UNIT_NOT_AVAILABLE",
        });
      const leads = await this.database.query<Row>(
        `SELECT current_stage currentStage FROM sales_leads WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [leadId, organizationId, projectId],
        connection,
      );
      if (!leads[0])
        throw Object.assign(new Error("LEAD_NOT_FOUND"), {
          code: "LEAD_NOT_FOUND",
        });
      const interests = await this.database.query<Row>(
        `SELECT id FROM sales_unit_interests
         WHERE organization_id = ? AND project_id = ? AND unit_id = ? AND lead_id = ?
           AND status <> 'WITHDRAWN' FOR UPDATE`,
        [organizationId, projectId, unitId, leadId],
        connection,
      );
      if (!interests[0])
        throw Object.assign(new Error("UNIT_INTEREST_REQUIRED"), {
          code: "UNIT_INTEREST_REQUIRED",
        });
      const blockId = randomUUID();
      const expiresAt =
        dto.expiresAt ??
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await this.database.execute(
        `INSERT INTO sales_unit_blocks
          (id, organization_id, project_id, unit_id, lead_id, blocked_by, expires_at, notes, previous_lead_stage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          blockId,
          organizationId,
          projectId,
          unitId,
          leadId,
          actorId,
          expiresAt,
          dto.notes ?? null,
          leads[0].currentStage,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_units SET status = 'BLOCKED', updated_by = ? WHERE id = ?`,
        [actorId, unitId],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_leads SET current_stage = 'UNIT_BLOCKED', interested_unit_id = ? WHERE id = ?`,
        [unitId, leadId],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_unit_interests SET status = IF(lead_id = ?, 'SELECTED', 'WAITLISTED'), updated_by = ? WHERE unit_id = ? AND status <> 'WITHDRAWN'`,
        [leadId, actorId, unitId],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_unit_hold_requests SET status = 'APPROVED', decision_notes = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [dto.notes ?? null, actorId, requestId],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        leadId,
        "UNIT_HOLD_APPROVED",
        "Unit hold request approved",
        actorId,
        { unitId, holdRequestId: requestId, blockId, expiresAt },
      );
    });
    return this.listUnitInterests(organizationId, projectId, unitId);
  }

  async blockUnit(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: BlockUnitDto,
    actorId: string,
  ) {
    const id = randomUUID();
    const expiresAt =
      dto.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await this.database.transaction(async (connection) => {
      await this.expireBlocks(organizationId, projectId, connection);
      const units = await this.database.query<Row>(
        `SELECT status FROM sales_units WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [unitId, organizationId, projectId],
        connection,
      );
      if (units[0]?.status !== "AVAILABLE")
        throw Object.assign(new Error("UNIT_NOT_AVAILABLE"), {
          code: "UNIT_NOT_AVAILABLE",
        });
      const leads = await this.database.query<Row>(
        `SELECT id, current_stage currentStage FROM sales_leads WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [dto.leadId, organizationId, projectId],
        connection,
      );
      if (!leads[0])
        throw Object.assign(new Error("LEAD_NOT_FOUND"), {
          code: "LEAD_NOT_FOUND",
        });
      await this.database.execute(
        `INSERT INTO sales_unit_blocks
          (id, organization_id, project_id, unit_id, lead_id, blocked_by, expires_at, notes, previous_lead_stage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          unitId,
          dto.leadId,
          actorId,
          expiresAt,
          dto.notes ?? null,
          leads[0].currentStage,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_units SET status = 'BLOCKED', updated_by = ? WHERE id = ?`,
        [actorId, unitId],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_leads SET current_stage = 'UNIT_BLOCKED', interested_unit_id = ? WHERE id = ?`,
        [unitId, dto.leadId],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_unit_interests SET status = IF(lead_id = ?, 'SELECTED', 'WAITLISTED'), updated_by = ?
         WHERE unit_id = ? AND status <> 'WITHDRAWN'`,
        [dto.leadId, actorId, unitId],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        dto.leadId,
        "UNIT_BLOCKED",
        "Unit blocked",
        actorId,
        { unitId, blockId: id, expiresAt },
      );
    });
    return (await this.listUnits(organizationId, projectId, {})).find(
      (unit) => unit.id === unitId,
    );
  }

  async releaseBlock(
    organizationId: string,
    projectId: string,
    blockId: string,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      const rows = await this.database.query<Row>(
        `SELECT unit_id, lead_id, status, previous_lead_stage previousLeadStage FROM sales_unit_blocks
         WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [blockId, organizationId, projectId],
        connection,
      );
      if (!rows[0] || rows[0].status !== "ACTIVE")
        throw Object.assign(new Error("UNIT_BLOCK_NOT_ACTIVE"), {
          code: "UNIT_BLOCK_NOT_ACTIVE",
        });
      await this.database.execute(
        `UPDATE sales_unit_blocks SET status = 'RELEASED' WHERE id = ?`,
        [blockId],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_units SET status = 'AVAILABLE', updated_by = ? WHERE id = ? AND status = 'BLOCKED'`,
        [actorId, rows[0].unit_id as string],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_leads SET current_stage = ?
         WHERE id = ? AND current_stage = 'UNIT_BLOCKED'`,
        [
          (rows[0].previousLeadStage as string | null) ?? "NEGOTIATION",
          rows[0].lead_id as string,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_unit_interests SET status = 'INTERESTED', updated_by = ?
         WHERE unit_id = ? AND lead_id = ? AND status = 'SELECTED'`,
        [actorId, rows[0].unit_id as string, rows[0].lead_id as string],
        connection,
      );
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        rows[0].lead_id as string,
        "UNIT_BLOCK_RELEASED",
        "Unit block released",
        actorId,
        { unitId: rows[0].unit_id as string, blockId },
      );
    });
  }

  async listBookings(
    organizationId: string,
    projectId: string,
    actorId?: string,
  ) {
    return this.database.query<Row>(
      `SELECT b.id, b.lead_id leadId, b.unit_id unitId, b.booked_by bookedBy, b.booking_date bookingDate,
              b.customer_name customerName, b.customer_mobile customerMobile, b.booking_amount bookingAmount,
              b.booking_reference bookingReference, b.status, b.cancellation_reason cancellationReason,
              b.cancelled_by cancelledBy, b.cancelled_at cancelledAt, b.created_at createdAt,
              l.customer_name leadCustomerName, u.unit_number unitNumber
       FROM sales_bookings b INNER JOIN sales_leads l ON l.id = b.lead_id
       LEFT JOIN sales_units u ON u.id = b.unit_id
       WHERE b.organization_id = ? AND b.project_id = ?
         ${actorId ? "AND (l.assigned_to = ? OR l.created_by = ?)" : ""}
       ORDER BY b.booking_date DESC, b.created_at DESC`,
      actorId
        ? [organizationId, projectId, actorId, actorId]
        : [organizationId, projectId],
    );
  }

  async findBooking(
    organizationId: string,
    projectId: string,
    bookingId: string,
  ) {
    const rows = await this.database.query<Row>(
      `SELECT id, lead_id leadId, unit_id unitId, status
       FROM sales_bookings
       WHERE id = ? AND organization_id = ? AND project_id = ? LIMIT 1`,
      [bookingId, organizationId, projectId],
    );
    return rows[0] ?? null;
  }

  async createBooking(
    organizationId: string,
    projectId: string,
    dto: CreateBookingDto,
    actorId: string,
  ) {
    let id: string = randomUUID();
    await this.database.transaction(async (connection) => {
      const existing = await this.database.query<Row>(
        `SELECT id, project_id, lead_id, unit_id, booking_date, customer_name,
                customer_mobile, booking_amount, booking_reference
         FROM sales_bookings
         WHERE organization_id = ? AND idempotency_key = ? LIMIT 1 FOR UPDATE`,
        [organizationId, dto.idempotencyKey],
        connection,
      );
      if (existing[0]) {
        const row = existing[0];
        const sameRequest =
          row.project_id === projectId &&
          row.lead_id === dto.leadId &&
          (row.unit_id ?? null) === (dto.unitId ?? null) &&
          (row.booking_date instanceof Date
            ? row.booking_date.toISOString().slice(0, 10)
            : String(row.booking_date).slice(0, 10)) ===
            dto.bookingDate.slice(0, 10) &&
          row.customer_name === dto.customerName &&
          row.customer_mobile === dto.customerMobile &&
          Number(row.booking_amount ?? 0) === Number(dto.bookingAmount ?? 0) &&
          (row.booking_reference ?? null) === (dto.bookingReference ?? null);
        if (!sameRequest) {
          throw Object.assign(new Error("IDEMPOTENCY_CONFLICT"), {
            code: "IDEMPOTENCY_CONFLICT",
          });
        }
        id = row.id as string;
        return;
      }
      const leads = await this.database.query<Row>(
        `SELECT current_stage FROM sales_leads WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [dto.leadId, organizationId, projectId],
        connection,
      );
      if (!leads[0])
        throw Object.assign(new Error("LEAD_NOT_FOUND"), {
          code: "LEAD_NOT_FOUND",
        });
      if (leads[0].current_stage === "BOOKED")
        throw Object.assign(new Error("LEAD_ALREADY_BOOKED"), {
          code: "LEAD_ALREADY_BOOKED",
        });
      if (dto.unitId) {
        await this.expireBlocks(organizationId, projectId, connection);
        const units = await this.database.query<Row>(
          `SELECT status FROM sales_units WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
          [dto.unitId, organizationId, projectId],
          connection,
        );
        if (
          !units[0] ||
          !["AVAILABLE", "BLOCKED"].includes(units[0].status as string)
        )
          throw Object.assign(new Error("UNIT_NOT_AVAILABLE"), {
            code: "UNIT_NOT_AVAILABLE",
          });
        if (units[0].status === "BLOCKED") {
          const blocks = await this.database.query<Row>(
            `SELECT id FROM sales_unit_blocks WHERE unit_id = ? AND lead_id = ? AND status = 'ACTIVE' FOR UPDATE`,
            [dto.unitId, dto.leadId],
            connection,
          );
          if (!blocks[0])
            throw Object.assign(new Error("UNIT_BLOCKED_FOR_ANOTHER_LEAD"), {
              code: "UNIT_BLOCKED_FOR_ANOTHER_LEAD",
            });
        }
      }
      await this.database.execute(
        `INSERT INTO sales_bookings
          (id, organization_id, project_id, lead_id, unit_id, booked_by, booking_date,
           customer_name, customer_mobile, booking_amount, booking_reference, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          dto.leadId,
          dto.unitId ?? null,
          actorId,
          dto.bookingDate,
          dto.customerName,
          dto.customerMobile,
          dto.bookingAmount ?? null,
          dto.bookingReference ?? null,
          dto.idempotencyKey,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_leads SET current_stage = 'BOOKED',
           converted_at = COALESCE(converted_at, CURRENT_TIMESTAMP(3)),
           converted_by = COALESCE(converted_by, ?), interested_unit_id = COALESCE(?, interested_unit_id)
         WHERE id = ?`,
        [actorId, dto.unitId ?? null, dto.leadId],
        connection,
      );
      if (dto.unitId) {
        await this.database.execute(
          `UPDATE sales_units SET status = 'BOOKED', updated_by = ? WHERE id = ?`,
          [actorId, dto.unitId],
          connection,
        );
        await this.database.execute(
          `UPDATE sales_unit_blocks SET status = 'CONVERTED' WHERE unit_id = ? AND lead_id = ? AND status = 'ACTIVE'`,
          [dto.unitId, dto.leadId],
          connection,
        );
        await this.database.execute(
          `UPDATE sales_unit_interests SET status = IF(lead_id = ?, 'SELECTED', 'WAITLISTED'), updated_by = ?
           WHERE unit_id = ? AND status <> 'WITHDRAWN'`,
          [dto.leadId, actorId, dto.unitId],
          connection,
        );
      }
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        dto.leadId,
        "LEAD_BOOKED",
        "Lead converted to booking",
        actorId,
        { bookingId: id, unitId: dto.unitId ?? null },
      );
    });
    return (await this.listBookings(organizationId, projectId)).find(
      (booking) => booking.id === id,
    );
  }

  async cancelBooking(
    organizationId: string,
    projectId: string,
    bookingId: string,
    dto: CancelBookingDto,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      const rows = await this.database.query<Row>(
        `SELECT lead_id, unit_id, status FROM sales_bookings
         WHERE id = ? AND organization_id = ? AND project_id = ? FOR UPDATE`,
        [bookingId, organizationId, projectId],
        connection,
      );
      if (!rows[0] || rows[0].status !== "CONFIRMED")
        throw Object.assign(new Error("BOOKING_NOT_ACTIVE"), {
          code: "BOOKING_NOT_ACTIVE",
        });
      if (dto.restoredLeadStage === "BOOKED")
        throw Object.assign(new Error("BOOKING_RESTORE_STAGE_INVALID"), {
          code: "BOOKING_RESTORE_STAGE_INVALID",
        });
      if (rows[0].unit_id && !dto.restoredUnitStatus)
        throw Object.assign(new Error("BOOKING_RESTORE_UNIT_STATUS_REQUIRED"), {
          code: "BOOKING_RESTORE_UNIT_STATUS_REQUIRED",
        });
      await this.database.execute(
        `UPDATE sales_bookings SET status = 'CANCELLED', cancellation_reason = ?, cancelled_by = ?, cancelled_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [dto.cancellationReason, actorId, bookingId],
        connection,
      );
      await this.database.execute(
        `UPDATE sales_leads SET current_stage = ? WHERE id = ?`,
        [dto.restoredLeadStage, rows[0].lead_id as string],
        connection,
      );
      if (rows[0].unit_id) {
        await this.database.execute(
          `UPDATE sales_units SET status = ?, updated_by = ? WHERE id = ?`,
          [dto.restoredUnitStatus!, actorId, rows[0].unit_id as string],
          connection,
        );
        await this.database.execute(
          `UPDATE sales_unit_interests SET status = 'INTERESTED', updated_by = ?
           WHERE unit_id = ? AND lead_id = ? AND status = 'SELECTED'`,
          [actorId, rows[0].unit_id as string, rows[0].lead_id as string],
          connection,
        );
      }
      await this.addActivity(
        connection,
        organizationId,
        projectId,
        rows[0].lead_id as string,
        "BOOKING_CANCELLED",
        "Booking cancelled",
        actorId,
        {
          bookingId,
          restoredUnitStatus: dto.restoredUnitStatus,
          restoredLeadStage: dto.restoredLeadStage,
        },
      );
    });
    return (await this.listBookings(organizationId, projectId)).find(
      (booking) => booking.id === bookingId,
    );
  }

  private async expireBlocks(
    organizationId: string,
    projectId: string,
    connection?: DatabaseConnection,
  ) {
    await this.database.execute(
      `UPDATE sales_leads l
       INNER JOIN sales_unit_blocks b ON b.lead_id = l.id
       SET l.current_stage = COALESCE(b.previous_lead_stage, 'NEGOTIATION')
       WHERE b.organization_id = ? AND b.project_id = ? AND b.status = 'ACTIVE'
         AND b.expires_at <= CURRENT_TIMESTAMP(3) AND l.current_stage = 'UNIT_BLOCKED'`,
      [organizationId, projectId],
      connection,
    );
    await this.database.execute(
      `UPDATE sales_unit_interests i
       INNER JOIN sales_unit_blocks b ON b.unit_id = i.unit_id AND b.lead_id = i.lead_id
       SET i.status = 'INTERESTED', i.updated_by = b.blocked_by
       WHERE b.organization_id = ? AND b.project_id = ? AND b.status = 'ACTIVE'
         AND b.expires_at <= CURRENT_TIMESTAMP(3) AND i.status = 'SELECTED'`,
      [organizationId, projectId],
      connection,
    );
    await this.database.execute(
      `UPDATE sales_unit_blocks b INNER JOIN sales_units u ON u.id = b.unit_id
       SET b.status = 'EXPIRED', u.status = IF(u.status = 'BLOCKED', 'AVAILABLE', u.status)
       WHERE b.organization_id = ? AND b.project_id = ? AND b.status = 'ACTIVE' AND b.expires_at <= CURRENT_TIMESTAMP(3)`,
      [organizationId, projectId],
      connection,
    );
  }

  private async insertAssignment(
    connection: DatabaseConnection,
    organizationId: string,
    projectId: string,
    leadId: string,
    from: string | null,
    to: string,
    actorId: string,
  ) {
    await this.database.execute(
      `INSERT INTO sales_lead_assignments
        (id, organization_id, project_id, lead_id, assigned_from, assigned_to, assigned_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), organizationId, projectId, leadId, from, to, actorId],
      connection,
    );
  }

  private async addActivity(
    connection: DatabaseConnection | undefined,
    organizationId: string,
    projectId: string,
    leadId: string,
    type: string,
    summary: string,
    actorId: string,
    details: unknown,
  ) {
    await this.database.execute(
      `INSERT INTO sales_activities
        (id, organization_id, project_id, lead_id, activity_type, summary, details_json, actor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        organizationId,
        projectId,
        leadId,
        type,
        summary,
        details ? JSON.stringify(details) : null,
        actorId,
      ],
      connection,
    );
  }

  private leadSelect() {
    return `SELECT l.id, l.organization_id organizationId, l.project_id projectId,
      l.customer_name customerName, l.primary_mobile primaryMobile, l.alternate_mobile alternateMobile,
      l.email, l.preferred_unit_type preferredUnitType, l.budget_min budgetMin, l.budget_max budgetMax,
      l.purchase_purpose purchasePurpose, l.purchase_timeline purchaseTimeline, l.source,
      l.source_detail sourceDetail, l.created_by createdBy, creator.name createdByName,
      l.assigned_to assignedTo, assignee.name assignedToName, l.current_stage currentStage,
      l.priority, l.interested_unit_id interestedUnitId, unit.unit_number interestedUnitNumber,
      l.lost_reason lostReason, l.converted_at convertedAt, l.converted_by convertedBy,
      l.created_at createdAt, l.updated_at updatedAt
      FROM sales_leads l
      LEFT JOIN \`user\` creator ON creator.id = l.created_by
      LEFT JOIN \`user\` assignee ON assignee.id = l.assigned_to
      LEFT JOIN sales_units unit ON unit.id = l.interested_unit_id`;
  }

  private mapLead(row: Row): SalesLeadRecord {
    return {
      ...row,
      budgetMin: row.budgetMin === null ? null : Number(row.budgetMin),
      budgetMax: row.budgetMax === null ? null : Number(row.budgetMax),
    } as unknown as SalesLeadRecord;
  }
}
