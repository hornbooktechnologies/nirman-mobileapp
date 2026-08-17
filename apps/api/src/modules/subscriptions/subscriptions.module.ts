import { Module } from '@nestjs/common';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [ProjectAccessModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsRepository, SubscriptionsService, OrganizationsRepository],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

