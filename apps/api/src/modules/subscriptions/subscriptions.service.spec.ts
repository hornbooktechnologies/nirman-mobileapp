import { ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ProjectAccessService } from '../project-access/project-access.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService capacity enforcement', () => {
  const subscriptionsRepo = {
    findOrganizationSubscription: jest.fn(),
    countCapacity: jest.fn(),
  } as unknown as jest.Mocked<SubscriptionsRepository>;
  const database = {
    transaction: jest.fn(async (operation: (connection: never) => Promise<unknown>) =>
      operation(undefined as never),
    ),
  } as unknown as jest.Mocked<DatabaseService>;
  const projectAccess = {} as jest.Mocked<ProjectAccessService>;
  const service = new SubscriptionsService(
    subscriptionsRepo,
    database,
    projectAccess,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionsRepo.countCapacity.mockResolvedValue({
      activeProjects: 2,
      activeMembers: 3,
    });
  });

  it('preserves legacy-compatible writes when no subscription is assigned', async () => {
    subscriptionsRepo.findOrganizationSubscription.mockResolvedValue(null);
    const operation = jest.fn(async () => 'created');

    await expect(
      service.withinProjectCapacity('organization-id', operation),
    ).resolves.toBe('created');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('blocks creating active Projects at the configured limit', async () => {
    subscriptionsRepo.findOrganizationSubscription.mockResolvedValue({
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 60_000),
      endsAt: null,
      plan: { maxActiveProjects: 2 },
    } as never);
    const operation = jest.fn();

    await expect(
      service.withinProjectCapacity('organization-id', operation),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(operation).not.toHaveBeenCalled();
  });
});

