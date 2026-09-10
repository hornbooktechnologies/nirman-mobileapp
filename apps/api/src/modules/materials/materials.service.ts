import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ErrorCode,
  MaterialRequestStatus,
  PermissionKey,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type {
  ConfigureMaterialsDto,
  CreateMaterialRequestDto,
  MaterialCommandDto,
  QueryMaterialsDto,
  RecordMaterialDeliveryDto,
  RecordMaterialPurchaseDto,
  UpdateMaterialRequestDto,
} from "./dto/materials.dto";
import { MaterialsRepository } from "./materials.repository";

@Injectable()
export class MaterialsService {
  constructor(
    private readonly repository: MaterialsRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async findSettings(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "materials:read");
    const settings = await this.repository.findSettings(
      organizationId,
      projectId,
    );
    return settings
      ? { ...settings, configured: true }
      : {
        organizationId,
        projectId,
        workflowMode: null,
        configured: false,
      };
  }

  async configure(
    organizationId: string,
    projectId: string,
    dto: ConfigureMaterialsDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "materials:configure",
    );
    this.assertActiveProject(access.project.status);
    const settings = await this.repository.upsertSettings(
      organizationId,
      projectId,
      dto,
      actor.id,
    );
    return { ...settings, configured: true };
  }

  async findMany(
    organizationId: string,
    projectId: string,
    query: QueryMaterialsDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "materials:read");
    this.validateRange(query.requiredFrom, query.requiredTo);
    return this.repository.findMany(organizationId, projectId, query);
  }

  async summary(
    organizationId: string,
    projectId: string,
    query: QueryMaterialsDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "materials:read");
    this.validateRange(query.requiredFrom, query.requiredTo);
    return this.repository.summary(organizationId, projectId, query);
  }

  async findDetail(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "materials:read",
    );
    const detail = await this.repository.findDetail(
      organizationId,
      projectId,
      materialRequestId,
    );
    if (!detail) throw this.notFound();
    return this.withAvailableActions(
      detail,
      access.membership.id,
      access.permissions,
    );
  }

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateMaterialRequestDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "materials:create",
    );
    this.assertActiveProject(access.project.status);
    this.validateMaterialInput(
      dto.unitOfMeasure,
      dto.customUnitLabel,
      dto.requestedOn,
      dto.requiredByDate,
    );
    const settings = await this.repository.findSettings(
      organizationId,
      projectId,
    );
    if (!settings) {
      throw new BadRequestException(
        this.error(
          "MATERIAL_WORKFLOW_NOT_CONFIGURED",
          "Configure the Project Materials workflow before creating requests",
        ),
      );
    }
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.create(
        organizationId,
        projectId,
        this.normalizeCreate(dto),
        actor.id,
        access.membership.id,
        settings.workflowMode,
        ),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  async update(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: UpdateMaterialRequestDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "materials:update",
    );
    this.assertActiveProject(access.project.status);
    if (dto.unitOfMeasure || dto.customUnitLabel !== undefined) {
      this.validateMaterialInput(dto.unitOfMeasure, dto.customUnitLabel);
    }
    if (dto.requestedOn || dto.requiredByDate) {
      this.validateDateOrder(dto.requestedOn, dto.requiredByDate);
    }
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.update(
        organizationId,
        projectId,
        materialRequestId,
        this.normalizeUpdate(dto),
        actor.id,
        access.membership.id,
        access.permissions.includes("materials:approve-final"),
        ),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  submit(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: MaterialCommandDto,
    actor: AuthenticatedUser,
  ) {
    return this.command(
      organizationId,
      projectId,
      materialRequestId,
      dto,
      actor,
      "materials:update",
      {
        allowedFrom: ["DRAFT", "RETURNED_FOR_CHANGES"],
        nextStatus: (row) =>
          row.workflowMode === "DIRECT"
            ? "APPROVED"
            : row.workflowMode === "FINAL_APPROVAL"
              ? "PENDING_FINAL"
              : "PENDING_VERIFICATION",
        eventType: "SUBMITTED",
        auditAction: "materials.request.submitted",
        notification: (nextStatus) =>
          nextStatus === "PENDING_VERIFICATION"
            ? {
                permission: "materials:approve-level-1" as const,
                type: "MATERIAL_VERIFICATION_REQUIRED",
              }
            : nextStatus === "PENDING_FINAL"
              ? {
                  permission: "materials:approve-final" as const,
                  type: "MATERIAL_FINAL_APPROVAL_REQUIRED",
                }
              : null,
      },
    );
  }

  verify(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: MaterialCommandDto,
    actor: AuthenticatedUser,
  ) {
    return this.command(
      organizationId,
      projectId,
      materialRequestId,
      dto,
      actor,
      "materials:approve-level-1",
      {
        allowedFrom: ["PENDING_VERIFICATION"],
        nextStatus: "PENDING_FINAL",
        eventType: "VERIFIED",
        auditAction: "materials.request.verified",
        preventRequesterAction: true,
        notification: () => ({
          permission: "materials:approve-final",
          type: "MATERIAL_FINAL_APPROVAL_REQUIRED",
        }),
      },
    );
  }

  returnForChanges(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: MaterialCommandDto,
    actor: AuthenticatedUser,
  ) {
    this.requireComment(dto.comment, "A return comment is required");
    return this.command(
      organizationId,
      projectId,
      materialRequestId,
      dto,
      actor,
      "materials:reject",
      {
        allowedFrom: ["PENDING_VERIFICATION", "PENDING_FINAL"],
        nextStatus: "RETURNED_FOR_CHANGES",
        eventType: "RETURNED",
        auditAction: "materials.request.returned",
        preventRequesterAction: true,
      },
    );
  }

  approve(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: MaterialCommandDto,
    actor: AuthenticatedUser,
  ) {
    return this.command(
      organizationId,
      projectId,
      materialRequestId,
      dto,
      actor,
      "materials:approve-final",
      {
        allowedFrom: ["PENDING_FINAL"],
        nextStatus: "APPROVED",
        eventType: "APPROVED",
        auditAction: "materials.request.approved",
        preventRequesterAction: true,
      },
    );
  }

  reject(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: MaterialCommandDto,
    actor: AuthenticatedUser,
  ) {
    this.requireComment(dto.comment, "A rejection comment is required");
    return this.command(
      organizationId,
      projectId,
      materialRequestId,
      dto,
      actor,
      "materials:reject",
      {
        allowedFrom: ["PENDING_VERIFICATION", "PENDING_FINAL"],
        nextStatus: "REJECTED",
        eventType: "REJECTED",
        auditAction: "materials.request.rejected",
        preventRequesterAction: true,
      },
    );
  }

  cancel(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: MaterialCommandDto,
    actor: AuthenticatedUser,
  ) {
    this.requireComment(dto.comment, "A cancellation reason is required");
    return this.command(
      organizationId,
      projectId,
      materialRequestId,
      dto,
      actor,
      "materials:update",
      {
        allowedFrom: [
          "DRAFT",
          "RETURNED_FOR_CHANGES",
          "PENDING_VERIFICATION",
          "PENDING_FINAL",
          "APPROVED",
        ],
        nextStatus: "CANCELLED",
        eventType: "CANCELLED",
        auditAction: "materials.request.cancelled",
        requireRequesterUnlessElevated: true,
      },
    );
  }

  async recordPurchase(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: RecordMaterialPurchaseDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "materials:record-purchase",
    );
    this.assertActiveProject(access.project.status);
    const normalized = { ...dto };
    if (normalized.totalCost == null && normalized.unitCost != null) {
      normalized.totalCost = Number(
        (normalized.unitCost * normalized.orderedQuantity).toFixed(2),
      );
    }
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.recordPurchase(
        organizationId,
        projectId,
        materialRequestId,
        normalized,
        actor.id,
        access.membership.id,
        ),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  async recordDelivery(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: RecordMaterialDeliveryDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "materials:record-delivery",
    );
    this.assertActiveProject(access.project.status);
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.recordDelivery(
        organizationId,
        projectId,
        materialRequestId,
        dto,
        actor.id,
        access.membership.id,
        ),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  async export(
    organizationId: string,
    projectId: string,
    query: QueryMaterialsDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "materials:export");
    this.validateRange(query.requiredFrom, query.requiredTo);
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
    const csvRows = [
      [
        "Material",
        "Category",
        "Requested quantity",
        "Unit",
        "Requested on",
        "Required by",
        "Status",
        "Requested by",
        "Estimated cost",
        "Ordered quantity",
        "Delivered quantity",
        "Remaining quantity",
        "Purchase cost",
      ],
      ...rows.map((row) => [
        row.materialName,
        row.category ?? "",
        row.requestedQuantity,
        row.customUnitLabel ?? row.unitOfMeasure,
        row.requestedOn,
        row.requiredByDate ?? "",
        row.status,
        row.requestedBy,
        row.estimatedCost ?? "",
        row.orderedQuantity,
        row.deliveredQuantity,
        row.remainingQuantity,
        row.totalPurchaseCost,
      ]),
    ];
    return {
      filename: `materials-${projectId}.csv`,
      csv: `${csvRows
        .map((row) => row.map((cell) => this.csvCell(cell)).join(","))
        .join("\r\n")}\r\n`,
    };
  }

  private async command(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: MaterialCommandDto,
    actor: AuthenticatedUser,
    permission: PermissionKey,
    config: {
      allowedFrom: readonly MaterialRequestStatus[];
      nextStatus:
        | MaterialRequestStatus
        | ((row: { workflowMode: string }) => MaterialRequestStatus);
      eventType: Parameters<MaterialsRepository["transition"]>[0]["eventType"];
      auditAction: Parameters<
        MaterialsRepository["transition"]
      >[0]["auditAction"];
      preventRequesterAction?: boolean;
      requireRequesterUnlessElevated?: boolean;
      notification?: (
        nextStatus: MaterialRequestStatus,
      ) => { permission: PermissionKey; type: string } | null;
    },
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      permission,
    );
    this.assertActiveProject(access.project.status);
    const detail = await this.repository.findDetail(
      organizationId,
      projectId,
      materialRequestId,
    );
    if (!detail) throw this.notFound();
    const nextStatus =
      typeof config.nextStatus === "function"
        ? config.nextStatus(detail)
        : config.nextStatus;
    const notification = config.notification?.(nextStatus) ?? null;
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.transition({
        organizationId,
        projectId,
        materialRequestId,
        actorUserId: actor.id,
        actorMemberId: access.membership.id,
        expectedVersion: dto.expectedVersion,
        idempotencyKey: dto.idempotencyKey,
        comment: dto.comment,
        allowedFrom: config.allowedFrom,
        nextStatus,
        eventType: config.eventType,
        auditAction: config.auditAction,
        preventRequesterAction: config.preventRequesterAction,
        requireRequesterUnlessElevated: config.requireRequesterUnlessElevated,
        actorElevated: access.permissions.includes("materials:approve-final"),
        notificationPermission: notification?.permission,
          notificationType: notification?.type,
        }),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  private withAvailableActions<
    TDetail extends {
      status: MaterialRequestStatus;
      requestedByMemberId: string;
    },
  >(
    detail: TDetail | null,
    actorMemberId: string,
    permissions: readonly PermissionKey[],
  ) {
    if (!detail) throw this.notFound();
    return {
      ...detail,
      availableActions: this.availableActions(
        detail.status,
        detail.requestedByMemberId === actorMemberId,
        permissions,
      ),
    };
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

  private availableActions(
    status: MaterialRequestStatus,
    isRequester: boolean,
    permissions: readonly PermissionKey[],
  ) {
    const has = (permission: PermissionKey) => permissions.includes(permission);
    const actions: string[] = [];
    if (
      ["DRAFT", "RETURNED_FOR_CHANGES"].includes(status) &&
      has("materials:update")
    ) {
      actions.push("EDIT", "SUBMIT", "CANCEL");
    }
    if (
      status === "PENDING_VERIFICATION" &&
      !isRequester &&
      has("materials:approve-level-1")
    ) {
      actions.push("VERIFY");
    }
    if (
      ["PENDING_VERIFICATION", "PENDING_FINAL"].includes(status) &&
      !isRequester &&
      has("materials:reject")
    ) {
      actions.push("RETURN", "REJECT");
    }
    if (
      status === "PENDING_FINAL" &&
      !isRequester &&
      has("materials:approve-final")
    ) {
      actions.push("APPROVE");
    }
    if (
      ["APPROVED", "ORDERED", "PARTIALLY_DELIVERED"].includes(status) &&
      has("materials:record-purchase")
    ) {
      actions.push("RECORD_PURCHASE");
    }
    if (
      ["ORDERED", "PARTIALLY_DELIVERED"].includes(status) &&
      has("materials:record-delivery")
    ) {
      actions.push("RECORD_DELIVERY");
    }
    if (
      ["PENDING_VERIFICATION", "PENDING_FINAL", "APPROVED"].includes(status) &&
      has("materials:update")
    ) {
      actions.push("CANCEL");
    }
    return [...new Set(actions)];
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
      if (code === "MATERIAL_REQUEST_NOT_FOUND") throw this.notFound();
      if (
        code === "MATERIAL_VERSION_CONFLICT" ||
        code === "MATERIAL_IDEMPOTENCY_CONFLICT" ||
        code === "ER_DUP_ENTRY"
      ) {
        const conflictCode: ErrorCode =
          code === "ER_DUP_ENTRY" ? "MATERIAL_IDEMPOTENCY_CONFLICT" : code;
        throw new ConflictException(
          this.error(
            conflictCode,
            "The Materials request changed or this retry key conflicts",
          ),
        );
      }
      const badRequestCodes: ErrorCode[] = [
        "MATERIAL_STATUS_TRANSITION_INVALID",
        "MATERIAL_ACTION_NOT_ALLOWED",
        "MATERIAL_SELF_APPROVAL_FORBIDDEN",
        "MATERIAL_RESPONSIBLE_MEMBER_INVALID",
        "MATERIAL_PROJECT_ASSIGNMENT_INVALID",
        "MATERIAL_QUANTITY_INVALID",
        "MATERIAL_ORDER_QUANTITY_EXCEEDED",
        "MATERIAL_DELIVERY_QUANTITY_EXCEEDED",
        "MATERIAL_PURCHASE_REQUIRED",
        "MATERIAL_ALREADY_COMPLETED",
        "MATERIAL_CORRECTION_NOT_SUPPORTED",
      ];
      if (badRequestCodes.includes(code as ErrorCode)) {
        throw new BadRequestException(
          this.error(code as ErrorCode, this.message(code)),
        );
      }
      throw error;
    }
  }

  private normalizeCreate(dto: CreateMaterialRequestDto) {
    return {
      ...dto,
      category: dto.category?.trim() || null,
      customUnitLabel: dto.customUnitLabel?.trim() || null,
      notes: dto.notes?.trim() || null,
      idempotencyKey: dto.idempotencyKey.trim(),
    };
  }

  private normalizeUpdate(dto: UpdateMaterialRequestDto) {
    return {
      ...dto,
      category:
        dto.category === undefined ? undefined : dto.category?.trim() || null,
      customUnitLabel:
        dto.customUnitLabel === undefined
          ? undefined
          : dto.customUnitLabel?.trim() || null,
      notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
      idempotencyKey: dto.idempotencyKey.trim(),
    };
  }

  private validateMaterialInput(
    unit?: string,
    customUnitLabel?: string | null,
    requestedOn?: string,
    requiredByDate?: string | null,
  ) {
    if (unit === "OTHER" && !customUnitLabel?.trim()) {
      throw new BadRequestException(
        this.error(
          "VALIDATION_FAILED",
          "A custom unit label is required for OTHER",
        ),
      );
    }
    if (unit && unit !== "OTHER" && customUnitLabel?.trim()) {
      throw new BadRequestException(
        this.error(
          "VALIDATION_FAILED",
          "Custom unit label is allowed only for OTHER",
        ),
      );
    }
    this.validateDateOrder(requestedOn, requiredByDate);
  }

  private validateDateOrder(
    requestedOn?: string,
    requiredByDate?: string | null,
  ) {
    if (requestedOn && requiredByDate && requiredByDate < requestedOn) {
      throw new BadRequestException(
        this.error(
          "VALIDATION_FAILED",
          "Required-by date cannot be before request date",
        ),
      );
    }
  }

  private validateRange(start?: string, end?: string) {
    if (start && end && end < start) {
      throw new BadRequestException(
        this.error("VALIDATION_FAILED", "End date cannot be before start date"),
      );
    }
  }

  private requireComment(comment: string | null | undefined, message: string) {
    if (!comment?.trim()) {
      throw new BadRequestException(this.error("VALIDATION_FAILED", message));
    }
  }

  private assertActiveProject(status: string) {
    if (status !== "ACTIVE") {
      throw new BadRequestException(
        this.error(
          "PROJECT_STATUS_INVALID",
          "Materials writes require an active Project",
        ),
      );
    }
  }

  private notFound() {
    return new NotFoundException(
      this.error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found"),
    );
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }

  private message(code: string) {
    const messages: Record<string, string> = {
      MATERIAL_STATUS_TRANSITION_INVALID:
        "This Materials action is not valid in the current state",
      MATERIAL_SELF_APPROVAL_FORBIDDEN:
        "The requester cannot perform this approval action",
      MATERIAL_RESPONSIBLE_MEMBER_INVALID:
        "Responsible member must have active access to this Project",
      MATERIAL_ORDER_QUANTITY_EXCEEDED:
        "Ordered quantity cannot exceed requested quantity",
      MATERIAL_DELIVERY_QUANTITY_EXCEEDED:
        "Delivered quantity cannot exceed ordered quantity",
      MATERIAL_PURCHASE_REQUIRED: "Record a valid purchase before delivery",
    };
    return messages[code] ?? "The Materials request is invalid";
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
