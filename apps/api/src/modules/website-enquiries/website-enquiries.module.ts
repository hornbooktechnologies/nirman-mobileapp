import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { WebsiteEnquiriesController } from "./website-enquiries.controller";
import { WebsiteEnquiriesRepository } from "./website-enquiries.repository";
import { WebsiteEnquiriesService } from "./website-enquiries.service";

@Module({
  imports: [OrganizationsModule],
  controllers: [WebsiteEnquiriesController],
  providers: [WebsiteEnquiriesService, WebsiteEnquiriesRepository],
})
export class WebsiteEnquiriesModule {}
