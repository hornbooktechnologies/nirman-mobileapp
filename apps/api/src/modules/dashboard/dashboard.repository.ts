import { Injectable } from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import { DatabaseService } from "../../database/database.service";
import type { QueryParams } from "../../database/database.types";

interface MetricRow extends RowDataPacket {
  assignedWorkers?: number;
  absenceDays?: string;
  amount?: string;
  count?: number;
  latestAt?: Date | string | null;
  overallPercentage?: string;
  updatedStages?: number;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly database: DatabaseService) {}

  async site(
    organizationId: string,
    projectId: string,
    date: string,
    include: { attendance: boolean; expenses: boolean; workers: boolean },
  ) {
    const [workers, absences, spend] = await Promise.all([
      include.attendance || include.workers
        ? this.one(
            `SELECT COUNT(*) assignedWorkers FROM worker_project_assignments
        WHERE organization_id = ? AND project_id = ? AND status = 'ACTIVE'
          AND starts_on <= ? AND (ends_on IS NULL OR ends_on >= ?)`,
            [organizationId, projectId, date, date],
          )
        : Promise.resolve({} as MetricRow),
      include.attendance
        ? this.one(
            `SELECT COALESCE(SUM(CASE duration WHEN 'HALF_DAY' THEN 0.5 ELSE 1 END), 0) absenceDays
        FROM attendance_exceptions WHERE organization_id = ? AND project_id = ?
          AND work_date = ? AND deleted_at IS NULL`,
            [organizationId, projectId, date],
          )
        : Promise.resolve({} as MetricRow),
      include.expenses
        ? this.one(
            `SELECT COALESCE(SUM(e.amount + COALESCE(a.adjustment, 0)), 0) amount
        FROM site_expenses e LEFT JOIN (
          SELECT site_expense_id, SUM(amount) adjustment FROM site_expense_adjustments GROUP BY site_expense_id
        ) a ON a.site_expense_id = e.id
        WHERE e.organization_id = ? AND e.project_id = ? AND e.expense_date = ? AND e.status = 'APPROVED'`,
            [organizationId, projectId, date],
          )
        : Promise.resolve({} as MetricRow),
    ]);
    const assignedWorkers = Number(workers.assignedWorkers ?? 0);
    const absentToday = Number(absences.absenceDays ?? 0);
    return {
      assignedWorkers:
        include.attendance || include.workers ? assignedWorkers : null,
      presentToday: include.attendance
        ? Math.max(0, assignedWorkers - absentToday)
        : null,
      absentToday: include.attendance ? absentToday : null,
      todaySpend: include.expenses ? this.money(spend.amount) : null,
    };
  }

  async finance(
    organizationId: string,
    projectId: string,
    monthStart: string,
    today: string,
    include: { expenses: boolean; kharchi: boolean; wages: boolean },
  ) {
    const [wages, advances, adjustments, allocations, expenses] =
      await Promise.all([
        include.wages
          ? this.one(
              `SELECT COALESCE(SUM(wi.gross_amount), 0) amount FROM wage_items wi
        INNER JOIN wage_batches wb ON wb.id = wi.wage_batch_id
        WHERE wi.organization_id = ? AND wi.project_id = ? AND wb.status <> 'CANCELLED'
          AND wb.period_end >= ? AND wb.period_start <= ?`,
              [organizationId, projectId, monthStart, today],
            )
          : Promise.resolve({} as MetricRow),
        include.kharchi
          ? this.one(
              `SELECT COALESCE(SUM(amount), 0) amount FROM kharchi_advances
        WHERE organization_id = ? AND project_id = ? AND request_date BETWEEN ? AND ?`,
              [organizationId, projectId, monthStart, today],
            )
          : Promise.resolve({} as MetricRow),
        include.kharchi
          ? this.one(
              `SELECT COALESCE(SUM(amount), 0) amount FROM kharchi_adjustments
        WHERE organization_id = ? AND project_id = ?`,
              [organizationId, projectId],
            )
          : Promise.resolve({} as MetricRow),
        include.kharchi
          ? this.one(
              `SELECT COALESCE(SUM(deduction_amount), 0) amount FROM kharchi_deduction_allocations
        WHERE organization_id = ? AND project_id = ?`,
              [organizationId, projectId],
            )
          : Promise.resolve({} as MetricRow),
        include.expenses
          ? this.one(
              `SELECT COALESCE(SUM(e.amount + COALESCE(a.adjustment, 0)), 0) amount
        FROM site_expenses e LEFT JOIN (
          SELECT site_expense_id, SUM(amount) adjustment FROM site_expense_adjustments GROUP BY site_expense_id
        ) a ON a.site_expense_id = e.id
        WHERE e.organization_id = ? AND e.project_id = ? AND e.expense_date BETWEEN ? AND ? AND e.status = 'APPROVED'`,
              [organizationId, projectId, monthStart, today],
            )
          : Promise.resolve({} as MetricRow),
      ]);
    const advanceTotal = Number(advances.amount ?? 0);
    const outstanding =
      advanceTotal +
      Number(adjustments.amount ?? 0) -
      Number(allocations.amount ?? 0);
    return {
      wageEstimate: include.wages ? this.money(wages.amount) : null,
      kharchiPaidThisMonth: include.kharchi
        ? this.money(advances.amount)
        : null,
      outstandingKharchi: include.kharchi
        ? Math.max(0, outstanding).toFixed(2)
        : null,
      recognizedExpensesThisMonth: include.expenses
        ? this.money(expenses.amount)
        : null,
    };
  }

  async workflow(
    organizationId: string,
    projectId: string,
    today: string,
    include: { expenses: boolean; materials: boolean },
  ) {
    const [materialApprovals, overdueMaterials, expenses] = await Promise.all([
      include.materials
        ? this.one(
            `SELECT COUNT(*) count FROM material_requests WHERE organization_id = ? AND project_id = ?
        AND status IN ('PENDING_VERIFICATION','PENDING_FINAL')`,
            [organizationId, projectId],
          )
        : Promise.resolve({} as MetricRow),
      include.materials
        ? this.one(
            `SELECT COUNT(*) count FROM material_requests WHERE organization_id = ? AND project_id = ?
        AND required_by_date < ? AND status NOT IN ('DELIVERED','REJECTED','CANCELLED')`,
            [organizationId, projectId, today],
          )
        : Promise.resolve({} as MetricRow),
      include.expenses
        ? this.one(
            `SELECT COUNT(*) count, COALESCE(SUM(amount), 0) amount FROM site_expenses
        WHERE organization_id = ? AND project_id = ? AND status = 'PENDING_APPROVAL'`,
            [organizationId, projectId],
          )
        : Promise.resolve({} as MetricRow),
    ]);
    return {
      pendingMaterialApprovals: include.materials
        ? Number(materialApprovals.count ?? 0)
        : null,
      overdueMaterialRequests: include.materials
        ? Number(overdueMaterials.count ?? 0)
        : null,
      pendingExpenses: include.expenses ? Number(expenses.count ?? 0) : null,
      pendingExpenseAmount: include.expenses
        ? this.money(expenses.amount)
        : null,
    };
  }

  async progress(organizationId: string, projectId: string) {
    const row = await this.one(
      `SELECT COALESCE(AVG(p.percentage), 0) overallPercentage,
      COUNT(*) updatedStages, MAX(p.created_at) latestAt
      FROM project_progress_updates p
      WHERE p.organization_id = ? AND p.project_id = ? AND NOT EXISTS (
        SELECT 1 FROM project_progress_updates n WHERE n.organization_id = p.organization_id
          AND n.project_id = p.project_id AND n.stage = p.stage
          AND (n.update_date > p.update_date OR (n.update_date = p.update_date AND n.created_at > p.created_at))
      )`,
      [organizationId, projectId],
    );
    return {
      overallPercentage:
        Math.round(Number(row.overallPercentage ?? 0) * 100) / 100,
      updatedStages: Number(row.updatedStages ?? 0),
      latestUpdateAt: this.iso(row.latestAt),
    };
  }

  async gallery(organizationId: string, projectId: string, weekStart: string) {
    const row = await this.one(
      `SELECT COUNT(*) count, MAX(captured_at) latestAt FROM gallery_entries
      WHERE organization_id = ? AND project_id = ? AND status = 'APPROVED' AND captured_at >= ?`,
      [organizationId, projectId, weekStart],
    );
    return {
      recentUpdates: Number(row.count ?? 0),
      latestCapturedAt: this.iso(row.latestAt),
    };
  }

  async sales(
    organizationId: string,
    projectId: string,
    userId: string,
    today: string,
    tomorrow: string,
    expiryLimit: string,
    allLeads: boolean,
    include: {
      followups: boolean;
      inventory: boolean;
      leads: boolean;
      visits: boolean;
    },
  ) {
    const leadScope = allLeads
      ? ""
      : " AND (assigned_to = ? OR created_by = ?)";
    const leadParams = allLeads
      ? [organizationId, projectId]
      : [organizationId, projectId, userId, userId];
    const [newLeads, pipeline, followups, overdue, visits, blocks, booked] =
      await Promise.all([
        include.leads
          ? this.one(
              `SELECT COUNT(*) count FROM sales_leads WHERE organization_id = ? AND project_id = ? AND current_stage = 'NEW'${leadScope}`,
              leadParams,
            )
          : Promise.resolve({} as MetricRow),
        include.leads
          ? this.one(
              `SELECT COUNT(*) count FROM sales_leads WHERE organization_id = ? AND project_id = ? AND current_stage NOT IN ('WON','LOST')${leadScope}`,
              leadParams,
            )
          : Promise.resolve({} as MetricRow),
        include.followups
          ? this.one(
              `SELECT COUNT(*) count FROM sales_followups WHERE organization_id = ? AND project_id = ? AND assigned_user_id = ? AND status = 'SCHEDULED' AND scheduled_at >= ? AND scheduled_at < ?`,
              [organizationId, projectId, userId, today, tomorrow],
            )
          : Promise.resolve({} as MetricRow),
        include.followups
          ? this.one(
              `SELECT COUNT(*) count FROM sales_followups WHERE organization_id = ? AND project_id = ? AND assigned_user_id = ? AND status = 'SCHEDULED' AND scheduled_at < ?`,
              [organizationId, projectId, userId, today],
            )
          : Promise.resolve({} as MetricRow),
        include.visits
          ? this.one(
              `SELECT COUNT(*) count FROM sales_site_visits WHERE organization_id = ? AND project_id = ? AND assigned_salesperson = ? AND status = 'SCHEDULED' AND scheduled_at >= ? AND scheduled_at < ?`,
              [organizationId, projectId, userId, today, tomorrow],
            )
          : Promise.resolve({} as MetricRow),
        include.inventory
          ? this.one(
              `SELECT COUNT(*) count FROM sales_unit_blocks WHERE organization_id = ? AND project_id = ? AND status = 'ACTIVE' AND expires_at >= ? AND expires_at < ?`,
              [organizationId, projectId, today, expiryLimit],
            )
          : Promise.resolve({} as MetricRow),
        include.inventory
          ? this.one(
              `SELECT COUNT(*) count FROM sales_units WHERE organization_id = ? AND project_id = ? AND status IN ('BOOKED','SOLD')`,
              [organizationId, projectId],
            )
          : Promise.resolve({} as MetricRow),
      ]);
    return {
      newAssignedLeads: include.leads ? Number(newLeads.count ?? 0) : null,
      followUpsToday: include.followups ? Number(followups.count ?? 0) : null,
      overdueFollowUps: include.followups ? Number(overdue.count ?? 0) : null,
      siteVisitsToday: include.visits ? Number(visits.count ?? 0) : null,
      activePipeline: include.leads ? Number(pipeline.count ?? 0) : null,
      blocksNearingExpiry: include.inventory ? Number(blocks.count ?? 0) : null,
      bookedUnits: include.inventory ? Number(booked.count ?? 0) : null,
    };
  }

  private async one(sql: string, params: QueryParams) {
    const [row] = await this.database.query<MetricRow>(sql, params);
    return row ?? ({} as MetricRow);
  }

  private money(value: string | undefined) {
    return Number(value ?? 0).toFixed(2);
  }
  private iso(value: Date | string | null | undefined) {
    return value ? new Date(value).toISOString() : null;
  }
}
