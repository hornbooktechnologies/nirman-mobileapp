"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscriptionsService } from "./service";

const subscriptionKeys = {
  plans: ["subscription-plans"] as const,
  organization: (organizationId: string) =>
    ["organization-subscription", organizationId] as const,
};

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: subscriptionsService.plans,
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionsService.createPlan,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.plans }),
  });
}

export function useOrganizationSubscription(organizationId: string) {
  return useQuery({
    queryKey: subscriptionKeys.organization(organizationId),
    queryFn: () => subscriptionsService.organizationSummary(organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useCustomerSubscriptionSummary(organizationId: string) {
  return useQuery({
    queryKey: [...subscriptionKeys.organization(organizationId), "customer"],
    queryFn: () => subscriptionsService.customerSummary(organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useAssignOrganizationSubscription(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof subscriptionsService.assign>[1],
    ) => subscriptionsService.assign(organizationId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.organization(organizationId),
      }),
  });
}
