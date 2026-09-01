import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import {
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
import { SalesService } from "./sales.service";

@Controller("organizations/:organizationId/projects/:projectId/sales")
@UseGuards(PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get("leads")
  async listLeads(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query() query: QuerySalesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.sales.listLeads(
      organizationId,
      projectId,
      query,
      actor,
    );
    return { success: true, message: "Leads retrieved", ...result };
  }

  @Post("leads")
  async createLead(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Lead created",
      data: await this.sales.createLead(organizationId, projectId, dto, actor),
    };
  }

  @Get("leads/:leadId")
  async getLead(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Lead retrieved",
      data: await this.sales.getLead(organizationId, projectId, leadId, actor),
    };
  }

  @Patch("leads/:leadId")
  async updateLead(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Lead updated",
      data: await this.sales.updateLead(
        organizationId,
        projectId,
        leadId,
        dto,
        actor,
      ),
    };
  }

  @Put("leads/:leadId/assignment")
  async assignLead(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Lead assignment saved",
      data: await this.sales.assignLead(
        organizationId,
        projectId,
        leadId,
        dto,
        actor,
      ),
    };
  }

  @Get("leads/:leadId/activities")
  async activities(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Lead timeline retrieved",
      data: await this.sales.activities(
        organizationId,
        projectId,
        leadId,
        actor,
      ),
    };
  }

  @Post("leads/:leadId/activities")
  async addActivity(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Lead activity recorded",
      data: await this.sales.addActivity(
        organizationId,
        projectId,
        leadId,
        dto,
        actor,
      ),
    };
  }

  @Get("follow-ups")
  async followUps(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query() query: QueryScheduledSalesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Follow-ups retrieved",
      data: await this.sales.listFollowUps(
        organizationId,
        projectId,
        query,
        actor,
      ),
    };
  }

  @Post("leads/:leadId/follow-ups")
  async createFollowUp(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @Body() dto: CreateFollowUpDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Follow-up scheduled",
      data: await this.sales.createFollowUp(
        organizationId,
        projectId,
        leadId,
        dto,
        actor,
      ),
    };
  }

  @Patch("leads/:leadId/follow-ups/:followUpId")
  async updateFollowUp(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @Param("followUpId", ParseUUIDPipe) followUpId: string,
    @Body() dto: UpdateFollowUpDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Follow-up updated",
      data: await this.sales.updateFollowUp(
        organizationId,
        projectId,
        leadId,
        followUpId,
        dto,
        actor,
      ),
    };
  }

  @Get("site-visits")
  async siteVisits(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Site visits retrieved",
      data: await this.sales.listSiteVisits(organizationId, projectId, actor),
    };
  }

  @Post("leads/:leadId/site-visits")
  async createSiteVisit(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @Body() dto: CreateSiteVisitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Site visit scheduled",
      data: await this.sales.createSiteVisit(
        organizationId,
        projectId,
        leadId,
        dto,
        actor,
      ),
    };
  }

  @Patch("leads/:leadId/site-visits/:visitId")
  async updateSiteVisit(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @Param("visitId", ParseUUIDPipe) visitId: string,
    @Body() dto: UpdateSiteVisitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Site visit updated",
      data: await this.sales.updateSiteVisit(
        organizationId,
        projectId,
        leadId,
        visitId,
        dto,
        actor,
      ),
    };
  }

  @Get("units")
  async units(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query() query: QueryUnitsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit inventory retrieved",
      data: await this.sales.listUnits(organizationId, projectId, query, actor),
    };
  }

  @Post("units")
  async createUnit(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit created",
      data: await this.sales.createUnit(organizationId, projectId, dto, actor),
    };
  }

  @Post("units/import/preview")
  async previewUnitImport(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: ImportUnitsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit import preview ready",
      data: await this.sales.previewUnitImport(
        organizationId,
        projectId,
        dto,
        actor,
      ),
    };
  }

  @Post("units/import")
  async importUnits(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: ImportUnitsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Units imported",
      data: await this.sales.importUnits(organizationId, projectId, dto, actor),
    };
  }

  @Put("units/:unitId")
  async updateUnit(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("unitId", ParseUUIDPipe) unitId: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit updated",
      data: await this.sales.updateUnit(
        organizationId,
        projectId,
        unitId,
        dto,
        actor,
      ),
    };
  }

  @Post("units/:unitId/blocks")
  async blockUnit(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("unitId", ParseUUIDPipe) unitId: string,
    @Body() dto: BlockUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit blocked",
      data: await this.sales.blockUnit(
        organizationId,
        projectId,
        unitId,
        dto,
        actor,
      ),
    };
  }

  @Get("units/:unitId/interests")
  async unitInterests(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("unitId", ParseUUIDPipe) unitId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit interests retrieved",
      data: await this.sales.listUnitInterests(
        organizationId,
        projectId,
        unitId,
        actor,
      ),
    };
  }

  @Get("leads/:leadId/unit-interests")
  async leadUnitInterests(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("leadId", ParseUUIDPipe) leadId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Lead unit interests retrieved",
      data: await this.sales.listLeadInterests(
        organizationId,
        projectId,
        leadId,
        actor,
      ),
    };
  }

  @Post("units/:unitId/interests")
  async saveUnitInterest(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("unitId", ParseUUIDPipe) unitId: string,
    @Body() dto: CreateUnitInterestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit interest saved",
      data: await this.sales.saveUnitInterest(
        organizationId,
        projectId,
        unitId,
        dto,
        actor,
      ),
    };
  }

  @Post("units/:unitId/hold-requests")
  async requestUnitHold(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("unitId", ParseUUIDPipe) unitId: string,
    @Body() dto: CreateUnitHoldRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit hold requested",
      data: await this.sales.requestUnitHold(
        organizationId,
        projectId,
        unitId,
        dto,
        actor,
      ),
    };
  }

  @Post("unit-hold-requests/:requestId/decision")
  async decideUnitHoldRequest(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Body() dto: DecideUnitHoldRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Unit hold request decided",
      data: await this.sales.decideUnitHoldRequest(
        organizationId,
        projectId,
        requestId,
        dto,
        actor,
      ),
    };
  }

  @Post("unit-blocks/:blockId/release")
  async releaseBlock(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("blockId", ParseUUIDPipe) blockId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.sales.releaseBlock(organizationId, projectId, blockId, actor);
    return { success: true, message: "Unit block released", data: null };
  }

  @Get("bookings")
  async bookings(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Bookings retrieved",
      data: await this.sales.listBookings(organizationId, projectId, actor),
    };
  }

  @Post("bookings")
  async createBooking(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Booking confirmed",
      data: await this.sales.createBooking(
        organizationId,
        projectId,
        dto,
        actor,
      ),
    };
  }

  @Post("bookings/:bookingId/cancel")
  async cancelBooking(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Booking cancelled",
      data: await this.sales.cancelBooking(
        organizationId,
        projectId,
        bookingId,
        dto,
        actor,
      ),
    };
  }
}
