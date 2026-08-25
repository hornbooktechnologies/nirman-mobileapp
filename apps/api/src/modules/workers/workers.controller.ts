import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { AssignWorkerDto } from "./dto/assign-worker.dto";
import { CreateWorkerDto } from "./dto/create-worker.dto";
import { DeactivateWorkerDto } from "./dto/deactivate-worker.dto";
import { EndWorkerAssignmentDto } from "./dto/end-worker-assignment.dto";
import { QueryWorkerDto } from "./dto/query-worker.dto";
import { UpdateWorkerAssignmentDto } from "./dto/update-worker-assignment.dto";
import { UpdateWorkerRateDto } from "./dto/update-worker-rate.dto";
import { UpdateWorkerDto } from "./dto/update-worker.dto";
import {
  CreatePrimaryProjectPeriodDto,
  EndPrimaryProjectPeriodDto,
  UpdatePrimaryProjectPeriodDto,
} from "./dto/primary-project-period.dto";
import { WorkersService } from "./workers.service";

@Controller("organizations/:organizationId")
@UseGuards(PermissionsGuard)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get("workers")
  async findAll(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Query() query: QueryWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.findAll(organizationId, query, user);
    return { success: true, message: "Workers retrieved", data };
  }

  @Get("workers/duplicate-candidates")
  async duplicateCandidates(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Query("name") name: string | undefined,
    @Query("mobileNumber") mobileNumber: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.duplicateCandidates(
      organizationId,
      name,
      mobileNumber,
      user,
    );
    return {
      success: true,
      message: "Worker duplicate candidates retrieved",
      data,
    };
  }

  @Post("workers")
  async create(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Body() dto: CreateWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.create(organizationId, dto, user);
    return { success: true, message: "Worker created", data };
  }

  @Get("workers/:workerId")
  async findOne(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.findById(
      organizationId,
      workerId,
      user,
    );
    return { success: true, message: "Worker retrieved", data };
  }

  @Get("workers/:workerId/primary-project-periods")
  async findPrimaryProjectPeriods(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.findPrimaryProjectPeriods(organizationId, workerId, user);
    return { success: true, message: "Worker primary Project periods retrieved", data };
  }

  @Post("workers/:workerId/primary-project-periods")
  async createPrimaryProjectPeriod(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Body() dto: CreatePrimaryProjectPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.createPrimaryProjectPeriod(organizationId, workerId, dto, user);
    return { success: true, message: "Worker primary Project period created", data };
  }

  @Patch("workers/:workerId/primary-project-periods/:periodId")
  async updatePrimaryProjectPeriod(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Param("periodId", new ParseUUIDPipe()) periodId: string,
    @Body() dto: UpdatePrimaryProjectPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.updatePrimaryProjectPeriod(organizationId, workerId, periodId, dto, user);
    return { success: true, message: "Worker primary Project period updated", data };
  }

  @Post("workers/:workerId/primary-project-periods/:periodId/end")
  @HttpCode(HttpStatus.OK)
  async endPrimaryProjectPeriod(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Param("periodId", new ParseUUIDPipe()) periodId: string,
    @Body() dto: EndPrimaryProjectPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.endPrimaryProjectPeriod(organizationId, workerId, periodId, dto, user);
    return { success: true, message: "Worker primary Project period ended", data };
  }

  @Patch("workers/:workerId")
  async update(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.update(
      organizationId,
      workerId,
      dto,
      user,
    );
    return { success: true, message: "Worker updated", data };
  }

  @Post("workers/:workerId/deactivate")
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Body() dto: DeactivateWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.deactivate(
      organizationId,
      workerId,
      dto,
      user,
    );
    return { success: true, message: "Worker deactivated", data };
  }

  @Get("projects/:projectId/workers")
  async findProjectRoster(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.findProjectRoster(
      organizationId,
      projectId,
      query,
      user,
    );
    return { success: true, message: "Project workers retrieved", data };
  }

  @Put("projects/:projectId/workers/:workerId")
  async assignWorker(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Body() dto: AssignWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.assignWorker(
      organizationId,
      projectId,
      workerId,
      dto,
      user,
    );
    return { success: true, message: "Worker assigned to project", data };
  }

  @Patch("projects/:projectId/workers/:workerId/assignment")
  async updateAssignment(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Body() dto: UpdateWorkerAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.updateAssignment(
      organizationId,
      projectId,
      workerId,
      dto,
      user,
    );
    return { success: true, message: "Worker assignment updated", data };
  }

  @Post("projects/:projectId/workers/:workerId/assignment/rate-change")
  @HttpCode(HttpStatus.OK)
  async updateRate(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Body() dto: UpdateWorkerRateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.updateAssignmentRate(
      organizationId,
      projectId,
      workerId,
      dto,
      user,
    );
    return { success: true, message: "Worker assignment rate updated", data };
  }

  @Post("projects/:projectId/workers/:workerId/end-assignment")
  @HttpCode(HttpStatus.OK)
  async endAssignment(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Body() dto: EndWorkerAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.workersService.endAssignment(
      organizationId,
      projectId,
      workerId,
      dto,
      user,
    );
    return { success: true, message: "Worker assignment ended", data };
  }
}
