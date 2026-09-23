/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import "reflect-metadata";
import { validate } from "class-validator";
import { ConfigureMaterialsDto } from "./dto/materials.dto";
import { MaterialsRepository } from "./materials.repository";
import { withMaterialApprovalPermissions } from "../project-access/material-approval-policy";

describe("Materials approval pool", () => {
  const connection = {};
  let row: {
    id: string;
    status: string;
    version: number;
    workflowMode: string;
    materialName: string;
    requestedByMemberId: string;
    requestedByUserId: string;
  };
  let members: {
    memberId: string;
    userId: string;
    isOwner: number;
    canApprove: number;
    delegated: number;
  }[];
  const database = {
    query: jest.fn(),
    execute: jest.fn(),
    transaction: jest.fn(async (run: (value: object) => Promise<unknown>) =>
      run(connection),
    ),
  };
  const audit = { record: jest.fn() };
  const notifications = {
    createMany: jest.fn<
      Promise<void>,
      [readonly { userId: string }[], object?]
    >(),
  };
  const repository = new MaterialsRepository(
    database as any,
    audit as any,
    notifications as any,
  );
  const command = {
    organizationId: "org",
    projectId: "project",
    materialRequestId: "request",
    actorUserId: "delegate-user",
    actorMemberId: "delegate",
    expectedVersion: 1,
    idempotencyKey: "decision-001",
    allowedFrom: ["PENDING_FINAL"] as const,
    nextStatus: "APPROVED" as const,
    eventType: "APPROVED" as const,
    auditAction: "materials.request.approved" as const,
    preventRequesterAction: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    row = {
      id: "request",
      status: "PENDING_FINAL",
      version: 1,
      workflowMode: "FINAL_APPROVAL",
      materialName: "Cement",
      requestedByMemberId: "supervisor",
      requestedByUserId: "supervisor-user",
    };
    members = [
      {
        memberId: "owner",
        userId: "owner-user",
        isOwner: 1,
        canApprove: 1,
        delegated: 0,
      },
      {
        memberId: "delegate",
        userId: "delegate-user",
        isOwner: 0,
        canApprove: 1,
        delegated: 1,
      },
      {
        memberId: "supervisor",
        userId: "supervisor-user",
        isOwner: 0,
        canApprove: 0,
        delegated: 0,
      },
    ];
    database.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM material_request_events")) return [];
      if (sql.includes("FROM organization_members om")) return members;
      if (sql.includes("FROM material_requests mr")) return [row];
      if (sql.includes("FROM project_material_settings"))
        return [{ id: "settings", version: 1 }];
      return [];
    });
    database.execute.mockImplementation(
      async (sql: string, args: unknown[]) => {
        if (sql.includes("UPDATE material_requests SET status"))
          row = { ...row, status: args[0] as string, version: row.version + 1 };
        return { affectedRows: 1 };
      },
    );
    jest
      .spyOn(repository, "findDetail")
      .mockImplementation(async () => row as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it("accepts only the two configuration modes", async () => {
    for (const workflowMode of [
      "DIRECT",
      "FINAL_APPROVAL",
      "VERIFY_THEN_FINAL",
    ]) {
      const dto = Object.assign(new ConfigureMaterialsDto(), { workflowMode });
      expect((await validate(dto)).length === 0).toBe(
        workflowMode !== "VERIFY_THEN_FINAL",
      );
    }
  });

  it("notifies Owner and delegate, excluding the requester even if delegated", async () => {
    row.status = "DRAFT";
    members[2].canApprove = 1;
    await repository.transition({
      ...command,
      actorUserId: "supervisor-user",
      actorMemberId: "supervisor",
      eventType: "SUBMITTED",
      auditAction: "materials.request.submitted",
      allowedFrom: ["DRAFT"],
      nextStatus: "PENDING_FINAL",
      preventRequesterAction: false,
      notificationPermission: "materials:approve-final",
      notificationType: "MATERIAL_FINAL_APPROVAL_REQUIRED",
    });
    expect(
      notifications.createMany.mock.calls[0][0].map((n) => n.userId),
    ).toEqual(["owner-user", "delegate-user"]);
  });

  it("refuses submission when nobody other than the requester can approve", async () => {
    row.status = "DRAFT";
    members = [members[2]];
    await expect(
      repository.transition({
        ...command,
        actorUserId: "supervisor-user",
        actorMemberId: "supervisor",
        eventType: "SUBMITTED",
        auditAction: "materials.request.submitted",
        allowedFrom: ["DRAFT"],
        nextStatus: "PENDING_FINAL",
        preventRequesterAction: false,
      }),
    ).rejects.toThrow("MATERIAL_APPROVER_REQUIRED");
    expect(database.execute).not.toHaveBeenCalled();
  });

  it.each(["APPROVED", "RETURNED", "REJECTED"] as const)(
    "rechecks revoked authority for %s inside the transaction",
    async (eventType) => {
      members[1].canApprove = 0;
      await expect(
        repository.transition({ ...command, eventType }),
      ).rejects.toThrow("MATERIAL_ACTION_NOT_ALLOWED");
      expect(database.execute).not.toHaveBeenCalled();
    },
  );

  it("does not allow a delegated requester to approve their own request", async () => {
    row.requestedByMemberId = "delegate";
    await expect(repository.transition(command)).rejects.toThrow(
      "MATERIAL_SELF_APPROVAL_FORBIDDEN",
    );
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("allows an eligible Owner's own request, independently of the earlier service flag", async () => {
    row.requestedByMemberId = "owner";
    await repository.transition({
      ...command,
      actorMemberId: "owner",
      actorUserId: "owner-user",
    });
    expect(row.status).toBe("APPROVED");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          approvalBasis: "ORGANIZATION_OWNER_REQUEST",
        }),
      }),
      connection,
    );
  });

  it("accepts the first decision and rejects the next decision using its old version", async () => {
    await repository.transition(command);
    await expect(
      repository.transition({
        ...command,
        actorMemberId: "owner",
        actorUserId: "owner-user",
        idempotencyKey: "decision-002",
      }),
    ).rejects.toThrow("MATERIAL_VERSION_CONFLICT");
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it("does not allow a delegate to change approval assignments", async () => {
    await expect(
      repository.upsertSettings(
        "org",
        "project",
        {
          workflowMode: "FINAL_APPROVAL",
          approverMemberIds: [],
          expectedVersion: 1,
        },
        "delegate-user",
      ),
    ).rejects.toThrow("MATERIAL_ACTION_NOT_ALLOWED");
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("rejects stale delegation settings before deleting grants", async () => {
    await expect(
      repository.upsertSettings(
        "org",
        "project",
        {
          workflowMode: "FINAL_APPROVAL",
          approverMemberIds: [],
          expectedVersion: 0,
        },
        "owner-user",
      ),
    ).rejects.toThrow("MATERIAL_VERSION_CONFLICT");
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("rejects a foreign or inaccessible member as a delegate", async () => {
    await expect(
      repository.upsertSettings(
        "org",
        "project",
        {
          workflowMode: "FINAL_APPROVAL",
          approverMemberIds: ["foreign-member"],
          expectedVersion: 1,
        },
        "owner-user",
      ),
    ).rejects.toThrow("MATERIAL_RESPONSIBLE_MEMBER_INVALID");
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("adds only delegated decision permissions and removes obsolete verification/rejection authority", () => {
    expect(
      withMaterialApprovalPermissions(["materials:read", "workers:read"], true),
    ).toEqual([
      "materials:read",
      "workers:read",
      "materials:approve-final",
      "materials:reject",
    ]);
    expect(
      withMaterialApprovalPermissions(
        [
          "materials:read",
          "materials:approve-level-1",
          "materials:approve-final",
          "materials:reject",
        ],
        false,
      ),
    ).toEqual(["materials:read"]);
  });
});
