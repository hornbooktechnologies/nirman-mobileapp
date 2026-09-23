/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { createHash } from "node:crypto";
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

  it("rejects retired verification before writing state, audit, or notifications", async () => {
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
    ).rejects.toThrow("MATERIAL_STATUS_TRANSITION_INVALID");

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
  describe("Builder Owner request approval", () => {
    function mockRow(overrides: Record<string, unknown> = {}, owner = true) {
      database.query.mockImplementation(async (sql: string) => {
        if (sql.includes("FROM material_request_events")) return [];
        if (sql.includes("FROM organization_members om"))
          return [
            {
              memberId: actorMemberId,
              userId: actorUserId,
              isOwner: owner ? 1 : 0,
              canApprove: 1,
            },
            {
              memberId: "other-owner",
              userId: "other-owner-user",
              isOwner: 1,
              canApprove: 1,
            },
          ] as any;
        if (sql.includes("FROM material_requests mr"))
          return [{ ...requestRow, ...overrides }] as any;
        return [];
      });
    }
    const approval = {
      organizationId,
      projectId,
      materialRequestId: requestId,
      actorUserId,
      actorMemberId,
      expectedVersion: 2,
      idempotencyKey: "owner-approval-001",
      allowedFrom: ["PENDING_FINAL"] as const,
      nextStatus: "APPROVED" as const,
      eventType: "APPROVED" as const,
      auditAction: "materials.request.approved" as const,
      preventRequesterAction: true,
      actorIsOrganizationOwner: true,
    };

    it.each(["FINAL_APPROVAL", "VERIFY_THEN_FINAL", "DIRECT"])(
      "approves own %s submission with creator, event and audit intact",
      async (workflowMode) => {
        mockRow({ status: "DRAFT", workflowMode });
        await repository.transition({
          ...approval,
          allowedFrom: ["DRAFT"],
          eventType: "SUBMITTED",
          auditAction: "materials.request.submitted",
          preventRequesterAction: false,
          nextStatus:
            workflowMode === "FINAL_APPROVAL"
              ? "PENDING_FINAL"
              : "PENDING_VERIFICATION",
          notificationPermission: "materials:approve-final",
          notificationType: "MATERIAL_FINAL_APPROVAL_REQUIRED",
        });
        expect(database.execute).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE material_requests"),
          ["APPROVED", actorUserId, requestId, organizationId, projectId],
          connection,
        );
        expect(database.execute).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO material_request_events"),
          expect.arrayContaining([
            "SUBMITTED",
            "DRAFT",
            "APPROVED",
            actorUserId,
            actorMemberId,
          ]),
          connection,
        );
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            actorUserId,
            newValues: { status: "APPROVED", version: 3 },
            metadata: expect.objectContaining({
              approvalBasis: "ORGANIZATION_OWNER_REQUEST",
            }),
          }),
          connection,
        );
        expect(notifications.findProjectRecipients).not.toHaveBeenCalled();
        expect(notifications.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ type: "MATERIAL_REQUEST_APPROVED" }),
          ]),
          connection,
        );
      },
    );

    it.each(["PENDING_VERIFICATION", "PENDING_FINAL"])(
      "recovers own existing %s request",
      async (status) => {
        mockRow({ status });
        await repository.transition(approval);
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: "materials.request.approved",
            oldValues: { status, version: 2 },
            newValues: { status: "APPROVED", version: 3 },
          }),
          connection,
        );
      },
    );

    it.each([
      [false, actorMemberId, "FINAL_APPROVAL", "PENDING_FINAL"],
      [false, actorMemberId, "VERIFY_THEN_FINAL", "PENDING_VERIFICATION"],
      [true, "another-member", "VERIFY_THEN_FINAL", "PENDING_VERIFICATION"],
    ] as const)(
      "preserves standard submission: owner=%s requester=%s workflow=%s",
      async (
        actorIsOrganizationOwner,
        requestedByMemberId,
        workflowMode,
        nextStatus,
      ) => {
        mockRow(
          { status: "DRAFT", workflowMode, requestedByMemberId },
          actorIsOrganizationOwner,
        );
        await repository.transition({
          ...approval,
          actorIsOrganizationOwner,
          allowedFrom: ["DRAFT"],
          eventType: "SUBMITTED",
          auditAction: "materials.request.submitted",
          preventRequesterAction: false,
          nextStatus,
        });
        expect(database.execute).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE material_requests"),
          [nextStatus, actorUserId, requestId, organizationId, projectId],
          connection,
        );
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: {
              idempotencyKey: approval.idempotencyKey,
              comment: null,
            },
          }),
          connection,
        );
      },
    );

    it("does not bypass verification for another member's request", async () => {
      mockRow({ requestedByMemberId: "another-member" });
      await expect(repository.transition(approval)).rejects.toThrow(
        "MATERIAL_STATUS_TRANSITION_INVALID",
      );
      expect(database.execute).not.toHaveBeenCalled();
    });

    it("does not allow a non-owner to self-approve", async () => {
      mockRow({ status: "PENDING_FINAL" }, false);
      await expect(
        repository.transition({ ...approval, actorIsOrganizationOwner: false }),
      ).rejects.toThrow("MATERIAL_SELF_APPROVAL_FORBIDDEN");
      expect(database.execute).not.toHaveBeenCalled();
    });

    it("still forbids owner self-verification", async () => {
      mockRow();
      await expect(
        repository.transition({
          ...approval,
          allowedFrom: ["PENDING_VERIFICATION"],
          eventType: "VERIFIED",
          nextStatus: "PENDING_FINAL",
          auditAction: "materials.request.verified",
        }),
      ).rejects.toThrow("MATERIAL_STATUS_TRANSITION_INVALID");
      expect(database.execute).not.toHaveBeenCalled();
    });

    it("still rejects stale owner approval versions", async () => {
      mockRow();
      await expect(
        repository.transition({ ...approval, expectedVersion: 1 }),
      ).rejects.toThrow("MATERIAL_VERSION_CONFLICT");
      expect(database.execute).not.toHaveBeenCalled();
    });

    it("replays an owner approval without duplicate state, audit or notifications", async () => {
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            command: "APPROVED",
            expectedVersion: 2,
            comment: null,
          }),
        )
        .digest("hex");
      database.query.mockImplementation(async (sql: string) => {
        if (
          sql.includes("FROM material_request_events") &&
          sql.includes("idempotency_key")
        ) {
          return [
            { materialRequestId: requestId, requestFingerprint: fingerprint },
          ] as any;
        }
        if (sql.includes("FROM material_requests mr"))
          return [{ ...requestRow, status: "APPROVED" }] as any;
        return [];
      });
      await repository.transition(approval);
      expect(database.execute).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
      expect(notifications.createMany).not.toHaveBeenCalled();
    });
  });
});
