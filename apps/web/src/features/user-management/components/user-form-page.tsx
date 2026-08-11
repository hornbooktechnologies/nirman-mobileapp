"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { useCreateUser, useRoles } from "@/features/user-management/hooks/use-user-management";

export function UserFormPage() {
  const router = useRouter();
  const roles = useRoles();
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    roleId: "",
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createUser.mutateAsync({ ...form, isActive: true });
    router.push("/users");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Add User" description="Create a generic application user." />
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required>
            <option value="">Select role</option>
            {roles.data?.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </Select>
          <div className="md:col-span-2">
            <Button type="submit" disabled={createUser.isPending}>Create User</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
