import type { SubscriptionStatus } from "@nirman-app/shared";

export interface SubscriptionPlan {
  id: string;
  planKey: string;
  name: string;
  description: string | null;
  maxActiveProjects: number | null;
  maxActiveMembers: number | null;
  storageLimitBytes: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionSummary {
  subscription: null | {
    id: string;
    organizationId: string;
    planId: string;
    status: SubscriptionStatus;
    startsAt: string;
    endsAt: string | null;
    internalNote: string | null;
    plan: SubscriptionPlan;
  };
  legacyCompatible: boolean;
  usage: {
    activeProjects: number;
    activeMembers: number;
    storageBytes: number | null;
  };
}

export interface CreateSubscriptionPlanInput {
  planKey: string;
  name: string;
  description?: string | null;
  maxActiveProjects?: number | null;
  maxActiveMembers?: number | null;
  storageLimitBytes?: number | null;
  isActive?: boolean;
}

export interface AssignSubscriptionInput {
  planId: string;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt?: string | null;
  internalNote?: string | null;
}

