"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { projectsService } from "@/features/projects/services/projects.service";
import { Button, Card, LoadingState } from "@/components/ui";
import { expenseProject, expenseScope } from "../expense-rules";

export type ExpensesContext = {
  org: string;
  project: string;
  permissions: readonly string[];
  active: boolean;
  timezone: string;
};
function Cache({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function Access({
  projectId,
  children,
}: {
  projectId?: string;
  children: (context: ExpensesContext) => ReactNode;
}) {
  const {
    activeOrganizationId: org,
    activeOrganizationTimezone,
    refreshUser,
  } = useAuth();
  const access = useQuery({
    queryKey: ["expenses-access", org],
    queryFn: () => projectsService.projectAccess(org!),
    enabled: Boolean(org),
  });
  if (!org) return <Card>Select an organization to view Expenses.</Card>;
  if (access.isPending) return <LoadingState label="Checking project access" />;
  if (access.isError)
    return (
      <Card>
        <p role="alert">{access.error.message}</p>
        <Button onClick={() => void access.refetch()}>Retry</Button>
      </Card>
    );
  if (!projectId) {
    const projects = access.data.projects.filter((p) =>
      p.permissions.includes("expenses:read"),
    );
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p>Select a project to view site expenses.</p>
        {!projects.length && <Card>No projects with Expenses access.</Card>}
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              className="rounded-card border border-hairline bg-surface p-5 text-base focus-visible:ring-2 focus-visible:ring-lime"
              key={p.id}
              href={`/projects/${p.id}/expenses`}
            >
              {p.name}
              <span className="block text-sm text-sub">
                {p.status.replaceAll("_", " ")}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  const project = expenseProject(access.data.projects, projectId);
  if (!project)
    return (
      <Card>
        <p role="alert">
          You do not have permission to view Expenses for this project.
        </p>
        <Link href="/expenses">Choose a project</Link>
      </Card>
    );
  if (!activeOrganizationTimezone)
    return (
      <Card>
        <p role="alert">Organization working timezone is unavailable.</p>
        <Button onClick={() => void refreshUser()}>Refresh access</Button>
      </Card>
    );
  return (
    <div className="space-y-5 text-base leading-relaxed [&_button]:min-h-11 [&_button]:text-sm [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_textarea]:text-base">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{project.name}</p>
          <p className="text-sm text-sub">
            Working timezone: {activeOrganizationTimezone}
          </p>
        </div>
        <Link className="underline" href="/expenses">
          Change project
        </Link>
      </div>
      {project.status !== "ACTIVE" && (
        <Card>
          This project is {project.status.toLowerCase().replaceAll("_", " ")}.
          Expenses is read-only.
        </Card>
      )}
      {children({
        org,
        project: project.id,
        permissions: project.permissions,
        active: project.status === "ACTIVE",
        timezone: activeOrganizationTimezone,
      })}
    </div>
  );
}
export function ExpensesWorkspace({
  projectId,
  children,
}: {
  projectId?: string;
  children: (context: ExpensesContext) => ReactNode;
}) {
  const { user, activeOrganizationId } = useAuth();
  return (
    <Cache key={expenseScope(user?.id, activeOrganizationId, projectId)}>
      <Access projectId={projectId}>{children}</Access>
    </Cache>
  );
}
