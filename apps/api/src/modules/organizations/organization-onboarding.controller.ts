import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { AcceptOrganizationInvitationDto } from "./dto/accept-organization-invitation.dto";
import { OrganizationOnboardingService } from "./organization-onboarding.service";

@Controller("onboarding/invitations")
export class OrganizationOnboardingController {
  constructor(
    private readonly onboardingService: OrganizationOnboardingService,
  ) {}

  @Public()
  @Get(":token")
  async inspect(@Param("token") token: string) {
    const data = await this.onboardingService.inspectInvitation(token);
    return { success: true, message: "Invitation retrieved", data };
  }

  @Public()
  @Post(":token/accept")
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param("token") token: string,
    @Body() dto: AcceptOrganizationInvitationDto,
  ) {
    const data = await this.onboardingService.acceptInvitation(token, dto);
    return { success: true, message: "Invitation accepted", data };
  }
}
