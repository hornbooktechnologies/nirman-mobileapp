import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ErrorCode, PermissionKey } from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { AssignWorkerDto } from "./dto/assign-worker.dto";
import { CreateWorkerDto } from "./dto/create-worker.dto";
import { DeactivateWorkerDto } from "./dto/deactivate-worker.dto";
import { EndWorkerAssignmentDto } from "./dto/end-worker-assignment.dto";
import { QueryWorkerDto } from "./dto/query-worker.dto";
import { UpdateWorkerAssignmentDto } from "./dto/update-worker-assignment.dto";
import { UpdateWorkerRateDto } from "./dto/update-worker-rate.dto";
import { UpdateWorkerDto } from "./dto/update-worker.dto";
import { WorkersRepository } from "./workers.repository";

@Injectable()
export class WorkersService {
  constructor(
    private readonly workersRepo: WorkersRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async findAll(
    organizationId: string,
    query: QueryWorkerDto,
    actor: AuthenticatedUser,
  ) {
    const access = query.projectId
      ? await this.projectAccess.resolveProjectAccess(
          actor,
          organizationId,
          query.projectId,
          "workers:read",
        )
      : await this.projectAccess.resolveOrganizationAccess(
          actor,
          organizationId,
          "workers:read",
        );
    return this.workersRepo.findAll(
      organizationId,
      query,
      access.membership.id,
      access.organizationWideProjectAccess,
    );
  }

  async findProjectRoster(
    organizationId: string,
    projectId: string,
    query: QueryWorkerDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "workers:read",
    );
    return this.workersRepo.findProjectRoster(organizationId, projectId, query);
  }

  async create(
    organizationId: string,
    dto: CreateWorkerDto,
    actor: AuthenticatedUser,
  ) {
    this.assertRequiredText(dto.name, "Worker name is required");
    this.assertRequiredText(dto.trade, "Worker trade is required");
    const projectId = dto.projectId?.trim();
    if (projectId) {
      const access = await this.projectAccess.resolveProjectAccess(
        actor,
        organizationId,
        projectId,
        "workers:create",
      );
      if (!access.permissions.includes("workers:assign-project")) {
        throw new ForbiddenException(
          this.error(
            "WORKER_PROJECT_ACCESS_REQUIRED",
            "Worker project assignment permission is required",
          ),
        );
      }
      this.validateAssignmentDates(dto.startsOn, undefined);
    } else {
      const access = await this.projectAccess.resolveOrganizationAccess(
        actor,
        organizationId,
        "workers:create",
      );
      if (!access.organizationWideProjectAccess) {
        throw new ForbiddenException(
          this.error(
            "WORKER_PROJECT_ACCESS_REQUIRED",
            "An accessible project is required to create a worker",
          ),
        );
      }
    }
    this.validateDailyRate(dto.dailyRate);
    let worker;
    try {
      worker = await this.workersRepo.create(
        organizationId,
        { ...dto, projectId },
        actor.id,
      );
    } catch (error) {
      if (!this.isWorkerCodeAllocationError(error)) throw error;
      throw new ConflictException(
        this.error(
          "WORKER_CODE_GENERATION_FAILED",
          "A worker code could not be allocated safely. Please retry.",
        ),
      );
    }
    if (!worker) {
      throw new BadRequestException(
        this.error(
          "WORKER_CODE_GENERATION_FAILED",
          "Worker could not be created",
        ),
      );
    }
    const duplicateWarnings = await this.workersRepo.duplicateCandidates(
      organizationId,
      dto.name,
      dto.mobileNumber,
      worker.id,
    );
    this.recordAudit("workers.created", actor.id, organizationId, worker.id);
    return { ...worker, duplicateWarnings };
  }

  async findById(
    organizationId: string,
    workerId: string,
    actor: AuthenticatedUser,
  ) {
    await this.assertWorkerAccess(
      actor,
      organizationId,
      workerId,
      "workers:read",
    );
    const worker = await this.workersRepo.findById(organizationId, workerId);
    if (!worker) {
      throw new NotFoundException(
        this.error("WORKER_NOT_FOUND", "Worker not found"),
      );
    }
    return worker;
  }

  async update(
    organizationId: string,
    workerId: string,
    dto: UpdateWorkerDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertWorkerAccess(
      actor,
      organizationId,
      workerId,
      "workers:update",
    );
    if (dto.name !== undefined)
      this.assertRequiredText(dto.name, "Worker name is required");
    if (dto.trade !== undefined)
      this.assertRequiredText(dto.trade, "Worker trade is required");
    const worker = await this.workersRepo.update(
      organizationId,
      workerId,
      dto,
      actor.id,
    );
    if (!worker) {
      throw new NotFoundException(
        this.error("WORKER_NOT_FOUND", "Worker not found"),
      );
    }
    const duplicateWarnings = await this.workersRepo.duplicateCandidates(
      organizationId,
      dto.name ?? worker.name,
      dto.mobileNumber ?? worker.mobileNumber,
      worker.id,
    );
    this.recordAudit("workers.updated", actor.id, organizationId, workerId);
    return { ...worker, duplicateWarnings };
  }

  async deactivate(
    organizationId: string,
    workerId: string,
    _dto: DeactivateWorkerDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertWorkerAccess(
      actor,
      organizationId,
      workerId,
      "workers:deactivate",
    );
    const worker = await this.workersRepo.deactivate(
      organizationId,
      workerId,
      actor.id,
    );
    if (!worker) {
      throw new NotFoundException(
        this.error("WORKER_NOT_FOUND", "Worker not found"),
      );
    }
    this.recordAudit("workers.deactivated", actor.id, organizationId, workerId);
    return worker;
  }

  async assignWorker(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: AssignWorkerDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "workers:assign-project",
    );
    const worker = await this.workersRepo.findById(organizationId, workerId);
    if (!worker) {
      throw new NotFoundException(
        this.error("WORKER_NOT_FOUND", "Worker not found"),
      );
    }
    if (worker.status !== "ACTIVE") {
      throw new BadRequestException(
        this.error("WORKER_INACTIVE", "Inactive worker cannot be assigned"),
      );
    }
    this.validateAssignmentDates(dto.startsOn, dto.endsOn);
    this.validateDailyRate(dto.dailyRate);
    if (
      await this.workersRepo.hasActiveAssignment(
        organizationId,
        projectId,
        workerId,
      )
    ) {
      throw new ConflictException(
        this.error(
          "WORKER_ASSIGNMENT_DUPLICATE",
          "Worker already has an active assignment for this project",
        ),
      );
    }
    const assignment = await this.workersRepo.assignWorker(
      organizationId,
      projectId,
      workerId,
      dto,
      actor.id,
    );
    if (!assignment) {
      throw new ConflictException(
        this.error(
          "WORKER_ASSIGNMENT_DUPLICATE",
          "Worker already has an active assignment for this project",
        ),
      );
    }
    this.recordAudit(
      "worker-project-assignments.created",
      actor.id,
      organizationId,
      workerId,
      projectId,
    );
    return assignment;
  }

  async updateAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: UpdateWorkerAssignmentDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "workers:assign-project",
    );
    const current = await this.workersRepo.findActiveAssignment(
      organizationId,
      projectId,
      workerId,
    );
    if (!current) {
      throw new NotFoundException(
        this.error(
          "WORKER_ASSIGNMENT_NOT_FOUND",
          "Worker assignment not found",
        ),
      );
    }
    this.validateAssignmentDates(
      dto.startsOn ?? current.startsOn,
      dto.endsOn === undefined ? current.endsOn : dto.endsOn,
    );
    const assignment = await this.workersRepo.updateAssignment(
      organizationId,
      projectId,
      workerId,
      dto,
      actor.id,
    );
    if (!assignment) {
      throw new NotFoundException(
        this.error(
          "WORKER_ASSIGNMENT_NOT_FOUND",
          "Worker assignment not found",
        ),
      );
    }
    this.recordAudit(
      "worker-project-assignments.updated",
      actor.id,
      organizationId,
      workerId,
      projectId,
    );
    return assignment;
  }

  async updateAssignmentRate(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: UpdateWorkerRateDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "workers:assign-project",
    );
    this.validateDailyRate(dto.dailyRate);
    if (!dto.effectiveDate) {
      throw new BadRequestException(
        this.error(
          "WORKER_RATE_CHANGE_EFFECTIVE_DATE_REQUIRED",
          "Rate change effective date is required",
        ),
      );
    }
    const current = await this.workersRepo.findActiveAssignment(
      organizationId,
      projectId,
      workerId,
    );
    if (!current) {
      throw new NotFoundException(
        this.error(
          "WORKER_ASSIGNMENT_NOT_FOUND",
          "Worker assignment not found",
        ),
      );
    }
    if (this.dateOnly(dto.effectiveDate) < this.dateOnly(current.startsOn)) {
      throw new BadRequestException(
        this.error(
          "WORKER_ASSIGNMENT_INVALID_DATES",
          "Rate effective date cannot be before assignment start date",
        ),
      );
    }
    void access;
    // Attendance is not implemented. The approved pre-Attendance Workers rule
    // therefore uses workers:assign-project. Attendance must replace this
    // boundary with a real history check before elevated update-rate behavior
    // can be claimed.
    const assignment = await this.workersRepo.updateAssignmentRate(
      organizationId,
      projectId,
      workerId,
      dto.dailyRate,
      actor.id,
    );
    if (!assignment) {
      throw new NotFoundException(
        this.error(
          "WORKER_ASSIGNMENT_NOT_FOUND",
          "Worker assignment not found",
        ),
      );
    }
    this.recordAudit(
      "worker-project-assignments.rate-updated",
      actor.id,
      organizationId,
      workerId,
      projectId,
      { effectiveDate: dto.effectiveDate, reason: dto.reason ?? null },
    );
    return assignment;
  }

  async endAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: EndWorkerAssignmentDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "workers:assign-project",
    );
    const current = await this.workersRepo.findActiveAssignment(
      organizationId,
      projectId,
      workerId,
    );
    if (!current) {
      throw new NotFoundException(
        this.error(
          "WORKER_ASSIGNMENT_NOT_FOUND",
          "Worker assignment not found",
        ),
      );
    }
    this.validateAssignmentDates(current.startsOn, dto.endsOn);
    const assignment = await this.workersRepo.endAssignment(
      organizationId,
      projectId,
      workerId,
      dto.endsOn,
      actor.id,
    );
    if (!assignment) {
      throw new NotFoundException(
        this.error(
          "WORKER_ASSIGNMENT_NOT_FOUND",
          "Worker assignment not found",
        ),
      );
    }
    this.recordAudit(
      "worker-project-assignments.ended",
      actor.id,
      organizationId,
      workerId,
      projectId,
    );
    return assignment;
  }

  async duplicateCandidates(
    organizationId: string,
    name: string | undefined,
    mobileNumber: string | undefined,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "workers:create",
    );
    return this.workersRepo.duplicateCandidates(
      organizationId,
      name,
      mobileNumber,
    );
  }

  private async assertWorkerAccess(
    actor: AuthenticatedUser,
    organizationId: string,
    workerId: string,
    permission: PermissionKey,
  ) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      permission,
    );
    if (access.organizationWideProjectAccess) return access;
    const visible = await this.workersRepo.isWorkerVisibleToMember(
      organizationId,
      workerId,
      access.membership.id,
    );
    if (!visible) {
      throw new ForbiddenException(
        this.error(
          "WORKER_PROJECT_ACCESS_REQUIRED",
          "Worker project access is required",
        ),
      );
    }
    return access;
  }

  private assertRequiredText(
    value: string | undefined | null,
    message: string,
  ) {
    if (!value?.trim()) {
      throw new BadRequestException(this.error("VALIDATION_FAILED", message));
    }
  }

  private validateAssignmentDates(start?: string | null, end?: string | null) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException(
        this.error(
          "WORKER_ASSIGNMENT_INVALID_DATES",
          "Assignment end date cannot be before start date",
        ),
      );
    }
  }

  private validateDailyRate(rate?: number | null) {
    if (rate !== undefined && rate !== null && Number(rate) < 0) {
      throw new BadRequestException(
        this.error(
          "WORKER_DAILY_RATE_INVALID",
          "Daily rate cannot be negative",
        ),
      );
    }
  }

  private dateOnly(value: string) {
    return value.slice(0, 10);
  }

  private error(
    code: ErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    return { code, message, details };
  }

  private isWorkerCodeAllocationError(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const mysqlError = error as {
      code?: string;
      message?: string;
      sqlMessage?: string;
    };
    return (
      mysqlError.code === "ER_DUP_ENTRY" &&
      `${mysqlError.message ?? ""} ${mysqlError.sqlMessage ?? ""}`.includes(
        "uq_workers_organization_worker_code",
      )
    );
  }

  private recordAudit(
    eventName: string,
    actorId: string,
    organizationId: string,
    entityId: string,
    projectId?: string,
    metadata?: Record<string, unknown>,
  ) {
    void eventName;
    void actorId;
    void organizationId;
    void entityId;
    void projectId;
    void metadata;
    // Active audit persistence is not present yet. This hook keeps the Workers
    // integration point explicit without introducing a module-local audit store.
  }
}
