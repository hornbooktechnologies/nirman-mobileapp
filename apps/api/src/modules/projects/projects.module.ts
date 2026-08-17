import { Module } from '@nestjs/common';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [ProjectAccessModule, SubscriptionsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, OrganizationsRepository],
})
export class ProjectsModule {}
