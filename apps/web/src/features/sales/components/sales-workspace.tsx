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
import { Card, LoadingState } from "@/components/ui";
import { canReadSales, salesScope } from "../sales-rules";
import { Failure } from "./sales-ui";
export type SalesContext = {
  org: string;
  project: string;
  permissions: readonly string[];
  active: boolean;
  timezone: string;
  user: string;
};
function Cache({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
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
  section,
  children,
}: {
  projectId?: string;
  section: "leads" | "follow-ups" | "site-visits" | "inventory" | "bookings";
  children: (c: SalesContext) => ReactNode;
}) {
  const {
    user,
    activeOrganizationId: org,
    activeOrganizationTimezone,
  } = useAuth();
  const access = useQuery({
    queryKey: ["sales-access", org],
    queryFn: () => projectsService.projectAccess(org!),
    enabled: Boolean(org),
  });
  if (!org || !user) return <Card>Select an organization to view Sales.</Card>;
  if (access.isPending) return <LoadingState label="Checking Sales access" />;
  if (access.isError)
    return <Failure error={access.error} retry={() => void access.refetch()} />;
  const projects = access.data.projects.filter((p) =>
    section === "inventory"
      ? p.permissions.includes("inventory:read")
      : canReadSales(p.permissions),
  );
  if (!projectId)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          Sales{" "}
          {section === "inventory"
            ? "inventory"
            : section === "leads"
              ? "leads"
              : section === "site-visits"
                ? "site visits"
                : section === "bookings"
                  ? "bookings"
                  : "follow-ups"}
        </h1>
        <p>Select a project.</p>
        {!projects.length && <Card>No projects with Sales access.</Card>}
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              className="rounded-card border border-hairline bg-surface p-5 focus-visible:ring-2 focus-visible:ring-lime"
              href={`/projects/${p.id}/sales/${section}`}
            >
              {p.name}
              <span className="block text-sm text-sub">{p.status}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  const project = projects.find((p) => p.id === projectId);
  if (!project)
    return (
      <Card>
        <p role="alert">You do not have Sales access to this project.</p>
        <Link href="/sales/leads">Choose a project</Link>
      </Card>
    );
  const timezone = activeOrganizationTimezone || "Asia/Kolkata";
  return (
    <div className="space-y-5 text-base leading-relaxed [&_button]:min-h-11 [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_textarea]:text-base">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="font-semibold">{project.name}</p>
          <p className="text-sm text-sub">Working timezone: {timezone}</p>
        </div>
        <Link className="underline" href={`/sales/${section}`}>
          Change project
        </Link>
      </header>
      <nav aria-label="Sales" className="flex flex-wrap gap-5">
        {project.permissions.includes("inventory:read") && (
          <Link
            className="underline"
            aria-current={section === "inventory" ? "page" : undefined}
            href={`/projects/${project.id}/sales/inventory`}
          >
            Inventory
          </Link>
        )}
        {canReadSales(project.permissions) && (
          <>
            <Link
              className="underline"
              aria-current={section === "bookings" ? "page" : undefined}
              href={`/projects/${project.id}/sales/bookings`}
            >
              Bookings
            </Link>
            <Link
              aria-current={section === "leads" ? "page" : undefined}
              className="underline"
              href={`/projects/${project.id}/sales/leads`}
            >
              Leads
            </Link>
            <Link
              aria-current={section === "follow-ups" ? "page" : undefined}
              className="underline"
              href={`/projects/${project.id}/sales/follow-ups`}
            >
              Follow-ups
            </Link>
            <Link
              aria-current={section === "site-visits" ? "page" : undefined}
              className="underline"
              href={`/projects/${project.id}/sales/site-visits`}
            >
              Site Visits
            </Link>
          </>
        )}
      </nav>
      {project.status !== "ACTIVE" && (
        <Card>
          This project is {project.status.toLowerCase()}. Sales is read-only.
        </Card>
      )}
      <Cache key={JSON.stringify([project.permissions, project.status])}>
        {children({
          org,
          project: project.id,
          permissions: project.permissions,
          active: project.status === "ACTIVE",
          timezone,
          user: user.id,
        })}
      </Cache>
    </div>
  );
}
export function SalesWorkspace(props: {
  projectId?: string;
  section: "leads" | "follow-ups" | "site-visits" | "inventory" | "bookings";
  children: (c: SalesContext) => ReactNode;
}) {
  const { user, activeOrganizationId } = useAuth();
  return (
    <Cache key={salesScope(user?.id, activeOrganizationId, props.projectId)}>
      <Access {...props} />
    </Cache>
  );
}
