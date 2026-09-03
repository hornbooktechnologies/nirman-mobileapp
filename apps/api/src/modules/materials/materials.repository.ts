import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type {
  MaterialAuditAction,
  MaterialEventType,
  MaterialRequestStatus,
  MaterialWorkflowMode,
  PermissionKey,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  ConfigureMaterialsDto,
  CreateMaterialRequestDto,
  QueryMaterialsDto,
  RecordMaterialDeliveryDto,
  RecordMaterialPurchaseDto,
  UpdateMaterialRequestDto,
} from "./dto/materials.dto";

export interface SettingRow extends RowDataPacket {
  id: string;
  organizationId: string;
  projectId: string;
  workflowMode: MaterialWorkflowMode;
  createdAt: Date;
  updatedAt: Date;
}

interface RequestRow extends RowDataPacket {
  id: string;
  organizationId: string;
  projectId: string;
  materialName: string;
  category: string | null;
  requestedQuantity: string;
  unitOfMeasure: string;
  customUnitLabel: string | null;
  requestedOn: Date | string;
  requiredByDate: Date | string | null;
  estimatedCost: string | null;
  responsibleContractorMemberId: string | null;
  requestedByMemberId: string;
  requestedBy: string;
  requestedByUserId: string;
  workflowMode: MaterialWorkflowMode;
  status: MaterialRequestStatus;
  notes: string | null;
  version: number;
  orderedQuantity: string;
  deliveredQuantity: string;
  remainingQuantity: string;
  totalPurchaseCost: string;
  requestFingerprint?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EventRow extends RowDataPacket {
  id: string;
  eventType: MaterialEventType;
  previousStatus: MaterialRequestStatus | null;
  nextStatus: MaterialRequestStatus;
  comment: string | null;
  actorUserId: string;
  actorName: string;
  createdAt: Date;
}

interface PurchaseRow extends RowDataPacket {
  id: string;
  orderedQuantity: string;
  vendorName: string | null;
  orderReference: string | null;
  unitCost: string | null;
  totalCost: string | null;
  purchasedOn: Date | string;
  notes: string | null;
  recordedBy: string;
  createdAt: Date;
}

interface DeliveryRow extends RowDataPacket {
  id: string;
  materialPurchaseId: string | null;
  deliveredQuantity: string;
  deliveredOn: Date | string;
  deliveryReference: string | null;
  notes: string | null;
  recordedBy: string;
  createdAt: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface SumRow extends RowDataPacket {
  value: string | null;
}

interface IdempotencyRow extends RowDataPacket {
  materialRequestId: string;
  requestFingerprint: string;
}

@Injectable()
export class MaterialsRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async findSettings(organizationId: string, projectId: string) {
    const rows = await this.database.query<SettingRow>(
      `SELECT id, organization_id organizationId, project_id projectId,
        workflow_mode workflowMode, created_at createdAt, updated_at updatedAt
       FROM project_material_settings
       WHERE organization_id = ? AND project_id = ? LIMIT 1`,
      [organizationId, projectId],
    );
    return rows[0] ?? null;
  }

  async upsertSettings(
    organizationId: string,
    projectId: string,
    dto: ConfigureMaterialsDto,
    actorUserId: string,
  ) {
    await this.database.transaction(async (connection) => {
      const existing = await this.database.query<SettingRow>(
        `SELECT id, workflow_mode workflowMode
         FROM project_material_settings
         WHERE organization_id = ? AND project_id = ? LIMIT 1 FOR UPDATE`,
        [organizationId, projectId],
        connection,
      );
      const id = existing[0]?.id ?? randomUUID();
      await this.database.execute(
        `INSERT INTO project_material_settings (
          id, organization_id, project_id, workflow_mode, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE workflow_mode = VALUES(workflow_mode),
          updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP(3)`,
        [
          id,
          organizationId,
          projectId,
          dto.workflowMode,
          actorUserId,
          actorUserId,
        ],
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId,
          action: "materials.settings.updated",
          entityType: "project_material_settings",
          entityId: id,
          oldValues: existing[0]
            ? { workflowMode: existing[0].workflowMode }
            : null,
          newValues: { workflowMode: dto.workflowMode },
        },
        connection,
      );
    });
    return this.findSettings(organizationId, projectId);
  }

  async findMany(
    organizationId: string,
    projectId: string,
    query: QueryMaterialsDto,
  ) {
    const { where, params } = this.buildWhere(organizationId, projectId, query);
    const [count] = await this.database.query<CountRow>(
      `SELECT COUNT(*) total FROM material_requests mr WHERE ${where}`,
      params,
    );
    const sortColumns = {
      requestedOn: "mr.requested_on",
      requiredByDate: "mr.required_by_date",
      updatedAt: "mr.updated_at",
      materialName: "mr.material_name",
    } as const;
    const sort = sortColumns[query.sortBy ?? "updatedAt"];
    const order = query.sortOrder === "asc" ? "ASC" : "DESC";
    const rows = await this.database.query<RequestRow>(
      `${this.requestSelect()}
       WHERE ${where}
       ORDER BY ${sort} ${order}, mr.id ${order}
       LIMIT ? OFFSET ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    const total = Number(count?.total ?? 0);
    return {
      items: rows.map((row) => this.mapRequest(row)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async summary(
    organizationId: string,
    projectId: string,
    query: QueryMaterialsDto,
  ) {
    const { where, params } = this.buildWhere(organizationId, projectId, query);
    const rows = await this.database.query<
      RowDataPacket & {
        status: MaterialRequestStatus;
        count: number;
        estimatedCost: string;
      }
    >(
      `SELECT status, COUNT(*) count, COALESCE(SUM(estimated_cost), 0) estimatedCost
       FROM material_requests mr WHERE ${where} GROUP BY status`,
      params,
    );
    const [purchase] = await this.database.query<SumRow>(
      `SELECT COALESCE(SUM(mp.total_cost), 0) value
       FROM material_purchases mp
       INNER JOIN material_requests mr
         ON mr.id = mp.material_request_id
        AND mr.organization_id = mp.organization_id
        AND mr.project_id = mp.project_id
       WHERE ${where}`,
      params,
    );
    const [overdue] = await this.database.query<CountRow>(
      `SELECT COUNT(*) total FROM material_requests mr
       WHERE ${where}
         AND mr.required_by_date < CURRENT_DATE
         AND mr.status NOT IN ('DELIVERED','REJECTED','CANCELLED')`,
      params,
    );
    return {
      totalRequests: rows.reduce((sum, row) => sum + Number(row.count), 0),
      overdueRequests: Number(overdue?.total ?? 0),
      estimatedCost: this.money(
        rows.reduce((sum, row) => sum + Number(row.estimatedCost), 0),
      ),
      purchaseCost: this.money(Number(purchase?.value ?? 0)),
      countsByStatus: Object.fromEntries(
        rows.map((row) => [row.status, Number(row.count)]),
      ),
    };
  }

  async findDetail(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    connection?: DatabaseConnection,
  ) {
    const rows = await this.database.query<RequestRow>(
      `${this.requestSelect()}
       WHERE mr.organization_id = ? AND mr.project_id = ? AND mr.id = ?
       LIMIT 1`,
      [organizationId, projectId, materialRequestId],
      connection,
    );
    if (!rows[0]) return null;
    const events = await this.database.query<EventRow>(
      `SELECT mre.id, mre.event_type eventType, mre.previous_status previousStatus,
        mre.next_status nextStatus, mre.comment, mre.actor_user_id actorUserId,
        u.name actorName, mre.created_at createdAt
       FROM material_request_events mre
       INNER JOIN user u ON u.id = mre.actor_user_id
       WHERE mre.organization_id = ? AND mre.project_id = ? AND mre.material_request_id = ?
       ORDER BY mre.created_at ASC, mre.id ASC`,
      [organizationId, projectId, materialRequestId],
      connection,
    );
    const purchases = await this.database.query<PurchaseRow>(
      `SELECT mp.id, mp.ordered_quantity orderedQuantity, mp.vendor_name vendorName,
        mp.order_reference orderReference, mp.unit_cost unitCost,
        mp.total_cost totalCost, mp.purchased_on purchasedOn, mp.notes,
        u.name recordedBy, mp.created_at createdAt
       FROM material_purchases mp INNER JOIN user u ON u.id = mp.recorded_by
       WHERE mp.organization_id = ? AND mp.project_id = ? AND mp.material_request_id = ?
       ORDER BY mp.purchased_on ASC, mp.created_at ASC`,
      [organizationId, projectId, materialRequestId],
      connection,
    );
    const deliveries = await this.database.query<DeliveryRow>(
      `SELECT md.id, md.material_purchase_id materialPurchaseId,
        md.delivered_quantity deliveredQuantity, md.delivered_on deliveredOn,
        md.delivery_reference deliveryReference, md.notes,
        u.name recordedBy, md.created_at createdAt
       FROM material_deliveries md INNER JOIN user u ON u.id = md.recorded_by
       WHERE md.organization_id = ? AND md.project_id = ? AND md.material_request_id = ?
       ORDER BY md.delivered_on ASC, md.created_at ASC`,
      [organizationId, projectId, materialRequestId],
      connection,
    );
    return {
      ...this.mapRequest(rows[0]),
      events: events.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      purchases: purchases.map((row) => ({
        ...row,
        purchasedOn: this.date(row.purchasedOn),
        createdAt: row.createdAt.toISOString(),
      })),
      deliveries: deliveries.map((row) => ({
        ...row,
        deliveredOn: this.date(row.deliveredOn),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateMaterialRequestDto,
    actorUserId: string,
    actorMemberId: string,
    workflowMode: MaterialWorkflowMode,
  ) {
    const fingerprint = this.fingerprint({ ...dto, workflowMode });
    const materialRequestId = await this.database.transaction(
      async (connection) => {
        const replay = await this.findCreateReplay(
          organizationId,
          dto.idempotencyKey,
          fingerprint,
          connection,
        );
        if (replay) return replay;
        if (dto.responsibleContractorMemberId) {
          await this.assertProjectMember(
            organizationId,
            projectId,
            dto.responsibleContractorMemberId,
            connection,
          );
        }
        const id = randomUUID();
        await this.database.execute(
          `INSERT INTO material_requests (
          id, organization_id, project_id, material_name, category,
          requested_quantity, unit_of_measure, custom_unit_label, requested_on,
          required_by_date, estimated_cost, responsible_contractor_member_id,
          requested_by_member_id, workflow_mode, status, notes,
          idempotency_key, request_fingerprint, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)`,
          [
            id,
            organizationId,
            projectId,
            dto.materialName,
            dto.category ?? null,
            this.quantity(dto.requestedQuantity),
            dto.unitOfMeasure,
            dto.customUnitLabel ?? null,
            dto.requestedOn,
            dto.requiredByDate ?? null,
            dto.estimatedCost == null ? null : this.money(dto.estimatedCost),
            dto.responsibleContractorMemberId ?? null,
            actorMemberId,
            workflowMode,
            dto.notes ?? null,
            dto.idempotencyKey,
            fingerprint,
            actorUserId,
            actorUserId,
          ],
          connection,
        );
        await this.insertEvent(
          connection,
          organizationId,
          projectId,
          id,
          "CREATED",
          null,
          "DRAFT",
          null,
          actorUserId,
          actorMemberId,
          dto.idempotencyKey,
          fingerprint,
        );
        await this.audit.record(
          {
            organizationId,
            projectId,
            actorUserId,
            action: "materials.request.created",
            entityType: "material_request",
            entityId: id,
            newValues: {
              materialName: dto.materialName,
              requestedQuantity: this.quantity(dto.requestedQuantity),
              unitOfMeasure: dto.unitOfMeasure,
              workflowMode,
              status: "DRAFT",
            },
            metadata: { idempotencyKey: dto.idempotencyKey },
          },
          connection,
        );
        return id;
      },
    );
    return this.findDetail(organizationId, projectId, materialRequestId);
  }

  async update(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: UpdateMaterialRequestDto,
    actorUserId: string,
    actorMemberId: string,
    allowOtherRequester: boolean,
  ) {
    const fingerprint = this.fingerprint(dto);
    await this.database.transaction(async (connection) => {
      if (
        await this.findEventReplay(
          organizationId,
          dto.idempotencyKey,
          fingerprint,
          materialRequestId,
          connection,
        )
      )
        return;
      const current = await this.lockRequest(
        organizationId,
        projectId,
        materialRequestId,
        connection,
      );
      this.assertVersionAndState(current, dto.expectedVersion, [
        "DRAFT",
        "RETURNED_FOR_CHANGES",
      ]);
      if (
        current.requestedByMemberId !== actorMemberId &&
        !allowOtherRequester
      ) {
        throw new Error("MATERIAL_ACTION_NOT_ALLOWED");
      }
      const responsible =
        dto.responsibleContractorMemberId === undefined
          ? current.responsibleContractorMemberId
          : dto.responsibleContractorMemberId;
      if (responsible) {
        await this.assertProjectMember(
          organizationId,
          projectId,
          responsible,
          connection,
        );
      }
      const next = {
        materialName: dto.materialName ?? current.materialName,
        category: dto.category === undefined ? current.category : dto.category,
        requestedQuantity:
          dto.requestedQuantity === undefined
            ? current.requestedQuantity
            : this.quantity(dto.requestedQuantity),
        unitOfMeasure: dto.unitOfMeasure ?? current.unitOfMeasure,
        customUnitLabel:
          dto.customUnitLabel === undefined
            ? current.customUnitLabel
            : dto.customUnitLabel,
        requestedOn: dto.requestedOn ?? this.date(current.requestedOn),
        requiredByDate:
          dto.requiredByDate === undefined
            ? current.requiredByDate
              ? this.date(current.requiredByDate)
              : null
            : dto.requiredByDate,
        estimatedCost:
          dto.estimatedCost === undefined
            ? current.estimatedCost
            : dto.estimatedCost == null
              ? null
              : this.money(dto.estimatedCost),
        responsible,
        notes: dto.notes === undefined ? current.notes : dto.notes,
      };
      await this.database.execute(
        `UPDATE material_requests SET material_name = ?, category = ?,
          requested_quantity = ?, unit_of_measure = ?, custom_unit_label = ?,
          requested_on = ?, required_by_date = ?, estimated_cost = ?,
          responsible_contractor_member_id = ?, notes = ?, version = version + 1,
          updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND organization_id = ? AND project_id = ?`,
        [
          next.materialName,
          next.category,
          next.requestedQuantity,
          next.unitOfMeasure,
          next.customUnitLabel,
          next.requestedOn,
          next.requiredByDate,
          next.estimatedCost,
          next.responsible,
          next.notes,
          actorUserId,
          materialRequestId,
          organizationId,
          projectId,
        ],
        connection,
      );
      await this.insertEvent(
        connection,
        organizationId,
        projectId,
        materialRequestId,
        "UPDATED",
        current.status,
        current.status,
        null,
        actorUserId,
        actorMemberId,
        dto.idempotencyKey,
        fingerprint,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId,
          action: "materials.request.updated",
          entityType: "material_request",
          entityId: materialRequestId,
          oldValues: { version: current.version },
          newValues: { ...next, version: current.version + 1 },
          metadata: { idempotencyKey: dto.idempotencyKey },
        },
        connection,
      );
    });
    return this.findDetail(organizationId, projectId, materialRequestId);
  }

  async transition(input: {
    organizationId: string;
    projectId: string;
    materialRequestId: string;
    actorUserId: string;
    actorMemberId: string;
    expectedVersion: number;
    idempotencyKey: string;
    comment?: string | null;
    allowedFrom: readonly MaterialRequestStatus[];
    nextStatus:
      MaterialRequestStatus | ((row: RequestRow) => MaterialRequestStatus);
    eventType: MaterialEventType;
    auditAction: MaterialAuditAction;
    preventRequesterAction?: boolean;
    requireRequesterUnlessElevated?: boolean;
    actorElevated?: boolean;
    notificationPermission?: PermissionKey;
    notificationType?: string;
  }) {
    const fingerprint = this.fingerprint({
      command: input.eventType,
      expectedVersion: input.expectedVersion,
      comment: input.comment ?? null,
    });
    await this.database.transaction(async (connection) => {
      if (
        await this.findEventReplay(
          input.organizationId,
          input.idempotencyKey,
          fingerprint,
          input.materialRequestId,
          connection,
        )
      )
        return;
      const current = await this.lockRequest(
        input.organizationId,
        input.projectId,
        input.materialRequestId,
        connection,
      );
      this.assertVersionAndState(
        current,
        input.expectedVersion,
        input.allowedFrom,
      );
      if (
        input.preventRequesterAction &&
        current.requestedByMemberId === input.actorMemberId
      ) {
        throw new Error("MATERIAL_SELF_APPROVAL_FORBIDDEN");
      }
      if (
        input.requireRequesterUnlessElevated &&
        current.requestedByMemberId !== input.actorMemberId &&
        !input.actorElevated
      ) {
        throw new Error("MATERIAL_ACTION_NOT_ALLOWED");
      }
      const nextStatus =
        typeof input.nextStatus === "function"
          ? input.nextStatus(current)
          : input.nextStatus;
      await this.database.execute(
        `UPDATE material_requests SET status = ?, version = version + 1,
          last_transition_at = CURRENT_TIMESTAMP(3), updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND organization_id = ? AND project_id = ?`,
        [
          nextStatus,
          input.actorUserId,
          input.materialRequestId,
          input.organizationId,
          input.projectId,
        ],
        connection,
      );
      const eventId = await this.insertEvent(
        connection,
        input.organizationId,
        input.projectId,
        input.materialRequestId,
        input.eventType,
        current.status,
        nextStatus,
        input.comment ?? null,
        input.actorUserId,
        input.actorMemberId,
        input.idempotencyKey,
        fingerprint,
      );
      await this.audit.record(
        {
          organizationId: input.organizationId,
          projectId: input.projectId,
          actorUserId: input.actorUserId,
          action: input.auditAction,
          entityType: "material_request",
          entityId: input.materialRequestId,
          oldValues: { status: current.status, version: current.version },
          newValues: { status: nextStatus, version: current.version + 1 },
          metadata: {
            idempotencyKey: input.idempotencyKey,
            comment: input.comment ?? null,
          },
        },
        connection,
      );
      await this.notifyTransition(
        connection,
        current,
        input,
        eventId,
        nextStatus,
      );
    });
    return this.findDetail(
      input.organizationId,
      input.projectId,
      input.materialRequestId,
    );
  }

  async recordPurchase(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: RecordMaterialPurchaseDto,
    actorUserId: string,
    actorMemberId: string,
  ) {
    const normalized = {
      ...dto,
      orderedQuantity: this.quantity(dto.orderedQuantity),
      unitCost: dto.unitCost == null ? null : this.money(dto.unitCost),
      totalCost: dto.totalCost == null ? null : this.money(dto.totalCost),
    };
    const fingerprint = this.fingerprint(normalized);
    await this.database.transaction(async (connection) => {
      if (
        await this.findMutationReplay(
          "material_purchases",
          organizationId,
          dto.idempotencyKey,
          fingerprint,
          materialRequestId,
          connection,
        )
      )
        return;
      const current = await this.lockRequest(
        organizationId,
        projectId,
        materialRequestId,
        connection,
      );
      this.assertVersionAndState(current, dto.expectedVersion, [
        "APPROVED",
        "ORDERED",
        "PARTIALLY_DELIVERED",
      ]);
      const [sum] = await this.database.query<SumRow>(
        `SELECT COALESCE(SUM(ordered_quantity), 0) value
         FROM material_purchases WHERE material_request_id = ? FOR UPDATE`,
        [materialRequestId],
        connection,
      );
      if (
        Number(sum?.value ?? 0) + dto.orderedQuantity >
        Number(current.requestedQuantity)
      ) {
        throw new Error("MATERIAL_ORDER_QUANTITY_EXCEEDED");
      }
      const purchaseId = randomUUID();
      await this.database.execute(
        `INSERT INTO material_purchases (
          id, material_request_id, organization_id, project_id, ordered_quantity,
          vendor_name, order_reference, unit_cost, total_cost, purchased_on,
          notes, recorded_by, idempotency_key, request_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseId,
          materialRequestId,
          organizationId,
          projectId,
          normalized.orderedQuantity,
          dto.vendorName ?? null,
          dto.orderReference ?? null,
          normalized.unitCost,
          normalized.totalCost,
          dto.purchasedOn,
          dto.notes ?? null,
          actorUserId,
          dto.idempotencyKey,
          fingerprint,
        ],
        connection,
      );
      const nextStatus: MaterialRequestStatus =
        current.status === "PARTIALLY_DELIVERED"
          ? "PARTIALLY_DELIVERED"
          : "ORDERED";
      await this.database.execute(
        `UPDATE material_requests SET status = ?, version = version + 1,
          last_transition_at = CURRENT_TIMESTAMP(3), updated_by = ?
         WHERE id = ? AND organization_id = ? AND project_id = ?`,
        [nextStatus, actorUserId, materialRequestId, organizationId, projectId],
        connection,
      );
      const eventId = await this.insertEvent(
        connection,
        organizationId,
        projectId,
        materialRequestId,
        "PURCHASE_RECORDED",
        current.status,
        nextStatus,
        dto.comment ?? null,
        actorUserId,
        actorMemberId,
        dto.idempotencyKey,
        fingerprint,
        { purchaseId, orderedQuantity: normalized.orderedQuantity },
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId,
          action: "materials.purchase.recorded",
          entityType: "material_purchase",
          entityId: purchaseId,
          newValues: {
            materialRequestId,
            orderedQuantity: normalized.orderedQuantity,
            totalCost: normalized.totalCost,
          },
          metadata: { idempotencyKey: dto.idempotencyKey },
        },
        connection,
      );
      await this.notifyRequester(
        connection,
        current,
        eventId,
        "MATERIAL_PURCHASE_RECORDED",
        "Material purchase recorded",
        `${current.materialName} has been ordered.`,
      );
    });
    return this.findDetail(organizationId, projectId, materialRequestId);
  }

  async recordDelivery(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    dto: RecordMaterialDeliveryDto,
    actorUserId: string,
    actorMemberId: string,
  ) {
    const normalizedQuantity = this.quantity(dto.deliveredQuantity);
    const fingerprint = this.fingerprint({
      ...dto,
      deliveredQuantity: normalizedQuantity,
    });
    await this.database.transaction(async (connection) => {
      if (
        await this.findMutationReplay(
          "material_deliveries",
          organizationId,
          dto.idempotencyKey,
          fingerprint,
          materialRequestId,
          connection,
        )
      )
        return;
      const current = await this.lockRequest(
        organizationId,
        projectId,
        materialRequestId,
        connection,
      );
      this.assertVersionAndState(current, dto.expectedVersion, [
        "ORDERED",
        "PARTIALLY_DELIVERED",
      ]);
      const [ordered] = await this.database.query<SumRow>(
        `SELECT COALESCE(SUM(ordered_quantity), 0) value
         FROM material_purchases WHERE material_request_id = ? FOR UPDATE`,
        [materialRequestId],
        connection,
      );
      const [delivered] = await this.database.query<SumRow>(
        `SELECT COALESCE(SUM(delivered_quantity), 0) value
         FROM material_deliveries WHERE material_request_id = ? FOR UPDATE`,
        [materialRequestId],
        connection,
      );
      const orderedTotal = Number(ordered?.value ?? 0);
      const deliveredTotal =
        Number(delivered?.value ?? 0) + dto.deliveredQuantity;
      if (orderedTotal <= 0) throw new Error("MATERIAL_PURCHASE_REQUIRED");
      if (deliveredTotal > orderedTotal) {
        throw new Error("MATERIAL_DELIVERY_QUANTITY_EXCEEDED");
      }
      if (dto.materialPurchaseId) {
        const purchase = await this.database.query<RowDataPacket>(
          `SELECT id FROM material_purchases
           WHERE id = ? AND material_request_id = ? AND organization_id = ? AND project_id = ?
           LIMIT 1`,
          [
            dto.materialPurchaseId,
            materialRequestId,
            organizationId,
            projectId,
          ],
          connection,
        );
        if (!purchase[0]) throw new Error("MATERIAL_PURCHASE_REQUIRED");
      }
      const nextStatus: MaterialRequestStatus =
        deliveredTotal === Number(current.requestedQuantity)
          ? "DELIVERED"
          : "PARTIALLY_DELIVERED";
      const deliveryId = randomUUID();
      await this.database.execute(
        `INSERT INTO material_deliveries (
          id, material_request_id, material_purchase_id, organization_id,
          project_id, delivered_quantity, delivered_on, delivery_reference,
          notes, recorded_by, idempotency_key, request_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryId,
          materialRequestId,
          dto.materialPurchaseId ?? null,
          organizationId,
          projectId,
          normalizedQuantity,
          dto.deliveredOn,
          dto.deliveryReference ?? null,
          dto.notes ?? null,
          actorUserId,
          dto.idempotencyKey,
          fingerprint,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE material_requests SET status = ?, version = version + 1,
          last_transition_at = CURRENT_TIMESTAMP(3), updated_by = ?
         WHERE id = ? AND organization_id = ? AND project_id = ?`,
        [nextStatus, actorUserId, materialRequestId, organizationId, projectId],
        connection,
      );
      const eventId = await this.insertEvent(
        connection,
        organizationId,
        projectId,
        materialRequestId,
        "DELIVERY_RECORDED",
        current.status,
        nextStatus,
        dto.comment ?? null,
        actorUserId,
        actorMemberId,
        dto.idempotencyKey,
        fingerprint,
        { deliveryId, deliveredQuantity: normalizedQuantity },
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId,
          action: "materials.delivery.recorded",
          entityType: "material_delivery",
          entityId: deliveryId,
          newValues: {
            materialRequestId,
            deliveredQuantity: normalizedQuantity,
            status: nextStatus,
          },
          metadata: { idempotencyKey: dto.idempotencyKey },
        },
        connection,
      );
      await this.notifyRequester(
        connection,
        current,
        eventId,
        "MATERIAL_DELIVERY_RECORDED",
        nextStatus === "DELIVERED"
          ? "Material delivered"
          : "Partial delivery recorded",
        `${current.materialName} delivery has been recorded.`,
      );
    });
    return this.findDetail(organizationId, projectId, materialRequestId);
  }

  fingerprint(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private requestSelect() {
    return `SELECT mr.id, mr.organization_id organizationId,
      mr.project_id projectId, mr.material_name materialName, mr.category,
      mr.requested_quantity requestedQuantity, mr.unit_of_measure unitOfMeasure,
      mr.custom_unit_label customUnitLabel, mr.requested_on requestedOn,
      mr.required_by_date requiredByDate, mr.estimated_cost estimatedCost,
      mr.responsible_contractor_member_id responsibleContractorMemberId,
      mr.requested_by_member_id requestedByMemberId, requester.name requestedBy,
      requester.id requestedByUserId, mr.workflow_mode workflowMode, mr.status,
      mr.notes, mr.version,
      COALESCE((SELECT SUM(mp.ordered_quantity) FROM material_purchases mp
        WHERE mp.material_request_id = mr.id), 0) orderedQuantity,
      COALESCE((SELECT SUM(md.delivered_quantity) FROM material_deliveries md
        WHERE md.material_request_id = mr.id), 0) deliveredQuantity,
      GREATEST(COALESCE((SELECT SUM(mp.ordered_quantity) FROM material_purchases mp
        WHERE mp.material_request_id = mr.id), 0) -
        COALESCE((SELECT SUM(md.delivered_quantity) FROM material_deliveries md
        WHERE md.material_request_id = mr.id), 0), 0) remainingQuantity,
      COALESCE((SELECT SUM(mp.total_cost) FROM material_purchases mp
        WHERE mp.material_request_id = mr.id), 0) totalPurchaseCost,
      mr.created_at createdAt, mr.updated_at updatedAt
      FROM material_requests mr
      INNER JOIN organization_members requester_member
        ON requester_member.id = mr.requested_by_member_id
       AND requester_member.organization_id = mr.organization_id
      INNER JOIN user requester ON requester.id = requester_member.user_id`;
  }

  private buildWhere(
    organizationId: string,
    projectId: string,
    query: QueryMaterialsDto,
  ) {
    const conditions = ["mr.organization_id = ?", "mr.project_id = ?"];
    const params: Array<string | number> = [organizationId, projectId];
    if (query.search) {
      conditions.push("(mr.material_name LIKE ? OR mr.category LIKE ?)");
      params.push(`%${query.search}%`, `%${query.search}%`);
    }
    if (query.status) {
      conditions.push("mr.status = ?");
      params.push(query.status);
    }
    if (query.requestedByMemberId) {
      conditions.push("mr.requested_by_member_id = ?");
      params.push(query.requestedByMemberId);
    }
    if (query.responsibleContractorMemberId) {
      conditions.push("mr.responsible_contractor_member_id = ?");
      params.push(query.responsibleContractorMemberId);
    }
    if (query.requiredFrom) {
      conditions.push("mr.required_by_date >= ?");
      params.push(query.requiredFrom);
    }
    if (query.requiredTo) {
      conditions.push("mr.required_by_date <= ?");
      params.push(query.requiredTo);
    }
    return { where: conditions.join(" AND "), params };
  }

  private async lockRequest(
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<RequestRow>(
      `SELECT mr.id, mr.organization_id organizationId, mr.project_id projectId,
        mr.material_name materialName, mr.category,
        mr.requested_quantity requestedQuantity, mr.unit_of_measure unitOfMeasure,
        mr.custom_unit_label customUnitLabel, mr.requested_on requestedOn,
        mr.required_by_date requiredByDate, mr.estimated_cost estimatedCost,
        mr.responsible_contractor_member_id responsibleContractorMemberId,
        mr.requested_by_member_id requestedByMemberId,
        requester.id requestedByUserId, requester.name requestedBy,
        mr.workflow_mode workflowMode, mr.status, mr.notes, mr.version,
        '0.000' orderedQuantity, '0.000' deliveredQuantity,
        '0.000' remainingQuantity, '0.00' totalPurchaseCost,
        mr.created_at createdAt, mr.updated_at updatedAt
       FROM material_requests mr
       INNER JOIN organization_members requester_member
         ON requester_member.id = mr.requested_by_member_id
        AND requester_member.organization_id = mr.organization_id
       INNER JOIN user requester ON requester.id = requester_member.user_id
       WHERE mr.organization_id = ? AND mr.project_id = ? AND mr.id = ?
       LIMIT 1 FOR UPDATE`,
      [organizationId, projectId, materialRequestId],
      connection,
    );
    if (!rows[0]) throw new Error("MATERIAL_REQUEST_NOT_FOUND");
    return rows[0];
  }

  private assertVersionAndState(
    current: RequestRow,
    expectedVersion: number,
    allowed: readonly MaterialRequestStatus[],
  ) {
    if (current.version !== expectedVersion)
      throw new Error("MATERIAL_VERSION_CONFLICT");
    if (!allowed.includes(current.status)) {
      throw new Error("MATERIAL_STATUS_TRANSITION_INVALID");
    }
  }

  private async assertProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<RowDataPacket>(
      `SELECT om.id FROM organization_members om
       LEFT JOIN project_members pm
         ON pm.organization_id = om.organization_id
        AND pm.project_id = ? AND pm.member_id = om.id
        AND pm.status = 'ACTIVE'
        AND (pm.starts_on IS NULL OR pm.starts_on <= CURRENT_DATE)
        AND (pm.ends_on IS NULL OR pm.ends_on >= CURRENT_DATE)
       WHERE om.id = ? AND om.organization_id = ? AND om.status = 'ACTIVE'
         AND (om.organization_wide_project_access = 1 OR pm.id IS NOT NULL)
       LIMIT 1`,
      [projectId, memberId, organizationId],
      connection,
    );
    if (!rows[0]) throw new Error("MATERIAL_RESPONSIBLE_MEMBER_INVALID");
  }

  private async findCreateReplay(
    organizationId: string,
    idempotencyKey: string,
    fingerprint: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<
      RowDataPacket & { id: string; requestFingerprint: string }
    >(
      `SELECT id, request_fingerprint requestFingerprint FROM material_requests
       WHERE organization_id = ? AND idempotency_key = ? LIMIT 1 FOR UPDATE`,
      [organizationId, idempotencyKey],
      connection,
    );
    if (!rows[0]) return null;
    if (rows[0].requestFingerprint !== fingerprint) {
      throw new Error("MATERIAL_IDEMPOTENCY_CONFLICT");
    }
    return rows[0].id;
  }

  private async findEventReplay(
    organizationId: string,
    idempotencyKey: string,
    fingerprint: string,
    materialRequestId: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<IdempotencyRow>(
      `SELECT material_request_id materialRequestId,
        request_fingerprint requestFingerprint
       FROM material_request_events
       WHERE organization_id = ? AND idempotency_key = ? LIMIT 1 FOR UPDATE`,
      [organizationId, idempotencyKey],
      connection,
    );
    if (!rows[0]) return false;
    if (
      rows[0].materialRequestId !== materialRequestId ||
      rows[0].requestFingerprint !== fingerprint
    ) {
      throw new Error("MATERIAL_IDEMPOTENCY_CONFLICT");
    }
    return true;
  }

  private async findMutationReplay(
    table: "material_purchases" | "material_deliveries",
    organizationId: string,
    idempotencyKey: string,
    fingerprint: string,
    materialRequestId: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<IdempotencyRow>(
      `SELECT material_request_id materialRequestId,
        request_fingerprint requestFingerprint
       FROM ${table}
       WHERE organization_id = ? AND idempotency_key = ? LIMIT 1 FOR UPDATE`,
      [organizationId, idempotencyKey],
      connection,
    );
    if (!rows[0]) return false;
    if (
      rows[0].materialRequestId !== materialRequestId ||
      rows[0].requestFingerprint !== fingerprint
    ) {
      throw new Error("MATERIAL_IDEMPOTENCY_CONFLICT");
    }
    return true;
  }

  private async insertEvent(
    connection: DatabaseConnection,
    organizationId: string,
    projectId: string,
    materialRequestId: string,
    eventType: MaterialEventType,
    previousStatus: MaterialRequestStatus | null,
    nextStatus: MaterialRequestStatus,
    comment: string | null,
    actorUserId: string,
    actorMemberId: string,
    idempotencyKey: string,
    requestFingerprint: string,
    metadata?: Record<string, unknown>,
  ) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO material_request_events (
        id, material_request_id, organization_id, project_id, event_type,
        previous_status, next_status, comment, actor_user_id, actor_member_id,
        metadata, idempotency_key, request_fingerprint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        materialRequestId,
        organizationId,
        projectId,
        eventType,
        previousStatus,
        nextStatus,
        comment,
        actorUserId,
        actorMemberId,
        metadata ? JSON.stringify(metadata) : null,
        idempotencyKey,
        requestFingerprint,
      ],
      connection,
    );
    return id;
  }

  private async notifyTransition(
    connection: DatabaseConnection,
    current: RequestRow,
    input: {
      organizationId: string;
      projectId: string;
      materialRequestId: string;
      actorUserId: string;
      notificationPermission?: PermissionKey;
      notificationType?: string;
    },
    eventId: string,
    nextStatus: MaterialRequestStatus,
  ) {
    if (input.notificationPermission && input.notificationType) {
      const recipients = await this.notifications.findProjectRecipients(
        input.organizationId,
        input.projectId,
        input.notificationPermission,
        connection,
      );
      await this.notifications.createMany(
        recipients
          .filter((userId) => userId !== input.actorUserId)
          .map((userId) => ({
            organizationId: input.organizationId,
            projectId: input.projectId,
            userId,
            type: input.notificationType!,
            title:
              nextStatus === "PENDING_VERIFICATION"
                ? "Material verification required"
                : "Material approval required",
            message: `${current.materialName} is waiting for your review.`,
            referenceType: "material_request",
            referenceId: input.materialRequestId,
            deepLink: `/materials/${input.materialRequestId}?projectId=${input.projectId}`,
            metadata: { status: nextStatus, eventId },
            dedupeKey: `${eventId}:${input.notificationType}`,
          })),
        connection,
      );
      return;
    }
    if (["RETURNED_FOR_CHANGES", "APPROVED", "REJECTED"].includes(nextStatus)) {
      const type =
        nextStatus === "RETURNED_FOR_CHANGES"
          ? "MATERIAL_REQUEST_RETURNED"
          : nextStatus === "APPROVED"
            ? "MATERIAL_REQUEST_APPROVED"
            : "MATERIAL_REQUEST_REJECTED";
      await this.notifyRequester(
        connection,
        current,
        eventId,
        type,
        `Material request ${nextStatus.toLowerCase().replaceAll("_", " ")}`,
        `${current.materialName} is now ${nextStatus.toLowerCase().replaceAll("_", " ")}.`,
      );
    }
  }

  private async notifyRequester(
    connection: DatabaseConnection,
    current: RequestRow,
    eventId: string,
    type: string,
    title: string,
    message: string,
  ) {
    await this.notifications.createMany(
      [
        {
          organizationId: current.organizationId,
          projectId: current.projectId,
          userId: current.requestedByUserId,
          type,
          title,
          message,
          referenceType: "material_request",
          referenceId: current.id,
          deepLink: `/materials/${current.id}?projectId=${current.projectId}`,
          metadata: { status: current.status, eventId },
          dedupeKey: `${eventId}:${type}`,
        },
      ],
      connection,
    );
  }

  private mapRequest(row: RequestRow) {
    return {
      ...row,
      requestedOn: this.date(row.requestedOn),
      requiredByDate: row.requiredByDate ? this.date(row.requiredByDate) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private date(value: Date | string) {
    if (typeof value === "string") return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
  }

  private quantity(value: number) {
    return value.toFixed(3);
  }

  private money(value: number) {
    return value.toFixed(2);
  }
}
