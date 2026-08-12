import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { InviteOrganizationMemberDto } from "./dto/invite-organization-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.organizationsService.findAll(user);
    return { success: true, message: "Organizations retrieved", data };
  }

  @Post()
  @RequirePermissions("platform-organizations:create")
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.create(dto, user);
    return { success: true, message: "Organization created", data };
  }

  @Get(":organizationId")
  async findOne(
    @Param("organizationId") organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.findById(organizationId, user);
    return { success: true, message: "Organization retrieved", data };
  }

  @Patch(":organizationId")
  async update(
    @Param("organizationId") organizationId: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.update(
      organizationId,
      dto,
      user,
    );
    return { success: true, message: "Organization updated", data };
  }

  @Post(":organizationId/switch")
  @HttpCode(HttpStatus.OK)
  async switchOrganization(
    @Param("organizationId") organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.switchOrganization(
      organizationId,
      user,
    );
    return { success: true, message: "Organization switched", data };
  }

  @Get(":organizationId/members")
  async findMembers(
    @Param("organizationId") organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.findMembers(
      organizationId,
      user,
    );
    return { success: true, message: "Organization members retrieved", data };
  }

  @Get(":organizationId/member-roles")
  async findMemberRoles(
    @Param("organizationId") organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.findMemberRoles(
      organizationId,
      user,
    );
    return { success: true, message: "Organization roles retrieved", data };
  }

  @Post(":organizationId/invitations")
  async inviteMember(
    @Param("organizationId") organizationId: string,
    @Body() dto: InviteOrganizationMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.inviteMember(
      organizationId,
      dto,
      user,
    );
    return { success: true, message: "Organization member invited", data };
  }

  @Patch(":organizationId/members/:memberId")
  async updateMember(
    @Param("organizationId") organizationId: string,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.updateMember(
      organizationId,
      memberId,
      dto,
      user,
    );
    return { success: true, message: "Organization member updated", data };
  }

  @Post(":organizationId/members/:memberId/deactivate")
  @HttpCode(HttpStatus.OK)
  async deactivateMember(
    @Param("organizationId") organizationId: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.organizationsService.deactivateMember(
      organizationId,
      memberId,
      user,
    );
    return { success: true, message: "Organization member deactivated", data };
  }
}
