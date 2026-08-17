import { Module } from '@nestjs/common';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { EmailModule } from '../email/email.module';
import { OrganizationOnboardingController } from './organization-onboarding.controller';
import { OrganizationOnboardingRepository } from './organization-onboarding.repository';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [ProjectAccessModule, EmailModule, SubscriptionsModule],
  controllers: [OrganizationsController, OrganizationOnboardingController],
  providers: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationOnboardingRepository,
    OrganizationOnboardingService,
  ],
  exports: [OrganizationsRepository],
})
export class OrganizationsModule {}
