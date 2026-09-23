"use client";

import Link from "next/link";
import { Button, Card, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";

export function WagesProjectPicker() {
  const { activeOrganizationId } = useAuth();
  const access = useProjectAccess(activeOrganizationId);

  if (!activeOrganizationId) return <Card>Select an organization to view wages.</Card>;
  if (access.isError) {
    return (
      <Card>
        <p role="alert">{access.error.message}</p>
        <Button onClick={() => void access.refetch()}>Retry access check</Button>
      </Card>
    );
  }
  if (access.isPending || access.data?.organizationId !== activeOrganizationId) {
    return <LoadingState label="Checking project access" />;
  }

  const projects = access.data.projects.filter((project) =>
    project.permissions.includes("wages:read"),
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Wages" description="Select a project to view its wages." />
      {projects.length === 0 ? <Card>No projects with Wages access.</Card> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${encodeURIComponent(project.id)}/wages`}
            className="rounded-card border border-hairline bg-surface p-5 text-base focus-visible:ring-2 focus-visible:ring-lime"
          >
            {project.name}
            <span className="block text-sm text-sub">
              {project.status.replaceAll("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
