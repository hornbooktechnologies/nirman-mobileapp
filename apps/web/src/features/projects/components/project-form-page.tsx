"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { OrganizationContextSelect } from "@/features/projects/components/organization-context-select";
import {
  ProjectFormFields,
  emptyProjectForm,
  normalizeProjectInput,
} from "@/features/projects/components/project-form-fields";
import { useCreateProject } from "@/features/projects/hooks/use-projects";

export function ProjectFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizations = useOrganizations();
  const [organizationId, setOrganizationId] = useState(
    searchParams.get("organizationId") ?? "",
  );
  const [form, setForm] = useState(emptyProjectForm);
  const createProject = useCreateProject(organizationId);

  useEffect(() => {
    if (!organizationId && organizations.data?.[0]) {
      setOrganizationId(organizations.data[0].id);
    }
  }, [organizationId, organizations.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const project = await createProject.mutateAsync(normalizeProjectInput(form));
    router.push(`/projects/${project.id}?organizationId=${organizationId}`);
  }

  return (
    <PermissionGuard permission="projects:create">
      <div className="space-y-4">
        <PageHeader
          title="New Project"
          description="Create a project under the selected organization."
          onBack={() => router.push("/projects")}
        />
        <Card>
          <form className="space-y-4" onSubmit={submit}>
            <OrganizationContextSelect
              organizationId={organizationId}
              onChange={setOrganizationId}
            />
            <ProjectFormFields form={form} setForm={setForm} />
            <Button type="submit" disabled={!organizationId || createProject.isPending}>
              {createProject.isPending ? "Creating" : "Create Project"}
            </Button>
          </form>
        </Card>
      </div>
    </PermissionGuard>
  );
}
