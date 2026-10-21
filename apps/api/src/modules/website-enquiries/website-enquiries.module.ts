import { Module } from "@nestjs/common";
import { WebsiteEnquiriesController } from "./website-enquiries.controller";
import { WebsiteEnquiriesRepository } from "./website-enquiries.repository";
import { WebsiteEnquiriesService } from "./website-enquiries.service";

@Module({
  controllers: [WebsiteEnquiriesController],
  providers: [WebsiteEnquiriesService, WebsiteEnquiriesRepository],
})
export class WebsiteEnquiriesModule {}
