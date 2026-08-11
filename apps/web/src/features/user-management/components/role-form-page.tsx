"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, PageHeader, Textarea } from "@/components/ui";
import { useCreateRole } from "@/features/user-management/hooks/use-user-management";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";

export function RoleFormPage() {
  const router = useRouter();
  const createRole = useCreateRole();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const role = await createRole.mutateAsync({ name, description });
    router.push(`/roles/${role.id}`);
  }

  return (
    <PermissionGuard permission="platform-roles:create">
    <div className="space-y-4">
      <PageHeader title="Add Role" description="Create a custom application role." />
      <Card>
        <form className="space-y-4" onSubmit={submit}>
          <Input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" disabled={createRole.isPending}>Create Role</Button>
        </form>
      </Card>
    </div>
    </PermissionGuard>
  );
}
