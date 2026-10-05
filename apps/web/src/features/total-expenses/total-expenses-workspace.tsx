"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { projectsService } from "@/features/projects/services/projects.service";
import { Button, Card, LoadingState } from "@/components/ui";
import { expenseScope } from "@/features/expenses/expense-rules";

export type TotalExpensesContext = {
  user: string;
  org: string;
  project: string;
  permissions: readonly string[];
  active: boolean;
  timezone: string;
};
function Access({
  projectId,
  children,
}: {
  projectId?: string;
  children: (context: TotalExpensesContext) => ReactNode;
}) {
  const {
    user,
    activeOrganizationId: org,
    activeOrganizationTimezone,
    refreshUser,
  } = useAuth();
  const access = useQuery({
    queryKey: ["total-expenses", user?.id, org, "access"],
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    gcTime: 60_000,
    queryFn: () => projectsService.projectAccess(org!),
    enabled: Boolean(org),
  });
  if (!org) return <Card>Select an organization to view Total Expenses.</Card>;
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
      p.permissions.includes("total-expenses:read"),
    );
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Total Expenses</h1>
        <p>Select a project to view paid project spending.</p>
        {!projects.length && (
          <Card>No projects with Total Expenses access.</Card>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              className="rounded-card border border-hairline bg-surface p-5 text-base focus-visible:ring-2 focus-visible:ring-lime"
              key={p.id}
              href={`/projects/${p.id}/total-expenses`}
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
  const project = access.data.projects.find(
    (p) => p.id === projectId && p.permissions.includes("total-expenses:read"),
  );
  if (!project)
    return (
      <Card>
        <p role="alert">
          You do not have permission to view Total Expenses for this project.
        </p>
        <Link href="/total-expenses">Choose a project</Link>
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
        <Link className="underline" href="/total-expenses">
          Change project
        </Link>
      </div>
      {project.status !== "ACTIVE" && (
        <Card>
          This project is {project.status.toLowerCase().replaceAll("_", " ")}.
          Total Expenses is read-only.
        </Card>
      )}
      {children({
        user: user!.id,
        org,
        project: project.id,
        permissions: project.permissions,
        active: project.status === "ACTIVE",
        timezone: activeOrganizationTimezone,
      })}
    </div>
  );
}
export function TotalExpensesWorkspace({
  projectId,
  children,
}: {
  projectId?: string;
  children: (context: TotalExpensesContext) => ReactNode;
}) {
  const { user, activeOrganizationId } = useAuth();
  return (
    <Access
      key={expenseScope(user?.id, activeOrganizationId, projectId)}
      projectId={projectId}
    >
      {children}
    </Access>
  );
}
