import {
  BadRequestException,
  ForbiddenException,
  GoneException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { EmailService } from "../email/email.service";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationOnboardingRepository } from "./organization-onboarding.repository";
import { OrganizationOnboardingService } from "./organization-onboarding.service";
import type { InvitationRow } from "./types/organization-onboarding.types";

describe("OrganizationOnboardingService", () => {
  const onboardingRepo = {
    createOrganizationWithOwner: jest.fn(),
    findInvitationByTokenHash: jest.fn(),
    acceptInvitation: jest.fn(),
  } as unknown as jest.Mocked<OrganizationOnboardingRepository>;
  const emailService = {
    sendOrganizationOwnerInvitation: jest.fn(),
  } as unknown as jest.Mocked<EmailService>;
  const service = new OrganizationOnboardingService(
    onboardingRepo,
    emailService,
  );
  const platformActor: AuthenticatedUser = {
    id: "platform-user-id",
    email: "platform@example.test",
    name: "Platform Owner",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "platform-role-id",
    roleName: "Platform Super Admin",
    permissions: [{ resource: "platform-organizations", action: "create" }],
  };
  const dto: CreateOrganizationDto = {
    name: "ABC Builders",
    type: "BUILDER",
    operatingProfile: "SELF_MANAGED_BUILDER",
    timezone: "Asia/Kolkata",
    currency: "INR",
    owner: {
      name: "Asha Builder",
      email: "asha@example.test",
      mobile: "9999999999",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    emailService.sendOrganizationOwnerInvitation.mockResolvedValue(
      "EMAIL_SENT",
    );
  });

  it("blocks customer actors from provisioning another organization", async () => {
    await expect(
      service.createOrganizationWithOwner(dto, {
        ...platformActor,
        roleName: "Organization Owner",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(onboardingRepo.createOrganizationWithOwner.mock.calls).toHaveLength(
      0,
    );
  });

  it("creates a draft organization invitation without exposing a password", async () => {
    onboardingRepo.createOrganizationWithOwner.mockResolvedValue({
      organization: {
        id: "organization-id",
        name: dto.name,
        type: dto.type,
        status: "DRAFT",
        operatingProfile: dto.operatingProfile!,
        timezone: dto.timezone!,
        currency: dto.currency!,
        logoFileId: null,
        createdBy: platformActor.id,
        updatedBy: platformActor.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ownerMembership: {
        id: "membership-id",
        userId: "owner-user-id",
        roleId: "owner-role-id",
        status: "INVITED",
      },
      invitationId: "invitation-id",
      requiresPasswordSetup: true,
    });

    const result = await service.createOrganizationWithOwner(
      dto,
      platformActor,
    );

    expect(result.organization.status).toBe("DRAFT");
    expect(result.ownerMembership.status).toBe("INVITED");
    expect(result.invitation.activationUrl).toContain("/activate?token=");
    expect(result.invitation.mobileActivationUrl).toContain(
      "nirmansite://activate?token=",
    );
    expect(result.invitation.deliveryStatus).toBe("EMAIL_SENT");
    expect(emailService.sendOrganizationOwnerInvitation.mock.calls[0]).toEqual([
      "invitation-id",
      expect.objectContaining({
        recipientEmail: dto.owner.email,
        organizationName: dto.name,
        roleName: "Organization Owner",
      }),
    ]);
    expect(result).not.toHaveProperty("password");
  });

  it("rejects an operating profile that is incompatible with the organization type", async () => {
    await expect(
      service.createOrganizationWithOwner(
        {
          ...dto,
          type: "CONTRACTOR",
          operatingProfile: "BUILDER_CONTRACTOR",
        },
        platformActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(onboardingRepo.createOrganizationWithOwner.mock.calls).toHaveLength(
      0,
    );
  });

  it("rejects an expired invitation before activation", async () => {
    onboardingRepo.findInvitationByTokenHash.mockResolvedValue(
      invitationRow({ expires_at: new Date(Date.now() - 1_000) }),
    );

    await expect(
      service.inspectInvitation("a".repeat(32)),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it("hashes a new Owner password and activates the invitation", async () => {
    onboardingRepo.findInvitationByTokenHash.mockResolvedValue(invitationRow());
    onboardingRepo.acceptInvitation.mockResolvedValue(true);

    await service.acceptInvitation("a".repeat(32), {
      password: "CustomerPassword123!",
    });

    const passwordHash = onboardingRepo.acceptInvitation.mock.calls[0]?.[1];
    expect(passwordHash).toEqual(expect.any(String));
    expect(passwordHash).not.toBe("CustomerPassword123!");
    await expect(
      bcrypt.compare("CustomerPassword123!", passwordHash!),
    ).resolves.toBe(true);
  });

  it("requires a password when activating a new Owner identity", async () => {
    onboardingRepo.findInvitationByTokenHash.mockResolvedValue(invitationRow());

    await expect(
      service.acceptInvitation("a".repeat(32), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(onboardingRepo.acceptInvitation.mock.calls).toHaveLength(0);
  });

  it("activates an existing Owner membership without changing the password", async () => {
    onboardingRepo.findInvitationByTokenHash.mockResolvedValue(
      invitationRow({
        requires_password_setup: 0,
        user_is_active: 1,
      }),
    );
    onboardingRepo.acceptInvitation.mockResolvedValue(true);

    await service.acceptInvitation("a".repeat(32), {});

    expect(onboardingRepo.acceptInvitation.mock.calls[0]).toEqual([
      "invitation-id",
      null,
    ]);
  });
});

function invitationRow(
  overrides: {
    expires_at?: Date;
    requires_password_setup?: number | boolean;
    user_is_active?: number | boolean;
  } = {},
): InvitationRow {
  return {
    id: "invitation-id",
    organization_id: "organization-id",
    user_id: "owner-user-id",
    membership_id: "membership-id",
    invited_email: "asha@example.test",
    token_hash: "hash",
    status: "PENDING",
    requires_password_setup: 1,
    expires_at: new Date(Date.now() + 60_000),
    accepted_at: null,
    revoked_at: null,
    created_by: "platform-user-id",
    created_at: new Date(),
    updated_at: new Date(),
    organization_name: "ABC Builders",
    organization_type: "BUILDER",
    user_name: "Asha Builder",
    user_email: "asha@example.test",
    user_password: "placeholder-hash",
    user_is_active: 0,
    membership_status: "INVITED",
    role_name: "Organization Owner",
    ...overrides,
  } as unknown as InvitationRow;
}
