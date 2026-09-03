/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { DatabaseService } from "../../database/database.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MaterialsRepository } from "./materials.repository";

describe("MaterialsRepository transactional guards", () => {
  const connection = { execute: jest.fn(), query: jest.fn() } as any;
  const database = {
    transaction: jest.fn(async (operation: (value: any) => Promise<unknown>) =>
      operation(connection),
    ),
    query: jest.fn(),
    execute: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
  const notifications = {
    createMany: jest.fn(),
    findProjectRecipients: jest.fn(),
  } as unknown as jest.Mocked<NotificationsService>;
  const repository = new MaterialsRepository(database, audit, notifications);
  const organizationId = "00000000-0000-4000-8000-000000000010";
  const projectId = "00000000-0000-4000-8000-000000000020";
  const requestId = "00000000-0000-4000-8000-000000000030";
  const actorUserId = "00000000-0000-4000-8000-000000000001";
  const actorMemberId = "00000000-0000-4000-8000-000000000040";

  const requestRow = {
    id: requestId,
    organizationId,
    projectId,
    materialName: "Cement",
    category: null,
    requestedQuantity: "10.000",
    unitOfMeasure: "BAG",
    customUnitLabel: null,
    requestedOn: "2026-09-01",
    requiredByDate: null,
    estimatedCost: null,
    responsibleContractorMemberId: null,
    requestedByMemberId: actorMemberId,
    requestedBy: "Requester",
    requestedByUserId: actorUserId,
    workflowMode: "VERIFY_THEN_FINAL",
    status: "PENDING_VERIFICATION",
    notes: null,
    version: 2,
    orderedQuantity: "0.000",
    deliveredQuantity: "0.000",
    remainingQuantity: "0.000",
    totalPurchaseCost: "0.00",
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects requester self-verification before writing state, audit, or notifications", async () => {
    database.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM material_request_events")) return [];
      if (
        sql.includes("FROM material_requests mr") &&
        sql.includes("FOR UPDATE")
      ) {
        return [requestRow] as any;
      }
      return [];
    });

    await expect(
      repository.transition({
        organizationId,
        projectId,
        materialRequestId: requestId,
        actorUserId,
        actorMemberId,
        expectedVersion: 2,
        idempotencyKey: "verify-request-001",
        allowedFrom: ["PENDING_VERIFICATION"],
        nextStatus: "PENDING_FINAL",
        eventType: "VERIFIED",
        auditAction: "materials.request.verified",
        preventRequesterAction: true,
      }),
    ).rejects.toThrow("MATERIAL_SELF_APPROVAL_FORBIDDEN");

    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it("locks totals and rejects a concurrent over-delivery before inserts", async () => {
    database.query.mockImplementation(async (sql: string) => {
      if (
        sql.includes("FROM material_deliveries") &&
        sql.includes("idempotency_key")
      ) {
        return [];
      }
      if (
        sql.includes("FROM material_requests mr") &&
        sql.includes("FOR UPDATE")
      ) {
        return [
          {
            ...requestRow,
            requestedByMemberId: "00000000-0000-4000-8000-000000000099",
            status: "PARTIALLY_DELIVERED",
            version: 4,
          },
        ] as any;
      }
      if (sql.includes("SUM(ordered_quantity)"))
        return [{ value: "10.000" }] as any;
      if (sql.includes("SUM(delivered_quantity)"))
        return [{ value: "8.000" }] as any;
      return [];
    });

    await expect(
      repository.recordDelivery(
        organizationId,
        projectId,
        requestId,
        {
          deliveredQuantity: 3,
          deliveredOn: "2026-09-01",
          expectedVersion: 4,
          idempotencyKey: "delivery-request-001",
        },
        actorUserId,
        actorMemberId,
      ),
    ).rejects.toThrow("MATERIAL_DELIVERY_QUANTITY_EXCEEDED");

    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(notifications.createMany).not.toHaveBeenCalled();
  });
});
