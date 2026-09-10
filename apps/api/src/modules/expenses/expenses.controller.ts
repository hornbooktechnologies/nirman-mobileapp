import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import {
  AdjustExpenseDto,
  ConfigureExpensesDto,
  CreateExpenseDto,
  ExpenseCommandDto,
  QueryExpensesDto,
  UpdateExpenseDto,
} from "./dto/expenses.dto";
import { ExpensesService } from "./expenses.service";

@Controller("organizations/:organizationId/projects/:projectId/expenses")
@UseGuards(PermissionsGuard)
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get("settings")
  @RequirePermissions("expenses:read")
  settings(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense settings retrieved",
      this.service.findSettings(organizationId, projectId, actor),
    );
  }

  @Put("settings")
  @RequirePermissions("expenses:configure")
  configure(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: ConfigureExpensesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense workflow configured",
      this.service.configure(organizationId, projectId, dto, actor),
    );
  }

  @Get()
  @RequirePermissions("expenses:read")
  findMany(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryExpensesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expenses retrieved",
      this.service.findMany(organizationId, projectId, query, actor),
    );
  }

  @Get("summary")
  @RequirePermissions("expenses:read")
  summary(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryExpensesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense summary retrieved",
      this.service.summary(organizationId, projectId, query, actor),
    );
  }

  @Get("export")
  @RequirePermissions("expenses:export")
  async export(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryExpensesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.export(
      organizationId,
      projectId,
      query,
      actor,
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${data.filename}"`,
    );
    return data.csv;
  }

  @Post()
  @RequirePermissions("expenses:create")
  create(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense recorded",
      this.service.create(organizationId, projectId, dto, actor),
    );
  }

  @Get(":expenseId")
  @RequirePermissions("expenses:read")
  detail(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("expenseId", new ParseUUIDPipe()) expenseId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense retrieved",
      this.service.findDetail(organizationId, projectId, expenseId, actor),
    );
  }

  @Patch(":expenseId")
  @RequirePermissions("expenses:update")
  update(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("expenseId", new ParseUUIDPipe()) expenseId: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense updated",
      this.service.update(organizationId, projectId, expenseId, dto, actor),
    );
  }

  @Post(":expenseId/submit")
  @RequirePermissions("expenses:update")
  submit(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("expenseId", new ParseUUIDPipe()) expenseId: string,
    @Body() dto: ExpenseCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense submitted",
      this.service.submit(organizationId, projectId, expenseId, dto, actor),
    );
  }

  @Post(":expenseId/approve")
  @RequirePermissions("expenses:approve")
  approve(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("expenseId", new ParseUUIDPipe()) expenseId: string,
    @Body() dto: ExpenseCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense approved",
      this.service.approve(organizationId, projectId, expenseId, dto, actor),
    );
  }

  @Post(":expenseId/reject")
  @RequirePermissions("expenses:reject")
  reject(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("expenseId", new ParseUUIDPipe()) expenseId: string,
    @Body() dto: ExpenseCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense rejected",
      this.service.reject(organizationId, projectId, expenseId, dto, actor),
    );
  }

  @Post(":expenseId/cancel")
  @RequirePermissions("expenses:update")
  cancel(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("expenseId", new ParseUUIDPipe()) expenseId: string,
    @Body() dto: ExpenseCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense cancelled",
      this.service.cancel(organizationId, projectId, expenseId, dto, actor),
    );
  }

  @Post(":expenseId/adjustments")
  @RequirePermissions("expenses:adjust")
  adjust(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("expenseId", new ParseUUIDPipe()) expenseId: string,
    @Body() dto: AdjustExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Expense adjustment recorded",
      this.service.adjust(organizationId, projectId, expenseId, dto, actor),
    );
  }

  private async result(message: string, promise: Promise<unknown>) {
    return { success: true, message, data: await promise };
  }
}
