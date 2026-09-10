import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import type { ErrorCode, PermissionKey } from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type {
  QueryProgressHistoryDto,
  RecordProgressUpdateDto,
} from "./dto/progress.dto";
import { ProgressRepository } from "./progress.repository";

@Injectable()
export class ProgressService {
  constructor(
    private readonly repository: ProgressRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async summary(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "progress:read");
    return this.summaryUnchecked(organizationId, projectId);
  }

  async history(
    organizationId: string,
    projectId: string,
    query: QueryProgressHistoryDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "progress:read");
    this.validateRange(query.dateFrom, query.dateTo);
    return this.repository.findHistory(organizationId, projectId, query);
  }

  async record(
    organizationId: string,
    projectId: string,
    dto: RecordProgressUpdateDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "progress:update",
    );
    if (access.project.status !== "ACTIVE") {
      throw new BadRequestException(
        this.error(
          "PROJECT_STATUS_INVALID",
          "Progress updates require an active Project",
        ),
      );
    }
    if (dto.updateDate.slice(0, 10) > this.todayInIndia()) {
      throw new BadRequestException(
        this.error(
          "PROGRESS_DATE_IN_FUTURE",
          "Progress update date cannot be in the future",
        ),
      );
    }
    await this.translate(() =>
      this.repository.record(
        organizationId,
        projectId,
        {
          ...dto,
          updateDate: dto.updateDate.slice(0, 10),
          notes: dto.notes?.trim() || null,
          idempotencyKey: dto.idempotencyKey.trim(),
        },
        { userId: actor.id, memberId: access.membership.id },
      ),
    );
    return this.summaryUnchecked(organizationId, projectId);
  }

  async portfolio(organizationId: string, actor: AuthenticatedUser) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "progress:read",
    );
    const access = await this.projectAccess.getProjectAccessSummary(
      actor,
      organizationId,
    );
    const projects = access.projects.filter(
      (project) =>
        project.status === "ACTIVE" &&
        project.permissions.includes("progress:read"),
    );
    return Promise.all(
      projects.map(async (project) => {
        const summary = await this.summaryUnchecked(organizationId, project.id);
        return {
          projectId: project.id,
          projectName: project.name,
          projectCode: project.projectCode,
          overallPercentage: summary.overallPercentage,
          latestStage: summary.latestUpdate?.stage ?? null,
          latestPercentage: summary.latestUpdate?.percentage ?? null,
          latestUpdateDate: summary.latestUpdate?.updateDate ?? null,
        };
      }),
    );
  }

  async export(
    organizationId: string,
    projectId: string,
    query: QueryProgressHistoryDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "progress:export");
    this.validateRange(query.dateFrom, query.dateTo);
    const rows = [];
    let page = 1;
    while (true) {
      const result = await this.repository.findHistory(
        organizationId,
        projectId,
        {
          ...query,
          page,
          pageSize: 100,
        },
      );
      rows.push(...result.items);
      if (page >= result.pagination.totalPages) break;
      page += 1;
    }
    const csvRows = [
      [
        "Update date",
        "Stage",
        "Percentage",
        "Previous percentage",
        "Updated by",
        "Notes",
      ],
      ...rows.map((row) => [
        row.updateDate,
        row.stage,
        row.percentage,
        row.previousPercentage ?? "",
        row.updatedBy,
        row.notes ?? "",
      ]),
    ];
    return {
      filename: `project-progress-${projectId}.csv`,
      csv: `${csvRows.map((row) => row.map((cell) => this.csvCell(cell)).join(",")).join("\r\n")}\r\n`,
    };
  }

  private async summaryUnchecked(organizationId: string, projectId: string) {
    const latest = await this.repository.findLatestUpdates(
      organizationId,
      projectId,
    );
    return this.repository.buildSummary(organizationId, projectId, latest);
  }

  private access(
    actor: AuthenticatedUser,
    organizationId: string,
    projectId: string,
    permission: PermissionKey,
  ) {
    return this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      permission,
    );
  }

  private async translate<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : error instanceof Error
            ? error.message
            : "";
      if (
        [
          "PROGRESS_VERSION_CONFLICT",
          "PROGRESS_IDEMPOTENCY_CONFLICT",
          "ER_DUP_ENTRY",
        ].includes(code)
      ) {
        throw new ConflictException(
          this.error(
            code === "ER_DUP_ENTRY"
              ? "PROGRESS_IDEMPOTENCY_CONFLICT"
              : (code as ErrorCode),
            "The stage changed or this retry key conflicts",
          ),
        );
      }
      if (code === "PROGRESS_REGRESSION_NOTE_REQUIRED") {
        throw new BadRequestException(
          this.error(
            "PROGRESS_REGRESSION_NOTE_REQUIRED",
            "Add a note when reducing a stage percentage",
          ),
        );
      }
      throw error;
    }
  }

  private validateRange(start?: string, end?: string) {
    if (start && end && end < start) {
      throw new BadRequestException(
        this.error("VALIDATION_FAILED", "End date cannot be before start date"),
      );
    }
  }

  private todayInIndia() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }

  private csvCell(value: unknown) {
    const text =
      value === null || value === undefined
        ? ""
        : typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "bigint"
          ? String(value)
          : value instanceof Date
            ? value.toISOString()
            : (JSON.stringify(value) ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }
}
