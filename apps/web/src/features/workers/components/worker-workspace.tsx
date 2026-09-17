"use client";

import { useSearchParams } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Card, LoadingState } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";

// Only the authenticated organization supplies identity and organization permissions.
export function WorkerWorkspace({ permission, children }: { permission: string; children: (organizationId: string) => ReactNode }) {
  const { user, activeOrganizationId, hasPermission, isLoading } = useAuth();
  const requested = useSearchParams().get("organizationId");
  if (isLoading) return <LoadingState label="Loading worker access" />;
  if (!activeOrganizationId) return <Card>Select an organization to manage workers.</Card>;
  if (requested && requested !== activeOrganizationId) return <Card><p role="alert">Switch to this worker’s organization before opening this link.</p></Card>;
  if (!hasPermission(permission)) return <Card><p role="alert">You do not have permission to access this worker page.</p></Card>;
  return <Fragment key={`${user?.id}:${activeOrganizationId}`}>{children(activeOrganizationId)}</Fragment>;
}
