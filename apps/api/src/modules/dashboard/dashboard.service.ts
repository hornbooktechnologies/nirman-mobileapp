import { ForbiddenException, Injectable } from "@nestjs/common";
import type {
  DashboardActionKey,
  PermissionKey,
  RoleDashboardProfile,
  RoleDashboardResponse,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { DashboardRepository } from "./dashboard.repository";

@Injectable()
export class DashboardService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly repository: DashboardRepository,
  ) {}

  async get(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<RoleDashboardResponse> {
    const context = await this.access.resolveProjectContext(
      actor,
      organizationId,
      projectId,
    );
    if (!context.rolePermissions.includes("dashboards:read")) {
      throw new ForbiddenException({
        code: "DASHBOARD_ACCESS_DENIED",
        message: "Dashboard access is not granted for this Organization Role",
      });
    }
    const permissions = new Set<PermissionKey>(context.permissions);
    const roleName = context.membership.role?.name ?? actor.roleName;
    const profile = this.profile(roleName);
    const dates = this.dates();
    const can = (...keys: PermissionKey[]) =>
      keys.some((key) => permissions.has(key));
    const siteAccess = {
      attendance: can("attendance:read"),
      expenses: can("expenses:read"),
      workers: can("workers:read"),
    };
    const financeAccess = {
      expenses: can("expenses:read"),
      kharchi: can("kharchi:read"),
      wages: can("wages:read"),
    };
    const workflowAccess = {
      expenses: can("expenses:read"),
      materials: can("materials:read"),
    };
    const salesAccess = {
      followups: can("followups:manage"),
      inventory: can("inventory:read"),
      leads: can("leads:read-own", "leads:read-team", "leads:read-all"),
      visits: can("site-visits:manage"),
    };
    const sitePromise = Object.values(siteAccess).some(Boolean)
      ? this.repository.site(organizationId, projectId, dates.today, siteAccess)
      : null;
    const financePromise = Object.values(financeAccess).some(Boolean)
      ? this.repository.finance(
          organizationId,
          projectId,
          dates.monthStart,
          dates.today,
          financeAccess,
        )
      : null;
    const workflowPromise = Object.values(workflowAccess).some(Boolean)
      ? this.repository.workflow(
          organizationId,
          projectId,
          dates.today,
          workflowAccess,
        )
      : null;
    const progressPromise = can("progress:read")
      ? this.repository.progress(organizationId, projectId)
      : null;
    const galleryPromise = can("gallery:read")
      ? this.repository.gallery(organizationId, projectId, dates.weekStart)
      : null;
    const salesPromise = Object.values(salesAccess).some(Boolean)
      ? this.repository.sales(
          organizationId,
          projectId,
          actor.id,
          dates.today,
          dates.tomorrow,
          dates.expiryLimit,
          can("leads:read-team", "leads:read-all"),
          salesAccess,
        )
      : null;
    const [site, finance, workflow, progress, gallery, sales] =
      await Promise.all([
        sitePromise,
        financePromise,
        workflowPromise,
        progressPromise,
        galleryPromise,
        salesPromise,
      ]);
    const availableSections: RoleDashboardResponse["availableSections"] = [];
    if (site) availableSections.push("SITE");
    if (finance) availableSections.push("FINANCE");
    if (workflow) availableSections.push("WORKFLOW");
    if (progress) availableSections.push("PROGRESS");
    if (gallery) availableSections.push("GALLERY");
    if (sales) availableSections.push("SALES");
    return {
      profile,
      roleName,
      organizationId,
      project: {
        id: context.project.id,
        name: context.project.name,
        projectCode: context.project.projectCode,
      },
      projectAccessScope: context.projectAccessScope,
      generatedAt: new Date().toISOString(),
      availableSections,
      quickActions: this.actions(permissions, profile),
      site,
      finance,
      workflow,
      progress,
      gallery,
      sales,
    };
  }

  private profile(roleName: string): RoleDashboardProfile {
    if (/sales/i.test(roleName)) return "SALES";
    if (/supervisor/i.test(roleName)) return "SUPERVISOR";
    if (/contractor/i.test(roleName)) return "CONTRACTOR";
    if (/owner|admin|project manager/i.test(roleName)) return "OWNER";
    return "GENERAL";
  }

  private actions(
    permissions: Set<PermissionKey>,
    profile: RoleDashboardProfile,
  ) {
    const actionPermissions: Array<[DashboardActionKey, PermissionKey]> = [
      ["MARK_ATTENDANCE", "attendance:mark"],
      ["ADD_KHARCHI", "kharchi:create"],
      ["REQUEST_MATERIAL", "materials:create"],
      ["ADD_EXPENSE", "expenses:create"],
      ["UPDATE_PROGRESS", "progress:update"],
      ["UPLOAD_PHOTO", "gallery:upload"],
      ["ADD_LEAD", "leads:create"],
      ["VIEW_FOLLOWUPS", "followups:manage"],
      ["VIEW_PROJECT", "projects:read"],
    ];
    const preferred: Record<RoleDashboardProfile, DashboardActionKey[]> = {
      OWNER: ["VIEW_PROJECT", "MARK_ATTENDANCE", "UPDATE_PROGRESS", "ADD_LEAD"],
      CONTRACTOR: [
        "MARK_ATTENDANCE",
        "ADD_KHARCHI",
        "REQUEST_MATERIAL",
        "UPDATE_PROGRESS",
      ],
      SUPERVISOR: [
        "MARK_ATTENDANCE",
        "REQUEST_MATERIAL",
        "ADD_EXPENSE",
        "UPLOAD_PHOTO",
      ],
      SALES: ["ADD_LEAD", "VIEW_FOLLOWUPS", "VIEW_PROJECT"],
      GENERAL: ["VIEW_PROJECT"],
    };
    const allowed = new Map(
      actionPermissions
        .filter(([, permission]) => permissions.has(permission))
        .map(([action]) => [action, true]),
    );
    return preferred[profile].filter((action) => allowed.has(action));
  }

  private dates() {
    const parts = (date: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Calcutta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    const now = new Date();
    const today = parts(now);
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + 1);
    const week = new Date(now);
    week.setUTCDate(week.getUTCDate() - 7);
    const expiry = new Date(now);
    expiry.setUTCDate(expiry.getUTCDate() + 3);
    return {
      today,
      tomorrow: parts(next),
      weekStart: `${parts(week)} 00:00:00`,
      expiryLimit: `${parts(expiry)} 00:00:00`,
      monthStart: `${today.slice(0, 7)}-01`,
    };
  }
}
