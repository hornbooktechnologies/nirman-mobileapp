"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { effectiveWageProject } from "../wage-rules";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { projectsService } from "@/features/projects/services/projects.service";
import { Button, Card, LoadingState } from "@/components/ui";

// A workspace cache is discarded on user/organization changes, including in-flight reads.
function ScopedCache({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: true }, mutations: { retry: false },
  } }));
  useEffect(() => () => { void client.cancelQueries(); client.clear(); }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Access({ projectId, children }: { projectId: string; children: (permissions: string[], archived: boolean) => ReactNode }) {
  const { activeOrganizationId } = useAuth();
  const access = useQuery({
    queryKey: ["wage-access", activeOrganizationId],
    queryFn: () => projectsService.projectAccess(activeOrganizationId!),
    enabled: Boolean(activeOrganizationId),
  });
  if (!activeOrganizationId) return <Card>Select an organization to view wages.</Card>;
  if (access.isPending) return <LoadingState label="Checking project access" />;
  if (access.isError) return <Card><p role="alert">{access.error.message}</p><Button onClick={() => void access.refetch()}>Retry access check</Button></Card>;
  const project = effectiveWageProject(access.data.projects, projectId);
  if (!project?.permissions.includes("wages:read")) return <Card><p role="alert">You do not have permission to view wages for this project.</p></Card>;
  return children(project.permissions, project.status === "ARCHIVED");
}

export function WageWorkspace({ projectId, children }: { projectId: string; children: (permissions: string[], archived: boolean) => ReactNode }) {
  const { user, activeOrganizationId } = useAuth();
  return <ScopedCache key={`${user?.id}:${activeOrganizationId}:${projectId}`}><Access projectId={projectId}>{children}</Access></ScopedCache>;
}
