import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import {
  ConvertWebsiteEnquiryDto,
  CreateWebsiteEnquiryDto,
  QueryWebsiteEnquiriesDto,
  UpdateWebsiteEnquiryDto,
} from "./dto/website-enquiries.dto";
import { WebsiteEnquiriesService } from "./website-enquiries.service";

@Controller("platform/website-enquiries")
@UseGuards(PermissionsGuard)
export class WebsiteEnquiriesController {
  constructor(private readonly service: WebsiteEnquiriesService) {}

  @Public()
  @Post("ingest")
  async ingest(
    @Body() dto: CreateWebsiteEnquiryDto,
    @Headers("x-website-enquiry-key") ingestKey?: string,
  ) {
    const data = await this.service.create(dto, ingestKey);
    return { success: true, message: "Website enquiry stored", data };
  }

  @Get(":enquiryId/activities")
  async activities(
    @Param("enquiryId") enquiryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.service.activities(enquiryId, user);
    return {
      success: true,
      message: "Website enquiry activity retrieved",
      data,
    };
  }

  @Patch(":enquiryId")
  async update(
    @Param("enquiryId") enquiryId: string,
    @Body() dto: UpdateWebsiteEnquiryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.service.update(enquiryId, dto, user);
    return { success: true, message: "Website enquiry updated", data };
  }

  @Get()
  async findAll(
    @Query() query: QueryWebsiteEnquiriesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.findAll(query, user);
    return { success: true, message: "Website enquiries retrieved", ...result };
  }

  @Patch(":enquiryId/convert")
  async convert(
    @Param("enquiryId") enquiryId: string,
    @Body() dto: ConvertWebsiteEnquiryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.service.convert(enquiryId, dto, user);
    return { success: true, message: "Website enquiry converted", data };
  }
}
