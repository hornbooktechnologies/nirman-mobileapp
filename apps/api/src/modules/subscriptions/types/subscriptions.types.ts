import type { SubscriptionStatus } from '@nirman-app/shared';
import type { DbRow } from '../../../database/database.types';

export interface SubscriptionPlanRow extends DbRow {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  max_active_projects: number | null;
  max_active_members: number | null;
  storage_limit_bytes: string | number | null;
  is_active: number | boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationSubscriptionRow extends SubscriptionPlanRow {
  subscription_id: string;
  organization_id: string;
  plan_id: string;
  subscription_status: SubscriptionStatus;
  starts_at: Date;
  ends_at: Date | null;
  internal_note: string | null;
  assigned_by: string | null;
  subscription_created_at: Date;
  subscription_updated_at: Date;
}

export interface CapacityCountRow extends DbRow {
  active_projects: number;
  active_members: number;
}

