import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isOperatingProfileCompatible } from "@nirman-app/shared";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { assertPlatformPermission } from "../auth/platform-access";
import { EmailService } from "../email/email.service";
import type { AcceptOrganizationInvitationDto } from "./dto/accept-organization-invitation.dto";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationOnboardingRepository } from "./organization-onboarding.repository";
import type {
  OrganizationOnboardingResult,
  OrganizationOwnerInvitationPreview,
} from "./types/organization-onboarding.types";

const INVITATION_TTL_HOURS = 48;
@Injectable()
export class OrganizationOnboardingService {
  constructor(
    private readonly onboardingRepo: OrganizationOnboardingRepository,
    private readonly emailService: EmailService,
  ) {}

  async createOrganizationWithOwner(
    dto: CreateOrganizationDto,
    actor: AuthenticatedUser,
  ): Promise<OrganizationOnboardingResult> {
    assertPlatformPermission(actor, "platform-organizations:create");
    const operatingProfile = dto.operatingProfile ?? "CUSTOM";
    if (!isOperatingProfileCompatible(dto.type, operatingProfile)) {
      throw new BadRequestException(
        `${operatingProfile} is not valid for a ${dto.type} organization`,
      );
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000,
    );
    const placeholderPassword = await bcrypt.hash(
      randomBytes(48).toString("base64url"),
      12,
    );

    try {
      const result = await this.onboardingRepo.createOrganizationWithOwner(
        dto,
        actor.id,
        tokenHash,
        expiresAt,
        placeholderPassword,
      );
      const activationUrl = this.webActivationUrl(rawToken);
      const mobileActivationUrl = this.mobileActivationUrl(rawToken);
      const roleName =
        dto.type === "BUILDER"
          ? "Organization Owner"
          : "Independent Contractor Owner";
      const deliveryStatus =
        await this.emailService.sendOrganizationOwnerInvitation(
          result.invitationId,
          {
            recipientName: dto.owner.name.trim(),
            recipientEmail: dto.owner.email.trim().toLowerCase(),
            organizationName: result.organization.name,
            organizationType: result.organization.type,
            roleName,
            invitedByName: actor.name,
            expiresAt: expiresAt.toISOString(),
            activationUrl,
            mobileActivationUrl,
            requiresPasswordSetup: result.requiresPasswordSetup,
          },
        );
      return {
        organization: result.organization,
        ownerMembership: result.ownerMembership,
        invitation: {
          id: result.invitationId,
          status: "PENDING",
          expiresAt: expiresAt.toISOString(),
          activationUrl,
          mobileActivationUrl,
          deliveryStatus,
        },
      };
    } catch (error) {
      if (this.isDuplicateEntryError(error)) {
        throw new ConflictException(
          "An organization onboarding record already uses these owner details",
        );
      }
      throw error;
    }
  }

  async inspectInvitation(
    rawToken: string,
  ): Promise<OrganizationOwnerInvitationPreview> {
    const invitation = await this.requireInvitation(rawToken);
    if (invitation.status === "ACCEPTED") {
      throw new ConflictException("This invitation has already been accepted");
    }
    if (invitation.status === "REVOKED") {
      throw new GoneException("This invitation has been revoked");
    }
    if (invitation.expires_at.getTime() <= Date.now()) {
      throw new GoneException("This invitation has expired");
    }
    if (invitation.membership_status !== "INVITED") {
      throw new ConflictException(
        "The invited organization membership is no longer available",
      );
    }
    return {
      organization: {
        id: invitation.organization_id,
        name: invitation.organization_name,
        type: invitation.organization_type,
      },
      owner: {
        name: invitation.user_name,
        email: invitation.user_email,
      },
      roleName: invitation.role_name,
      status: invitation.status,
      expiresAt: invitation.expires_at.toISOString(),
      requiresPasswordSetup:
        isDatabaseFlagEnabled(invitation.requires_password_setup) &&
        !isDatabaseFlagEnabled(invitation.user_is_active),
    };
  }

  async acceptInvitation(
    rawToken: string,
    dto: AcceptOrganizationInvitationDto,
  ) {
    const invitation = await this.requireInvitation(rawToken);
    if (invitation.status === "ACCEPTED") {
      throw new ConflictException("This invitation has already been accepted");
    }
    if (invitation.status === "REVOKED") {
      throw new GoneException("This invitation has been revoked");
    }
    if (invitation.expires_at.getTime() <= Date.now()) {
      throw new GoneException("This invitation has expired");
    }
    if (invitation.membership_status !== "INVITED") {
      throw new ConflictException(
        "The invited organization membership is no longer available",
      );
    }

    let passwordHash: string | null = null;
    if (
      isDatabaseFlagEnabled(invitation.requires_password_setup) &&
      !isDatabaseFlagEnabled(invitation.user_is_active)
    ) {
      if (!dto.password) {
        throw new BadRequestException(
          "Create a password before activating this account",
        );
      }
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const accepted = await this.onboardingRepo.acceptInvitation(
      invitation.id,
      passwordHash,
    );
    if (!accepted) {
      throw new ConflictException(
        "This invitation is no longer available for acceptance",
      );
    }

    return {
      organization: {
        id: invitation.organization_id,
        name: invitation.organization_name,
        type: invitation.organization_type,
      },
      owner: {
        name: invitation.user_name,
        email: invitation.user_email,
      },
      roleName: invitation.role_name,
      membershipStatus: "ACTIVE" as const,
      organizationStatus: "ACTIVE" as const,
    };
  }

  private async requireInvitation(rawToken: string) {
    if (!rawToken || rawToken.length < 32) {
      throw new NotFoundException("Invitation not found");
    }
    const invitation = await this.onboardingRepo.findInvitationByTokenHash(
      this.hashToken(rawToken),
    );
    if (!invitation) throw new NotFoundException("Invitation not found");
    return invitation;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private webActivationUrl(token: string) {
    const configuredBase =
      process.env.PUBLIC_WEB_APP_URL ??
      process.env.FRONTEND_URL?.split(",")[0]?.trim() ??
      "http://localhost:3000";
    return `${configuredBase.replace(/\/$/, "")}/activate?token=${encodeURIComponent(token)}`;
  }

  private mobileActivationUrl(token: string) {
    const expoGoProjectUrl = process.env.EXPO_GO_PROJECT_URL?.trim();
    if (expoGoProjectUrl) {
      return `${expoGoProjectUrl.replace(/\/$/, "")}/--/activate?token=${encodeURIComponent(token)}`;
    }
    const scheme = process.env.MOBILE_APP_SCHEME ?? "nirmansite";
    return `${scheme}://activate?token=${encodeURIComponent(token)}`;
  }

  private isDuplicateEntryError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    );
  }
}

function isDatabaseFlagEnabled(value: number | boolean) {
  return value === true || value === 1;
}
