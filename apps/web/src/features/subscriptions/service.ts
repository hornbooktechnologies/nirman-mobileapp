import { api } from "@/lib/api/api-client";
import type {
  AssignSubscriptionInput,
  CreateSubscriptionPlanInput,
  SubscriptionPlan,
  SubscriptionSummary,
} from "./types";

export const subscriptionsService = {
  plans() {
    return api.get<SubscriptionPlan[]>("/platform/subscription-plans");
  },
  createPlan(input: CreateSubscriptionPlanInput) {
    return api.post<SubscriptionPlan, CreateSubscriptionPlanInput>(
      "/platform/subscription-plans",
      input,
    );
  },
  organizationSummary(organizationId: string) {
    return api.get<SubscriptionSummary>(
      `/platform/organizations/${organizationId}/subscription`,
    );
  },
  customerSummary(organizationId: string) {
    return api.get<SubscriptionSummary>(
      `/organizations/${organizationId}/subscription-summary`,
    );
  },
  assign(organizationId: string, input: AssignSubscriptionInput) {
    return api.put<SubscriptionSummary, AssignSubscriptionInput>(
      `/platform/organizations/${organizationId}/subscription`,
      input,
    );
  },
};
