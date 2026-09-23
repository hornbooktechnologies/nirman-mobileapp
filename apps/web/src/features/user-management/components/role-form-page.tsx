"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Button, Card, Input, PageHeader, Textarea } from "@/components/ui";
import { useCreateRole } from "@/features/user-management/hooks/use-user-management";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { administrationDetailUrl, safeAdministrationReturn } from "@/features/administration/administration-list";

function RoleForm() {
  const router = useRouter();
  const returnTo = safeAdministrationReturn(useSearchParams().get("returnTo"), "roles");
  const createRole = useCreateRole();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const role = await createRole.mutateAsync({ name, description });
      router.push(administrationDetailUrl(`/roles/${role.id}`, returnTo));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create role.");
    }
  }

  return (
    <PermissionGuard permission="platform-roles:create">
    <div className="space-y-4">
      <PageHeader title="Add Role" description="Create a custom application role." />
      <Card>
        <form className="space-y-4" onSubmit={submit}>
          <label className="grid gap-1 text-sm font-medium">Role name<Input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className="grid gap-1 text-sm font-medium">Description<Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap items-center gap-3"><Link className="underline" href={returnTo}>Cancel and return to roles</Link><Button type="submit" disabled={createRole.isPending}>Create Role</Button></div>
        </form>
      </Card>
    </div>
    </PermissionGuard>
  );
}

export function RoleFormPage() {
  return <Suspense fallback={<Card>Loading role form…</Card>}><RoleForm /></Suspense>;
}
