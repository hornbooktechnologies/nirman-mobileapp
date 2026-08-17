import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DatabaseTransaction } from '../../database/database.types';
import { DatabaseService } from '../../database/database.service';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { ProjectAccessService } from '../project-access/project-access.service';
import type { AssignOrganizationSubscriptionDto } from './dto/assign-organization-subscription.dto';
import type { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import type { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionsRepository } from './subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly database: DatabaseService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  findPlans() {
    return this.subscriptionsRepo.findPlans();
  }

  createPlan(dto: CreateSubscriptionPlanDto, actor: AuthenticatedUser) {
    return this.subscriptionsRepo.createPlan(dto, actor.id);
  }

  async updatePlan(planId: string, dto: UpdateSubscriptionPlanDto, actor: AuthenticatedUser) {
    if (!(await this.subscriptionsRepo.findPlanById(planId))) {
      throw new NotFoundException('Subscription plan not found');
    }
    return this.subscriptionsRepo.updatePlan(planId, dto, actor.id);
  }

  async findOrganizationSubscription(organizationId: string) {
    return this.summary(organizationId);
  }

  async assignOrganizationSubscription(
    organizationId: string,
    dto: AssignOrganizationSubscriptionDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.subscriptionsRepo.findPlanById(dto.planId);
    if (!plan) throw new NotFoundException('Subscription plan not found');
    if (!plan.isActive && dto.status === 'ACTIVE') {
      throw new ConflictException('An inactive plan cannot be assigned as active');
    }
    if (dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new ConflictException('Subscription end must be after its start');
    }
    await this.subscriptionsRepo.assignOrganizationSubscription(
      organizationId,
      dto,
      actor.id,
    );
    return this.summary(organizationId);
  }

  async organizationSummary(organizationId: string, actor: AuthenticatedUser) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      'organizations:read',
    );
    return this.summary(organizationId);
  }

  async withinProjectCapacity<T>(
    organizationId: string,
    operation: (connection: DatabaseTransaction) => Promise<T>,
  ) {
    return this.database.transaction(async (connection) => {
      const subscription =
        await this.subscriptionsRepo.findOrganizationSubscription(
          organizationId,
          connection,
          true,
        );
      if (subscription) {
        this.assertActive(subscription);
        const usage = await this.subscriptionsRepo.countCapacity(
          organizationId,
          connection,
        );
        const limit = subscription.plan.maxActiveProjects;
        if (limit !== null && usage.activeProjects >= limit) {
          throw new ForbiddenException({
            code: 'PROJECT_CAPACITY_REACHED',
            message: 'Active Project plan limit reached',
          });
        }
      }
      return operation(connection);
    });
  }

  async withinMemberCapacity<T>(
    organizationId: string,
    operation: (connection: DatabaseTransaction) => Promise<T>,
  ) {
    return this.database.transaction(async (connection) => {
      const subscription =
        await this.subscriptionsRepo.findOrganizationSubscription(
          organizationId,
          connection,
          true,
        );
      if (subscription) {
        this.assertActive(subscription);
        const usage = await this.subscriptionsRepo.countCapacity(
          organizationId,
          connection,
        );
        const limit = subscription.plan.maxActiveMembers;
        if (limit !== null && usage.activeMembers >= limit) {
          throw new ForbiddenException({
            code: 'MEMBER_CAPACITY_REACHED',
            message: 'Active Member plan limit reached',
          });
        }
      }
      return operation(connection);
    });
  }

  private async summary(organizationId: string) {
    const [subscription, usage] = await Promise.all([
      this.subscriptionsRepo.findOrganizationSubscription(organizationId),
      this.subscriptionsRepo.countCapacity(organizationId),
    ]);
    return {
      subscription,
      legacyCompatible: subscription === null,
      usage: {
        ...usage,
        storageBytes: null,
      },
    };
  }

  private assertActive(subscription: {
    status: string;
    startsAt: Date;
    endsAt: Date | null;
  }) {
    const now = Date.now();
    if (
      subscription.status !== 'ACTIVE' ||
      subscription.startsAt.getTime() > now ||
      (subscription.endsAt && subscription.endsAt.getTime() <= now)
    ) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_INACTIVE',
        message: 'Organization subscription is not active',
      });
    }
  }
}
