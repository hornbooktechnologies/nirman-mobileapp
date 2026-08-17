"use client";

import { Badge, Card } from "@/components/ui";
import { useCustomerSubscriptionSummary } from "./hooks";

export function OrganizationCapacityCard({
  organizationId,
}: {
  organizationId: string;
}) {
  const summary = useCustomerSubscriptionSummary(organizationId);
  if (summary.isLoading || summary.isError || !summary.data) return null;
  const { subscription, usage } = summary.data;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.5px] text-sub">
          Subscription capacity
        </p>
        <p className="mt-1 text-[15px] font-semibold text-body">
          {subscription?.plan.name ?? "Legacy compatible access"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          Projects {usage.activeProjects}/{subscription?.plan.maxActiveProjects ?? "Unlimited"}
        </Badge>
        <Badge variant="outline">
          Members {usage.activeMembers}/{subscription?.plan.maxActiveMembers ?? "Unlimited"}
        </Badge>
        {subscription ? (
          <Badge variant={subscription.status === "ACTIVE" ? "success" : "warning"}>
            {subscription.status}
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}
