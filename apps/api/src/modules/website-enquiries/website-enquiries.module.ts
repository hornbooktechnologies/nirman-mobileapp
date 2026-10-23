import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { WebsiteEnquiriesController } from "./website-enquiries.controller";
import { WebsiteEnquiriesRepository } from "./website-enquiries.repository";
import { WebsiteEnquiriesService } from "./website-enquiries.service";
import { WebsiteContactController } from "./website-contact.controller";
import { WebsiteContactService } from "./website-contact.service";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [OrganizationsModule, EmailModule],
  controllers: [WebsiteEnquiriesController, WebsiteContactController],
  providers: [
    WebsiteEnquiriesService,
    WebsiteEnquiriesRepository,
    WebsiteContactService,
  ],
})
export class WebsiteEnquiriesModule {}
