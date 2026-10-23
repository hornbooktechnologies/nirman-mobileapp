import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { WebsiteEnquiriesRepository } from "./website-enquiries.repository";
import { WebsiteEnquiriesService } from "./website-enquiries.service";

describe("WebsiteEnquiriesService", () => {
  const repository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActivities: jest.fn(),
    updateWorkflow: jest.fn(),
    markConverted: jest.fn(),
  } as unknown as jest.Mocked<WebsiteEnquiriesRepository>;
  const service = new WebsiteEnquiriesService(repository);
  const actor: AuthenticatedUser = {
    id: "admin-id",
    email: "admin@example.com",
    name: "Admin",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "role-id",
    roleName: "Platform Super Admin",
    permissions: [
      { resource: "platform-enquiries", action: "read" },
      { resource: "platform-enquiries", action: "update" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEBSITE_ENQUIRY_INGEST_KEY = "test-ingest-key";
  });

  afterAll(() => {
    delete process.env.WEBSITE_ENQUIRY_INGEST_KEY;
  });

  it("stores a valid server-to-server submission", async () => {
    const dto = {
      name: "Customer",
      phone: "9876543210",
      email: "customer@example.com",
      organizationType: "BUILDER" as const,
      message: "Please call me",
      submissionKey: "submission-id",
    };
    repository.create.mockResolvedValue({ id: "enquiry-id" } as never);

    await expect(service.create(dto, "test-ingest-key")).resolves.toEqual({
      id: "enquiry-id",
    });
    expect(repository.create.mock.calls).toEqual([[dto]]);
  });

  it("rejects ingestion without the shared key", () => {
    expect(() => service.create({} as never, "wrong-key")).toThrow(
      UnauthorizedException,
    );
    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it("requires platform enquiry permission to list", () => {
    expect(() =>
      service.findAll({ page: 1, limit: 25 }, { ...actor, permissions: [] }),
    ).toThrow();
    expect(repository.findAll.mock.calls).toHaveLength(0);
  });

  it("does not allow an organization administrator to list enquiries", () => {
    expect(() =>
      service.findAll(
        { page: 1, limit: 25 },
        {
          ...actor,
          roleName: "Builder Admin",
          permissions: [{ resource: "platform-enquiries", action: "read" }],
        },
      ),
    ).toThrow();
    expect(repository.findAll.mock.calls).toHaveLength(0);
  });

  it("does not allow a User Manager to list enquiries", () => {
    expect(() =>
      service.findAll(
        { page: 1, limit: 25 },
        { ...actor, roleName: "User Manager" },
      ),
    ).toThrow();
    expect(repository.findAll.mock.calls).toHaveLength(0);
  });

  it("marks an enquiry as created after organization creation", async () => {
    repository.markConverted.mockResolvedValue(true);
    await expect(
      service.convert(
        "enquiry-id",
        { organizationId: "c7285194-bab3-4e5e-9498-e6f5d63987c6" },
        actor,
      ),
    ).resolves.toEqual({
      id: "enquiry-id",
      status: "CREATED",
      organizationId: "c7285194-bab3-4e5e-9498-e6f5d63987c6",
    });
  });

  it("updates follow-up details", async () => {
    repository.updateWorkflow.mockResolvedValue({
      id: "enquiry-id",
      status: "FOLLOW_UP",
    } as never);
    await expect(
      service.update(
        "enquiry-id",
        { status: "FOLLOW_UP", nextFollowUpAt: "2026-10-22T10:00:00.000Z" },
        actor,
      ),
    ).resolves.toMatchObject({ status: "FOLLOW_UP" });
  });

  it("does not convert the same enquiry twice", async () => {
    repository.markConverted.mockResolvedValue(false);
    await expect(
      service.convert(
        "enquiry-id",
        { organizationId: "c7285194-bab3-4e5e-9498-e6f5d63987c6" },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
