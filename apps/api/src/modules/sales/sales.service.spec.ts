/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

describe("SalesService", () => {
  const repo = {
    isEligibleAssignee: jest.fn(),
    listLeads: jest.fn(),
    findLead: jest.fn(),
    createLead: jest.fn(),
    updateLead: jest.fn(),
    assignLead: jest.fn(),
    listActivities: jest.fn(),
    createActivity: jest.fn(),
    listFollowUps: jest.fn(),
    createFollowUp: jest.fn(),
    updateFollowUp: jest.fn(),
    listSiteVisits: jest.fn(),
    createSiteVisit: jest.fn(),
    updateSiteVisit: jest.fn(),
    listUnits: jest.fn(),
    createUnit: jest.fn(),
    createUnits: jest.fn(),
    findExistingUnitNumbers: jest.fn(),
    updateUnit: jest.fn(),
    saveUnitInterest: jest.fn(),
    listUnitInterests: jest.fn(),
    listLeadInterests: jest.fn(),
    requestUnitHold: jest.fn(),
    decideUnitHoldRequest: jest.fn(),
    blockUnit: jest.fn(),
    releaseBlock: jest.fn(),
    listBookings: jest.fn(),
    findBooking: jest.fn(),
    createBooking: jest.fn(),
    cancelBooking: jest.fn(),
  } as unknown as jest.Mocked<SalesRepository>;

  const projectAccess = {
    resolveOrganizationAccess: jest.fn(),
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;

  const service = new SalesService(repo, projectAccess);
  const actor: AuthenticatedUser = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "sales@example.test",
    name: "Sales User",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "role-id",
    roleName: "Sales User",
    permissions: [],
  };
  const organizationId = "00000000-0000-4000-8000-000000000010";
  const projectId = "00000000-0000-4000-8000-000000000020";
  const leadId = "00000000-0000-4000-8000-000000000030";

  beforeEach(() => {
    jest.clearAllMocks();
    repo.isEligibleAssignee.mockResolvedValue(true);
    repo.findExistingUnitNumbers.mockResolvedValue([]);
    projectAccess.resolveOrganizationAccess.mockResolvedValue({
      permissions: ["leads:read-own"],
    } as any);
    projectAccess.resolveProjectAccess.mockResolvedValue({
      permissions: [
        "leads:read-own",
        "leads:create",
        "leads:update",
        "leads:convert",
        "followups:manage",
        "site-visits:manage",
        "inventory:read",
        "inventory:interest",
        "inventory:request-block",
        "inventory:block",
        "inventory:book",
      ],
    } as any);
  });

  it("limits Sales User lead lists to assigned or self-created records", async () => {
    repo.listLeads.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 25, total: 0 },
    });
    await service.listLeads(
      organizationId,
      projectId,
      { page: 1, limit: 25 },
      actor,
    );
    expect(repo.listLeads).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.any(Object),
      "OWN",
      actor.id,
    );
    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "leads:read-own",
    );
  });

  it("auto-assigns a self-created lead to the Sales User", async () => {
    repo.createLead.mockResolvedValue({ id: leadId } as any);
    await service.createLead(
      organizationId,
      projectId,
      {
        customerName: "Asha Patel",
        primaryMobile: "9876543210",
        source: "WALK_IN",
      },
      actor,
    );
    expect(repo.isEligibleAssignee).toHaveBeenCalledWith(
      organizationId,
      projectId,
      actor.id,
    );
    expect(repo.createLead).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({ customerName: "Asha Patel" }),
      actor.id,
      actor.id,
    );
  });

  it("denies another user's lead to an own-leads-only actor", async () => {
    repo.findLead.mockResolvedValue({
      id: leadId,
      assignedTo: "another-user",
      createdBy: "another-user",
    } as any);
    await expect(
      service.getLead(organizationId, projectId, leadId, actor),
    ).rejects.toMatchObject({ response: { code: "LEAD_ACCESS_DENIED" } });
  });

  it("requires reassign permission when a lead already has an owner", async () => {
    repo.findLead.mockResolvedValue({
      id: leadId,
      assignedTo: actor.id,
      createdBy: actor.id,
    } as any);
    repo.assignLead.mockResolvedValue({ id: leadId } as any);
    await service.assignLead(
      organizationId,
      projectId,
      leadId,
      { assignedTo: "00000000-0000-4000-8000-000000000099" },
      actor,
    );
    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "leads:reassign",
    );
  });

  it("allows an inventory-less booking with lead conversion permission", async () => {
    repo.findLead.mockResolvedValue({
      id: leadId,
      assignedTo: actor.id,
      createdBy: actor.id,
    } as any);
    repo.createBooking.mockResolvedValue({ id: "booking-id" } as any);

    await service.createBooking(
      organizationId,
      projectId,
      {
        idempotencyKey: "booking-request-001",
        leadId,
        bookingDate: "2026-08-26",
        customerName: "Asha Patel",
        customerMobile: "9876543210",
      },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).not.toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "inventory:book",
    );
    expect(repo.createBooking).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({ idempotencyKey: "booking-request-001" }),
      actor.id,
    );
  });

  it("requires inventory booking permission for a unit-linked booking", async () => {
    repo.findLead.mockResolvedValue({
      id: leadId,
      assignedTo: actor.id,
      createdBy: actor.id,
    } as any);
    repo.createBooking.mockResolvedValue({ id: "booking-id" } as any);

    await service.createBooking(
      organizationId,
      projectId,
      {
        idempotencyKey: "booking-request-002",
        leadId,
        unitId: "00000000-0000-4000-8000-000000000040",
        bookingDate: "2026-08-26",
        customerName: "Asha Patel",
        customerMobile: "9876543210",
      },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "inventory:book",
    );
  });

  it("records interest without creating an exclusive Unit block", async () => {
    const unitId = "00000000-0000-4000-8000-000000000040";
    repo.findLead.mockResolvedValue({
      id: leadId,
      assignedTo: actor.id,
      createdBy: actor.id,
    } as any);
    repo.saveUnitInterest.mockResolvedValue({
      id: "interest-id",
      status: "HIGH_INTENT",
    } as any);

    await service.saveUnitInterest(
      organizationId,
      projectId,
      unitId,
      { leadId, status: "HIGH_INTENT", notes: "Ready for discussion" },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "inventory:interest",
    );
    expect(repo.saveUnitInterest).toHaveBeenCalledWith(
      organizationId,
      projectId,
      unitId,
      expect.objectContaining({ leadId, status: "HIGH_INTENT" }),
      actor.id,
    );
    expect(repo.blockUnit).not.toHaveBeenCalled();
  });

  it("submits a Unit hold request for an owned Lead", async () => {
    const unitId = "00000000-0000-4000-8000-000000000040";
    repo.findLead.mockResolvedValue({
      id: leadId,
      assignedTo: actor.id,
      createdBy: actor.id,
    } as any);
    repo.requestUnitHold.mockResolvedValue({
      id: "request-id",
      status: "PENDING",
    } as any);

    await service.requestUnitHold(
      organizationId,
      projectId,
      unitId,
      { leadId, notes: "Customer requested a short hold" },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "inventory:request-block",
    );
    expect(repo.requestUnitHold).toHaveBeenCalledWith(
      organizationId,
      projectId,
      unitId,
      expect.objectContaining({ leadId }),
      actor.id,
    );
  });

  it("requires block authority to decide a pending Unit hold request", async () => {
    repo.decideUnitHoldRequest.mockResolvedValue({
      id: "request-id",
      status: "APPROVED",
    } as any);

    await service.decideUnitHoldRequest(
      organizationId,
      projectId,
      "request-id",
      { decision: "APPROVED" },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "inventory:block",
    );
    expect(repo.decideUnitHoldRequest).toHaveBeenCalledWith(
      organizationId,
      projectId,
      "request-id",
      { decision: "APPROVED" },
      actor.id,
    );
  });

  it("requires an explicit non-BOOKED restoration state when cancelling", async () => {
    await expect(
      service.cancelBooking(
        organizationId,
        projectId,
        "00000000-0000-4000-8000-000000000040",
        {
          cancellationReason: "Customer withdrew",
          restoredLeadStage: "BOOKED",
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: "BOOKING_RESTORE_STAGE_INVALID" },
    });
  });

  it("normalizes per-square-foot pricing when creating a Unit", async () => {
    repo.createUnit.mockResolvedValue({ id: "unit-id" } as any);
    await service.createUnit(
      organizationId,
      projectId,
      {
        unitNumber: "A-101",
        unitType: "2 BHK",
        areaSqft: 1120,
        priceBasis: "PER_SQFT",
        ratePerSqft: 6250,
      },
      actor,
    );
    expect(repo.createUnit).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({ basePrice: 7000000, priceBasis: "PER_SQFT" }),
      actor.id,
    );
  });

  it("previews duplicate Unit numbers without writing inventory", async () => {
    const preview = await service.previewUnitImport(
      organizationId,
      projectId,
      {
        units: [
          {
            unitNumber: "A-101",
            unitType: "2 BHK",
            basePrice: 70,
            priceBasis: "TOTAL",
          },
          {
            unitNumber: "a-101",
            unitType: "2 BHK",
            basePrice: 75,
            priceBasis: "TOTAL",
          },
        ],
      },
      actor,
    );
    expect(preview.invalidCount).toBe(2);
    expect(preview.rows[0].errors).toContain("UNIT_IMPORT_DUPLICATE_IN_FILE");
    expect(repo.createUnits).not.toHaveBeenCalled();
  });

  it("imports a fully valid Unit file in one repository operation", async () => {
    repo.createUnits.mockResolvedValue([{ id: "unit-id" }] as any);
    const result = await service.importUnits(
      organizationId,
      projectId,
      {
        units: [
          {
            unitNumber: "A-101",
            unitType: "2 BHK",
            areaSqft: 1120,
            priceBasis: "PER_SQFT",
            ratePerSqft: 6250,
          },
        ],
      },
      actor,
    );
    expect(result.importedCount).toBe(1);
    expect(repo.createUnits).toHaveBeenCalledWith(
      organizationId,
      projectId,
      [expect.objectContaining({ basePrice: 7000000 })],
      actor.id,
    );
  });
});
