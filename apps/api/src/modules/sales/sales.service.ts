import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PermissionKey } from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type {
  AssignLeadDto,
  BlockUnitDto,
  CancelBookingDto,
  CreateActivityDto,
  CreateBookingDto,
  CreateFollowUpDto,
  CreateLeadDto,
  CreateSiteVisitDto,
  CreateUnitHoldRequestDto,
  CreateUnitInterestDto,
  CreateUnitDto,
  DecideUnitHoldRequestDto,
  ImportUnitsDto,
  QuerySalesDto,
  QueryScheduledSalesDto,
  QueryUnitsDto,
  UpdateFollowUpDto,
  UpdateLeadDto,
  UpdateSiteVisitDto,
  UpdateUnitDto,
} from "./dto/sales.dto";
import {
  SalesRepository,
  type LeadVisibility,
  type SalesLeadRecord,
} from "./sales.repository";

@Injectable()
export class SalesService {
  constructor(
    private readonly repo: SalesRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async listLeads(
    organizationId: string,
    projectId: string,
    query: QuerySalesDto,
    actor: AuthenticatedUser,
  ) {
    const visibility = await this.resolveLeadRead(
      organizationId,
      projectId,
      actor,
    );
    if (
      visibility === "OWN" &&
      query.assignedTo &&
      query.assignedTo !== actor.id
    ) {
      throw new ForbiddenException({
        code: "LEAD_ACCESS_DENIED",
        message: "You can only filter your own leads",
      });
    }
    return this.repo.listLeads(
      organizationId,
      projectId,
      query,
      visibility,
      actor.id,
    );
  }

  async getLead(
    organizationId: string,
    projectId: string,
    leadId: string,
    actor: AuthenticatedUser,
  ) {
    const visibility = await this.resolveLeadRead(
      organizationId,
      projectId,
      actor,
    );
    const lead = await this.requireLead(organizationId, projectId, leadId);
    this.assertLeadVisible(lead, visibility, actor.id);
    return lead;
  }

  async createLead(
    organizationId: string,
    projectId: string,
    dto: CreateLeadDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "leads:create",
    );
    if (
      dto.budgetMin !== undefined &&
      dto.budgetMax !== undefined &&
      dto.budgetMax < dto.budgetMin
    ) {
      throw new BadRequestException({
        code: "LEAD_BUDGET_RANGE_INVALID",
        message: "Maximum budget must be at least the minimum budget",
      });
    }
    const assigneeId = dto.assignedTo ?? actor.id;
    if (
      assigneeId !== actor.id &&
      !access.permissions.includes("leads:assign")
    ) {
      throw new ForbiddenException({
        code: "LEAD_ASSIGNMENT_DENIED",
        message: "You cannot assign this lead to another user",
      });
    }
    await this.assertEligibleAssignee(organizationId, projectId, assigneeId);
    return this.repo.createLead(
      organizationId,
      projectId,
      dto,
      actor.id,
      assigneeId,
    );
  }

  async updateLead(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: UpdateLeadDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "leads:update",
    );
    const lead = await this.requireLead(organizationId, projectId, leadId);
    this.assertLeadVisible(
      lead,
      this.visibilityFromPermissions(access.permissions),
      actor.id,
    );
    const min = dto.budgetMin ?? lead.budgetMin;
    const max = dto.budgetMax ?? lead.budgetMax;
    if (min !== null && max !== null && Number(max) < Number(min)) {
      throw new BadRequestException({
        code: "LEAD_BUDGET_RANGE_INVALID",
        message: "Maximum budget must be at least the minimum budget",
      });
    }
    if (
      ["BOOKED"].includes(dto.currentStage ?? "") &&
      lead.currentStage !== "BOOKED"
    ) {
      throw new BadRequestException({
        code: "LEAD_STAGE_REQUIRES_BOOKING",
        message: "Use booking confirmation to move a lead to BOOKED",
      });
    }
    if (
      dto.currentStage === "LOST" &&
      !(
        dto.lostReason?.trim() ||
        (typeof lead.lostReason === "string" ? lead.lostReason.trim() : "")
      )
    ) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Lost reason is required when a lead is marked LOST",
      });
    }
    return this.repo.updateLead(
      organizationId,
      projectId,
      leadId,
      dto,
      actor.id,
    );
  }

  async assignLead(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: AssignLeadDto,
    actor: AuthenticatedUser,
  ) {
    const lead = await this.requireLead(organizationId, projectId, leadId);
    const permission: PermissionKey = lead.assignedTo
      ? "leads:reassign"
      : "leads:assign";
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      permission,
    );
    await this.assertEligibleAssignee(
      organizationId,
      projectId,
      dto.assignedTo,
    );
    return this.repo.assignLead(
      organizationId,
      projectId,
      leadId,
      dto.assignedTo,
      actor.id,
    );
  }

  async activities(
    organizationId: string,
    projectId: string,
    leadId: string,
    actor: AuthenticatedUser,
  ) {
    await this.getLead(organizationId, projectId, leadId, actor);
    return this.repo.listActivities(organizationId, projectId, leadId);
  }

  async addActivity(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: CreateActivityDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertWritableLead(
      organizationId,
      projectId,
      leadId,
      actor,
      "leads:update",
    );
    return this.repo.createActivity(
      organizationId,
      projectId,
      leadId,
      dto.activityType,
      dto.summary,
      dto.details,
      actor.id,
    );
  }

  async listFollowUps(
    organizationId: string,
    projectId: string,
    query: QueryScheduledSalesDto,
    actor: AuthenticatedUser,
  ) {
    const visibility = await this.resolveLeadRead(
      organizationId,
      projectId,
      actor,
    );
    if (
      visibility === "OWN" &&
      query.assignedTo &&
      query.assignedTo !== actor.id
    ) {
      throw new ForbiddenException({
        code: "FOLLOW_UP_ACCESS_DENIED",
        message: "You can only view your own follow-ups",
      });
    }
    return this.repo.listFollowUps(
      organizationId,
      projectId,
      query,
      visibility === "OWN" ? actor.id : undefined,
    );
  }

  async createFollowUp(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: CreateFollowUpDto,
    actor: AuthenticatedUser,
  ) {
    const lead = await this.assertWritableLead(
      organizationId,
      projectId,
      leadId,
      actor,
      "followups:manage",
    );
    const assignedUserId = dto.assignedUserId ?? lead.assignedTo ?? actor.id;
    await this.assertEligibleAssignee(
      organizationId,
      projectId,
      assignedUserId,
    );
    return this.translateConflict(
      () =>
        this.repo.createFollowUp(
          organizationId,
          projectId,
          leadId,
          dto,
          actor.id,
          assignedUserId,
        ),
      "FOLLOW_UP_DUPLICATE",
    );
  }

  async updateFollowUp(
    organizationId: string,
    projectId: string,
    leadId: string,
    followUpId: string,
    dto: UpdateFollowUpDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertWritableLead(
      organizationId,
      projectId,
      leadId,
      actor,
      "followups:manage",
    );
    return this.translateDomain(() =>
      this.repo.updateFollowUp(
        organizationId,
        projectId,
        leadId,
        followUpId,
        dto,
        actor.id,
      ),
    );
  }

  async listSiteVisits(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const visibility = await this.resolveLeadRead(
      organizationId,
      projectId,
      actor,
    );
    return this.repo.listSiteVisits(
      organizationId,
      projectId,
      visibility === "OWN" ? actor.id : undefined,
    );
  }

  async createSiteVisit(
    organizationId: string,
    projectId: string,
    leadId: string,
    dto: CreateSiteVisitDto,
    actor: AuthenticatedUser,
  ) {
    const lead = await this.assertWritableLead(
      organizationId,
      projectId,
      leadId,
      actor,
      "site-visits:manage",
    );
    const assigneeId = dto.assignedSalesperson ?? lead.assignedTo ?? actor.id;
    await this.assertEligibleAssignee(organizationId, projectId, assigneeId);
    return this.repo.createSiteVisit(
      organizationId,
      projectId,
      leadId,
      dto,
      actor.id,
      assigneeId,
    );
  }

  async updateSiteVisit(
    organizationId: string,
    projectId: string,
    leadId: string,
    visitId: string,
    dto: UpdateSiteVisitDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertWritableLead(
      organizationId,
      projectId,
      leadId,
      actor,
      "site-visits:manage",
    );
    return this.translateDomain(() =>
      this.repo.updateSiteVisit(
        organizationId,
        projectId,
        leadId,
        visitId,
        dto,
        actor.id,
      ),
    );
  }

  async listUnits(
    organizationId: string,
    projectId: string,
    query: QueryUnitsDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:read",
    );
    return this.repo.listUnits(organizationId, projectId, query);
  }

  async createUnit(
    organizationId: string,
    projectId: string,
    dto: CreateUnitDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:manage",
    );
    if (["BLOCKED", "BOOKED"].includes(dto.status ?? "")) {
      throw new BadRequestException({
        code: "UNIT_STATUS_MANAGED_BY_WORKFLOW",
        message: "Use block or booking actions for this unit status",
      });
    }
    const normalized = this.normalizeUnitPricing(dto);
    return this.translateConflict(
      () =>
        this.repo.createUnit(organizationId, projectId, normalized, actor.id),
      "UNIT_NUMBER_DUPLICATE",
    );
  }

  async previewUnitImport(
    organizationId: string,
    projectId: string,
    dto: ImportUnitsDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:manage",
    );
    return this.buildUnitImportPreview(organizationId, projectId, dto.units);
  }

  async importUnits(
    organizationId: string,
    projectId: string,
    dto: ImportUnitsDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:manage",
    );
    const preview = await this.buildUnitImportPreview(
      organizationId,
      projectId,
      dto.units,
    );
    if (preview.invalidCount) {
      throw new BadRequestException({
        code: "UNIT_IMPORT_INVALID",
        message: "Correct every invalid Unit row before importing",
        details: preview,
      });
    }
    const units = preview.rows.map((row) => row.unit);
    const created = await this.translateConflict(
      () => this.repo.createUnits(organizationId, projectId, units, actor.id),
      "UNIT_NUMBER_DUPLICATE",
    );
    return { importedCount: created.length, units: created };
  }

  async updateUnit(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: UpdateUnitDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:manage",
    );
    if (["BLOCKED", "BOOKED"].includes(dto.status ?? "")) {
      throw new BadRequestException({
        code: "UNIT_STATUS_MANAGED_BY_WORKFLOW",
        message: "Use block or booking actions for this unit status",
      });
    }
    const normalized = this.normalizeUnitPricing(dto);
    return this.translateDomain(() =>
      this.translateConflict(
        () =>
          this.repo.updateUnit(
            organizationId,
            projectId,
            unitId,
            normalized,
            actor.id,
          ),
        "UNIT_NUMBER_DUPLICATE",
      ),
    );
  }

  async blockUnit(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: BlockUnitDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:block",
    );
    await this.assertWritableLead(
      organizationId,
      projectId,
      dto.leadId,
      actor,
      "leads:update",
    );
    if (dto.expiresAt && new Date(dto.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException({
        code: "UNIT_BLOCK_EXPIRY_INVALID",
        message: "Block expiry must be in the future",
      });
    }
    return this.translateDomain(() =>
      this.repo.blockUnit(organizationId, projectId, unitId, dto, actor.id),
    );
  }

  async listUnitInterests(
    organizationId: string,
    projectId: string,
    unitId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:read",
    );
    return this.repo.listUnitInterests(
      organizationId,
      projectId,
      unitId,
      access.permissions.includes("inventory:block") ? undefined : actor.id,
    );
  }

  async listLeadInterests(
    organizationId: string,
    projectId: string,
    leadId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:read",
    );
    await this.getLead(organizationId, projectId, leadId, actor);
    return this.repo.listLeadInterests(organizationId, projectId, leadId);
  }

  async saveUnitInterest(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: CreateUnitInterestDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:interest",
    );
    await this.assertWritableLead(
      organizationId,
      projectId,
      dto.leadId,
      actor,
      "leads:update",
    );
    return this.translateDomain(() =>
      this.repo.saveUnitInterest(
        organizationId,
        projectId,
        unitId,
        dto,
        actor.id,
      ),
    );
  }

  async requestUnitHold(
    organizationId: string,
    projectId: string,
    unitId: string,
    dto: CreateUnitHoldRequestDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:request-block",
    );
    await this.assertWritableLead(
      organizationId,
      projectId,
      dto.leadId,
      actor,
      "leads:update",
    );
    return this.translateDomain(() =>
      this.repo.requestUnitHold(
        organizationId,
        projectId,
        unitId,
        dto,
        actor.id,
      ),
    );
  }

  async decideUnitHoldRequest(
    organizationId: string,
    projectId: string,
    requestId: string,
    dto: DecideUnitHoldRequestDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:block",
    );
    if (dto.expiresAt && new Date(dto.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException({
        code: "UNIT_BLOCK_EXPIRY_INVALID",
        message: "Block expiry must be in the future",
      });
    }
    return this.translateDomain(() =>
      this.repo.decideUnitHoldRequest(
        organizationId,
        projectId,
        requestId,
        dto,
        actor.id,
      ),
    );
  }

  async releaseBlock(
    organizationId: string,
    projectId: string,
    blockId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "inventory:block",
    );
    return this.translateDomain(() =>
      this.repo.releaseBlock(organizationId, projectId, blockId, actor.id),
    );
  }

  async listBookings(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const visibility = await this.resolveLeadRead(
      organizationId,
      projectId,
      actor,
    );
    return this.repo.listBookings(
      organizationId,
      projectId,
      visibility === "OWN" ? actor.id : undefined,
    );
  }

  async createBooking(
    organizationId: string,
    projectId: string,
    dto: CreateBookingDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "leads:convert",
    );
    if (dto.unitId) {
      await this.projectAccess.resolveProjectAccess(
        actor,
        organizationId,
        projectId,
        "inventory:book",
      );
    }
    await this.assertWritableLead(
      organizationId,
      projectId,
      dto.leadId,
      actor,
      "leads:convert",
    );
    return this.translateDomain(() =>
      this.repo.createBooking(organizationId, projectId, dto, actor.id),
    );
  }

  async cancelBooking(
    organizationId: string,
    projectId: string,
    bookingId: string,
    dto: CancelBookingDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.restoredLeadStage === "BOOKED") {
      throw new BadRequestException({
        code: "BOOKING_RESTORE_STAGE_INVALID",
        message: "Cancelled bookings cannot leave the lead BOOKED",
      });
    }
    const booking = await this.repo.findBooking(
      organizationId,
      projectId,
      bookingId,
    );
    if (!booking) {
      throw new NotFoundException({
        code: "BOOKING_NOT_FOUND",
        message: "Booking not found",
      });
    }
    await this.assertWritableLead(
      organizationId,
      projectId,
      booking.leadId as string,
      actor,
      "leads:convert",
    );
    if (booking.unitId) {
      await this.projectAccess.resolveProjectAccess(
        actor,
        organizationId,
        projectId,
        "inventory:book",
      );
    }
    return this.translateDomain(() =>
      this.repo.cancelBooking(
        organizationId,
        projectId,
        bookingId,
        dto,
        actor.id,
      ),
    );
  }

  private normalizeUnitPricing(dto: CreateUnitDto): CreateUnitDto {
    const priceBasis = dto.priceBasis ?? "TOTAL";
    if (priceBasis === "PER_SQFT") {
      if (
        dto.areaSqft == null ||
        dto.areaSqft <= 0 ||
        dto.ratePerSqft == null ||
        dto.ratePerSqft <= 0
      ) {
        throw new BadRequestException({
          code: "UNIT_PRICE_INVALID",
          message: "Area and rate per square foot must be greater than zero",
        });
      }
      return {
        ...dto,
        priceBasis,
        ratePerSqft: dto.ratePerSqft,
        basePrice: Math.round(dto.areaSqft * dto.ratePerSqft * 100) / 100,
      };
    }
    if (dto.ratePerSqft != null) {
      throw new BadRequestException({
        code: "UNIT_PRICE_INVALID",
        message:
          "Rate per square foot is only valid for per-square-foot pricing",
      });
    }
    if (dto.basePrice == null || dto.basePrice <= 0) {
      throw new BadRequestException({
        code: "UNIT_PRICE_INVALID",
        message: "Total Unit price must be greater than zero",
      });
    }
    return { ...dto, priceBasis, ratePerSqft: undefined };
  }

  private async buildUnitImportPreview(
    organizationId: string,
    projectId: string,
    units: readonly CreateUnitDto[],
  ) {
    const normalizedNumbers = units.map((unit) =>
      unit.unitNumber.trim().toLocaleLowerCase(),
    );
    const occurrences = new Map<string, number>();
    normalizedNumbers.forEach((unitNumber) =>
      occurrences.set(unitNumber, (occurrences.get(unitNumber) ?? 0) + 1),
    );
    const existing = new Set(
      (
        await this.repo.findExistingUnitNumbers(
          organizationId,
          projectId,
          units.map((unit) => unit.unitNumber.trim()),
        )
      ).map((unitNumber) => unitNumber.toLocaleLowerCase()),
    );

    const rows = units.map((unit, index) => {
      const errors: string[] = [];
      const key = normalizedNumbers[index];
      if ((occurrences.get(key) ?? 0) > 1) {
        errors.push("UNIT_IMPORT_DUPLICATE_IN_FILE");
      }
      if (existing.has(key)) errors.push("UNIT_NUMBER_DUPLICATE");
      if (["BLOCKED", "BOOKED"].includes(unit.status ?? "")) {
        errors.push("UNIT_STATUS_MANAGED_BY_WORKFLOW");
      }
      let normalized = unit;
      try {
        normalized = this.normalizeUnitPricing(unit);
      } catch {
        errors.push("UNIT_PRICE_INVALID");
      }
      return {
        rowNumber: index + 2,
        unit: normalized,
        valid: errors.length === 0,
        errors,
      };
    });
    const invalidCount = rows.filter((row) => !row.valid).length;
    return {
      totalCount: rows.length,
      validCount: rows.length - invalidCount,
      invalidCount,
      rows,
    };
  }

  private async resolveLeadRead(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<LeadVisibility> {
    const org = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
    );
    const visibility = this.visibilityFromPermissions(org.permissions);
    const permission: PermissionKey =
      visibility === "ALL"
        ? "leads:read-all"
        : visibility === "TEAM"
          ? "leads:read-team"
          : "leads:read-own";
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      permission,
    );
    return visibility;
  }

  private visibilityFromPermissions(
    permissions: readonly string[],
  ): LeadVisibility {
    if (permissions.includes("leads:read-all")) return "ALL";
    if (permissions.includes("leads:read-team")) return "TEAM";
    if (permissions.includes("leads:read-own")) return "OWN";
    throw new ForbiddenException({
      code: "LEAD_ACCESS_DENIED",
      message: "Lead access is not granted",
    });
  }

  private async assertWritableLead(
    organizationId: string,
    projectId: string,
    leadId: string,
    actor: AuthenticatedUser,
    permission: PermissionKey,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      permission,
    );
    const lead = await this.requireLead(organizationId, projectId, leadId);
    this.assertLeadVisible(
      lead,
      this.visibilityFromPermissions(access.permissions),
      actor.id,
    );
    return lead;
  }

  private assertLeadVisible(
    lead: SalesLeadRecord,
    visibility: LeadVisibility,
    actorId: string,
  ) {
    if (
      visibility === "OWN" &&
      lead.assignedTo !== actorId &&
      lead.createdBy !== actorId
    ) {
      throw new ForbiddenException({
        code: "LEAD_ACCESS_DENIED",
        message: "This lead is not assigned to you",
      });
    }
  }

  private async requireLead(
    organizationId: string,
    projectId: string,
    leadId: string,
  ) {
    const lead = await this.repo.findLead(organizationId, projectId, leadId);
    if (!lead)
      throw new NotFoundException({
        code: "LEAD_NOT_FOUND",
        message: "Lead not found",
      });
    return lead;
  }

  private async assertEligibleAssignee(
    organizationId: string,
    projectId: string,
    userId: string,
  ) {
    if (
      !(await this.repo.isEligibleAssignee(organizationId, projectId, userId))
    ) {
      throw new BadRequestException({
        code: "LEAD_ASSIGNEE_INVALID",
        message: "Assignee must be an active member with Project access",
      });
    }
  }

  private async translateConflict<T>(
    operation: () => Promise<T>,
    code: string,
  ) {
    try {
      return await operation();
    } catch (error) {
      if (this.mysqlCode(error) === "ER_DUP_ENTRY")
        throw new ConflictException({
          code,
          message: "A conflicting Sales record already exists",
        });
      throw error;
    }
  }

  private async translateDomain<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      const code =
        this.mysqlCode(error) ??
        (error instanceof Error
          ? (error as Error & { code?: string }).code
          : undefined);
      if (code === "ER_DUP_ENTRY")
        throw new ConflictException({
          code: "SALES_CONFLICT",
          message: "The Sales record changed concurrently",
        });
      if (code === "IDEMPOTENCY_CONFLICT") {
        throw new ConflictException({
          code,
          message:
            "This idempotency key was already used for a different booking request",
        });
      }
      if (
        code === "LEAD_NOT_FOUND" ||
        code === "FOLLOW_UP_NOT_FOUND" ||
        code === "SITE_VISIT_NOT_FOUND" ||
        code === "UNIT_NOT_FOUND" ||
        code === "UNIT_INTEREST_NOT_FOUND" ||
        code === "UNIT_HOLD_REQUEST_NOT_FOUND"
      ) {
        throw new NotFoundException({
          code,
          message: code.replaceAll("_", " ").toLowerCase(),
        });
      }
      if (
        code?.startsWith("UNIT_") ||
        code?.startsWith("LEAD_ALREADY") ||
        code?.startsWith("BOOKING_")
      ) {
        throw new ConflictException({
          code,
          message: code.replaceAll("_", " ").toLowerCase(),
        });
      }
      throw error;
    }
  }

  private mysqlCode(error: unknown) {
    if (typeof error !== "object" || error === null || !("code" in error)) {
      return undefined;
    }
    const value = (error as { code?: unknown }).code;
    return typeof value === "string" ? value : undefined;
  }
}
