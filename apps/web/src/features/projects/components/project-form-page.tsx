"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  ProjectFormFields,
  emptyProjectForm,
  normalizeProjectInput,
} from "@/features/projects/components/project-form-fields";
import { useCreateProject } from "@/features/projects/hooks/use-projects";

export function ProjectFormPage() {
  const router = useRouter();
  const { activeOrganizationId } = useAuth();
  const organizationId = activeOrganizationId ?? "";
  const [form, setForm] = useState(emptyProjectForm);
  const [error, setError] = useState("");
  const createProject = useCreateProject(organizationId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const project = await createProject.mutateAsync(normalizeProjectInput(form));
      router.push(`/projects/${project.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create project.");
    }
  }

  return (
    <PermissionGuard permission="projects:create">
      <div className="space-y-4">
        <PageHeader
          title="New Project"
          description="Create a project in the active organization."
          onBack={() => router.push("/projects")}
        />
        <Card>
          <form className="space-y-4" onSubmit={submit}>
            <ProjectFormFields form={form} setForm={setForm} />
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={!organizationId || createProject.isPending}>
              {createProject.isPending ? "Creating" : "Create Project"}
            </Button>
          </form>
        </Card>
      </div>
    </PermissionGuard>
  );
}
