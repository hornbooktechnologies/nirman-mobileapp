"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { projectsService } from "@/features/projects/services/projects.service";
import { Button, Card, LoadingState } from "@/components/ui";
import { effectiveKharchiProject } from "../kharchi-rules";

export type KharchiContext = { org: string; project: string; permissions: readonly string[]; active: boolean };
function Cache({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: true }, mutations: { retry: false } } }));
  useEffect(() => () => { void client.cancelQueries(); client.clear(); }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function Access({ projectId, children }: { projectId?: string; children: (context: KharchiContext) => ReactNode }) {
  const { activeOrganizationId: org } = useAuth();
  const access = useQuery({ queryKey: ["kharchi-access", org], queryFn: () => projectsService.projectAccess(org!), enabled: Boolean(org) });
  if (!org) return <Card>Select an organization to view Kharchi.</Card>;
  if (access.isPending) return <LoadingState label="Checking project access" />;
  if (access.isError) return <Card><p role="alert">{access.error.message}</p><Button onClick={() => void access.refetch()}>Retry</Button></Card>;
  if (!projectId) {
    const projects = access.data.projects.filter(p => p.permissions.includes("kharchi:read"));
    return <div className="space-y-4"><h1 className="text-2xl font-semibold">Kharchi</h1><p>Select a project to view worker advances.</p>{!projects.length && <Card>No projects with Kharchi access.</Card>}<div className="grid gap-4 sm:grid-cols-2">{projects.map(p => <Link className="rounded-card border border-hairline bg-surface p-5 text-base focus-visible:ring-2 focus-visible:ring-lime" key={p.id} href={`/projects/${p.id}/kharchi`}>{p.name}<span className="block text-sm text-sub">{p.status.replaceAll("_", " ")}</span></Link>)}</div></div>;
  }
  const project = effectiveKharchiProject(access.data.projects, projectId);
  if (!project) return <Card><p role="alert">You do not have permission to view Kharchi for this project.</p><Link href="/kharchi">Choose a project</Link></Card>;
  return <div className="space-y-5 text-base leading-relaxed [&_button]:min-h-11 [&_button]:text-sm [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_textarea]:text-base"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{project.name}</p><Link className="underline" href="/kharchi">Change project</Link></div>{project.status !== "ACTIVE" && <Card>This project is {project.status.toLowerCase().replaceAll("_", " ")}. Kharchi is read-only.</Card>}{children({ org, project: project.id, permissions: project.permissions, active: project.status === "ACTIVE" })}</div>;
}
export function KharchiWorkspace({ projectId, children }: { projectId?: string; children: (context: KharchiContext) => ReactNode }) {
  const { user, activeOrganizationId } = useAuth();
  return <Cache key={`${user?.id}:${activeOrganizationId}:${projectId}`}><Access projectId={projectId}>{children}</Access></Cache>;
}
