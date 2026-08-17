"use client";

import { Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { OrganizationMembersPanel } from "@/features/organizations/components/organization-members-panel";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { OrganizationCapacityCard } from "@/features/subscriptions/organization-capacity-card";

export function MembersPage() {
  const { activeOrganizationId } = useAuth();

  return (
    <PermissionGuard permission="members:read">
      <div className="space-y-4">
        <PageHeader
          title="Members"
          description="Manage your organization team and assign members to the projects where they work."
        />

        {!activeOrganizationId ? (
          <Card className="text-[13px] text-body">
            No active organization is available.
          </Card>
        ) : (
          <>
            <OrganizationCapacityCard organizationId={activeOrganizationId} />
            <OrganizationMembersPanel organizationId={activeOrganizationId} />
          </>
        )}
      </div>
    </PermissionGuard>
  );
}
