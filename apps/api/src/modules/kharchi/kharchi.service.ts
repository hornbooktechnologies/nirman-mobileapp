import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ErrorCode } from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type { CreateKharchiDto } from "./dto/create-kharchi.dto";
import type { CreateKharchiAdjustmentDto } from "./dto/create-kharchi-adjustment.dto";
import type {
  KharchiSummaryQueryDto,
  QueryKharchiDto,
} from "./dto/query-kharchi.dto";
import { KharchiRepository } from "./kharchi.repository";

@Injectable()
export class KharchiService {
  constructor(
    private readonly repository: KharchiRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async findMany(
    organizationId: string,
    projectId: string,
    query: QueryKharchiDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "kharchi:read",
    );
    this.validateRange(query.startDate, query.endDate);
    return this.repository.findMany(organizationId, projectId, query);
  }

  async summary(
    organizationId: string,
    projectId: string,
    query: KharchiSummaryQueryDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "kharchi:read",
    );
    this.validateRange(query.startDate, query.endDate);
    return this.repository.summary(organizationId, projectId, query);
  }

  async findDetail(
    organizationId: string,
    projectId: string,
    kharchiId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "kharchi:read",
    );
    const detail = await this.repository.findDetail(
      organizationId,
      projectId,
      kharchiId,
    );
    if (!detail) throw this.notFound();
    return detail;
  }

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateKharchiDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "kharchi:create",
    );
    this.assertActiveProject(access.project.status);
    const normalized = {
      ...dto,
      paymentReference: dto.paymentReference?.trim() || null,
      notes: dto.notes?.trim() || null,
      idempotencyKey: dto.idempotencyKey.trim(),
    };
    const amount = this.formatInputMoney(dto.amount);
    const fingerprint = this.repository.fingerprint({
      workerAssignmentId: normalized.workerAssignmentId,
      amount,
      requestDate: normalized.requestDate,
      paymentMethod: normalized.paymentMethod,
      paymentReference: normalized.paymentReference,
      notes: normalized.notes,
    });
    return this.translateRepositoryError(() =>
      this.repository.create(
        organizationId,
        projectId,
        normalized,
        actor.id,
        amount,
        fingerprint,
      ),
    );
  }

  async adjust(
    organizationId: string,
    projectId: string,
    kharchiId: string,
    dto: CreateKharchiAdjustmentDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "kharchi:adjust",
    );
    this.assertActiveProject(access.project.status);
    const normalized = {
      ...dto,
      reason: dto.reason.trim(),
      idempotencyKey: dto.idempotencyKey.trim(),
    };
    const amount = this.formatInputMoney(dto.amount);
    const fingerprint = this.repository.fingerprint({
      kharchiId,
      amount,
      reason: normalized.reason,
    });
    const detail = await this.translateRepositoryError(() =>
      this.repository.adjust(
        organizationId,
        projectId,
        kharchiId,
        normalized,
        actor.id,
        amount,
        fingerprint,
      ),
    );
    if (!detail) throw this.notFound();
    return detail;
  }

  async export(
    organizationId: string,
    projectId: string,
    query: QueryKharchiDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "kharchi:export",
    );
    this.validateRange(query.startDate, query.endDate);
    const rows = [];
    let page = 1;
    while (true) {
      const result = await this.repository.findMany(organizationId, projectId, {
        ...query,
        page,
        pageSize: 100,
      });
      rows.push(...result.items);
      if (page >= result.pagination.totalPages) break;
      page += 1;
    }
    const headers = [
      "Worker Code",
      "Worker Name",
      "Trade",
      "Request Date",
      "Original Amount",
      "Adjustment Amount",
      "Effective Amount",
      "Deducted Amount",
      "Outstanding Amount",
      "Status",
      "Payment Method",
      "Payment Reference",
      "Recorded By",
      "Paid At",
      "Notes",
    ];
    const csvRows = [
      headers,
      ...rows.map((row) => [
        row.workerCode,
        row.workerName,
        row.trade,
        row.requestDate,
        row.amount,
        row.adjustmentAmount,
        row.effectiveAmount,
        row.deductedAmount,
        row.outstandingAmount,
        row.status,
        row.paymentMethod,
        row.paymentReference ?? "",
        row.recordedBy,
        row.paidAt,
        row.notes ?? "",
      ]),
    ];
    return {
      filename: `kharchi-${projectId}.csv`,
      csv: `${csvRows
        .map((row) => row.map((cell) => this.csvCell(cell)).join(","))
        .join("\r\n")}\r\n`,
    };
  }

  private async translateRepositoryError<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : error instanceof Error
            ? error.message
            : "";
      if (code === "KHARCHI_NOT_FOUND") throw this.notFound();
      if (code === "KHARCHI_IDEMPOTENCY_CONFLICT" || code === "ER_DUP_ENTRY") {
        throw new ConflictException(
          this.error(
            "KHARCHI_IDEMPOTENCY_CONFLICT",
            "This retry key was already used for a different Kharchi request",
          ),
        );
      }
      if (code === "KHARCHI_WORKER_INACTIVE") {
        throw new BadRequestException(
          this.error(code, "Inactive Workers cannot receive new Kharchi"),
        );
      }
      if (code === "KHARCHI_WORKER_ASSIGNMENT_INVALID") {
        throw new BadRequestException(
          this.error(code, "Worker assignment is not valid for this Project"),
        );
      }
      if (code === "KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT") {
        throw new BadRequestException(
          this.error(
            code,
            "Kharchi date must be covered by the Worker assignment",
          ),
        );
      }
      if (code === "KHARCHI_ADJUSTMENT_EXCEEDS_BALANCE") {
        throw new BadRequestException(
          this.error(
            code,
            "Negative adjustment cannot reduce the balance below allocated deductions",
          ),
        );
      }
      throw error;
    }
  }

  private validateRange(startDate?: string, endDate?: string) {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        this.error("VALIDATION_FAILED", "End date cannot be before start date"),
      );
    }
  }

  private assertActiveProject(status: string) {
    if (status !== "ACTIVE") {
      throw new BadRequestException(
        this.error(
          "PROJECT_STATUS_INVALID",
          "Kharchi can be recorded only for an active Project",
        ),
      );
    }
  }

  private formatInputMoney(value: number) {
    const cents = Math.round(value * 100);
    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(cents);
    return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
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
            : JSON.stringify(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private notFound() {
    return new NotFoundException(
      this.error("KHARCHI_NOT_FOUND", "Kharchi advance not found"),
    );
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }
}
