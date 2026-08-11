import { Module } from '@nestjs/common';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ProjectAccessRepository } from './project-access.repository';
import { ProjectAccessService } from './project-access.service';

@Module({
  providers: [ProjectAccessRepository, ProjectAccessService, OrganizationsRepository],
  exports: [ProjectAccessService],
})
export class ProjectAccessModule {}
