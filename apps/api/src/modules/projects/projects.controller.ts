import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpsertProjectMemberDto } from './dto/upsert-project-member.dto';
import { ProjectsService } from './projects.service';

@Controller('organizations/:organizationId')
@UseGuards(PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('projects')
  async findAll(
    @Param('organizationId') organizationId: string,
    @Query() query: QueryProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.findAll(organizationId, query, user);
    return { success: true, message: 'Projects retrieved', ...data };
  }

  @Post('projects')
  async create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.create(organizationId, dto, user);
    return { success: true, message: 'Project created', data };
  }

  @Get('projects/:projectId')
  async findOne(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.findById(
      organizationId,
      projectId,
      user,
    );
    return { success: true, message: 'Project retrieved', data };
  }

  @Patch('projects/:projectId')
  async update(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.update(
      organizationId,
      projectId,
      dto,
      user,
    );
    return { success: true, message: 'Project updated', data };
  }

  @Post('projects/:projectId/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.archive(organizationId, projectId, user);
    return { success: true, message: 'Project archived', data };
  }

  @Post('projects/:projectId/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.restore(organizationId, projectId, user);
    return { success: true, message: 'Project restored', data };
  }

  @Get('project-access/me')
  async projectAccess(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.getProjectAccess(organizationId, user);
    return { success: true, message: 'Project access retrieved', data };
  }

  @Post('projects/:projectId/switch')
  @HttpCode(HttpStatus.OK)
  async switchProject(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.switchProject(
      organizationId,
      projectId,
      user,
    );
    return { success: true, message: 'Project switched', data };
  }

  @Get('projects/:projectId/context')
  async context(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.getProjectContext(
      organizationId,
      projectId,
      user,
    );
    return { success: true, message: 'Project context retrieved', data };
  }

  @Get('projects/:projectId/members')
  async findMembers(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.findProjectMembers(
      organizationId,
      projectId,
      user,
    );
    return { success: true, message: 'Project members retrieved', data };
  }

  @Put('projects/:projectId/members/:memberId')
  async assignMember(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpsertProjectMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.assignProjectMember(
      organizationId,
      projectId,
      memberId,
      dto,
      user,
    );
    return { success: true, message: 'Project member assigned', data };
  }

  @Patch('projects/:projectId/members/:memberId')
  async updateMember(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpsertProjectMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.projectsService.updateProjectMember(
      organizationId,
      projectId,
      memberId,
      dto,
      user,
    );
    return { success: true, message: 'Project member updated', data };
  }

  @Delete('projects/:projectId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async unassignMember(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.projectsService.unassignProjectMember(
      organizationId,
      projectId,
      memberId,
      user,
    );
    return { success: true, message: 'Project member unassigned', data: null };
  }
}
