import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { AssignOrganizationSubscriptionDto } from './dto/assign-organization-subscription.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
@UseGuards(PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('platform/subscription-plans')
  @RequirePermissions('platform-subscriptions:read')
  async findPlans() {
    const data = await this.subscriptionsService.findPlans();
    return { success: true, message: 'Subscription plans retrieved', data };
  }

  @Post('platform/subscription-plans')
  @RequirePermissions('platform-subscriptions:update')
  async createPlan(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.subscriptionsService.createPlan(dto, actor);
    return { success: true, message: 'Subscription plan created', data };
  }

  @Patch('platform/subscription-plans/:planId')
  @RequirePermissions('platform-subscriptions:update')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.subscriptionsService.updatePlan(planId, dto, actor);
    return { success: true, message: 'Subscription plan updated', data };
  }

  @Get('platform/organizations/:organizationId/subscription')
  @RequirePermissions('platform-subscriptions:read')
  async findOrganizationSubscription(
    @Param('organizationId') organizationId: string,
  ) {
    const data =
      await this.subscriptionsService.findOrganizationSubscription(organizationId);
    return { success: true, message: 'Organization subscription retrieved', data };
  }

  @Put('platform/organizations/:organizationId/subscription')
  @RequirePermissions('platform-subscriptions:update')
  async assignOrganizationSubscription(
    @Param('organizationId') organizationId: string,
    @Body() dto: AssignOrganizationSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.subscriptionsService.assignOrganizationSubscription(
      organizationId,
      dto,
      actor,
    );
    return { success: true, message: 'Organization subscription saved', data };
  }

  @Get('organizations/:organizationId/subscription-summary')
  async organizationSummary(
    @Param('organizationId') organizationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.subscriptionsService.organizationSummary(
      organizationId,
      actor,
    );
    return { success: true, message: 'Subscription capacity retrieved', data };
  }
}

