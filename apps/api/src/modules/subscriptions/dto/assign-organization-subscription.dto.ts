import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@nirman-app/shared';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignOrganizationSubscriptionDto {
  @IsUUID()
  planId!: string;

  @IsIn(SUBSCRIPTION_STATUSES)
  status!: SubscriptionStatus;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsString()
  internalNote?: string | null;
}

