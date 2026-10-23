import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import {
  assertPlatformPermission,
  isPlatformSuperAdmin,
} from "../auth/platform-access";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { OrganizationOnboardingService } from "../organizations/organization-onboarding.service";
import type {
  ConvertWebsiteEnquiryDto,
  CreateWebsiteEnquiryDto,
  QueryWebsiteEnquiriesDto,
  UpdateWebsiteEnquiryDto,
} from "./dto/website-enquiries.dto";
import { WebsiteEnquiriesRepository } from "./website-enquiries.repository";

@Injectable()
export class WebsiteEnquiriesService {
  constructor(
    private readonly repository: WebsiteEnquiriesRepository,
    private readonly onboarding: OrganizationOnboardingService,
  ) {}

  create(dto: CreateWebsiteEnquiryDto, suppliedKey?: string) {
    this.assertIngestKey(suppliedKey);
    return this.repository.create(dto);
  }

  findAll(query: QueryWebsiteEnquiriesDto, actor: AuthenticatedUser) {
    this.assertSystemAdmin(actor);
    assertPlatformPermission(actor, "platform-enquiries:read");
    return this.repository.findAll(query);
  }

  activities(id: string, actor: AuthenticatedUser) {
    this.assertSystemAdmin(actor);
    assertPlatformPermission(actor, "platform-enquiries:read");
    return this.repository.findActivities(id);
  }

  async update(
    id: string,
    dto: UpdateWebsiteEnquiryDto,
    actor: AuthenticatedUser,
  ) {
    this.assertSystemAdmin(actor);
    assertPlatformPermission(actor, "platform-enquiries:update");
    if (dto.status === "CREATED") {
      throw new BadRequestException(
        "Use organization creation to mark an enquiry as created",
      );
    }
    if (dto.status === "FOLLOW_UP" && !dto.nextFollowUpAt) {
      throw new BadRequestException(
        "A next follow-up date is required for follow-up status",
      );
    }
    if (
      dto.status === undefined &&
      dto.nextFollowUpAt === undefined &&
      dto.adminNotes === undefined
    ) {
      throw new BadRequestException("No enquiry changes were provided");
    }
    const updated = await this.repository.updateWorkflow(id, dto, actor.id);
    if (!updated)
      throw new BadRequestException("Website enquiry does not exist");
    return updated;
  }

  async convert(
    id: string,
    dto: ConvertWebsiteEnquiryDto,
    actor: AuthenticatedUser,
  ) {
    this.assertSystemAdmin(actor);
    assertPlatformPermission(actor, "platform-enquiries:update");
    const converted = await this.repository.markConverted(
      id,
      dto.organizationId,
      actor.id,
    );
    if (!converted)
      throw new ConflictException(
        "Enquiry is already converted or does not exist",
      );
    return { id, status: "CREATED", organizationId: dto.organizationId };
  }

  async activationLink(id: string, actor: AuthenticatedUser) {
    this.assertSystemAdmin(actor);
    assertPlatformPermission(actor, "platform-enquiries:update");
    assertPlatformPermission(actor, "platform-organizations:create");
    const enquiry = await this.repository.findById(id);
    if (!enquiry) {
      throw new BadRequestException("Website enquiry does not exist");
    }
    if (enquiry.status !== "CREATED" || !enquiry.convertedOrganization?.id) {
      throw new ConflictException(
        "Create an organization from this enquiry before generating an activation link",
      );
    }
    return this.onboarding.rotateOwnerActivationLink(
      enquiry.convertedOrganization.id,
      actor,
    );
  }

  private assertIngestKey(suppliedKey?: string) {
    const expected = process.env.WEBSITE_ENQUIRY_INGEST_KEY;
    if (!expected)
      throw new ServiceUnavailableException(
        "Website enquiry ingestion is not configured",
      );
    const supplied = Buffer.from(suppliedKey ?? "");
    const configured = Buffer.from(expected);
    if (
      supplied.length !== configured.length ||
      !timingSafeEqual(supplied, configured)
    ) {
      throw new UnauthorizedException("Invalid website enquiry credentials");
    }
  }

  private assertSystemAdmin(actor: AuthenticatedUser) {
    if (!isPlatformSuperAdmin(actor)) {
      throw new ForbiddenException("System administrator access is required");
    }
  }
}
