"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isPlatformSystemRoleName } from "@nirman-app/shared";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { ApiError } from "@/lib/api/api-client";
import {
  useCreateUser,
  useRoles,
} from "@/features/user-management/hooks/use-user-management";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";

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
  const [formError, setFormError] = useState<string | null>(null);
  const platformRoles = roles.data?.filter(
    (role) => !role.isSystem || isPlatformSystemRoleName(role.name),
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await createUser.mutateAsync({ ...form, isActive: true });
      router.push("/users");
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to create platform user",
      );
    }
  }

  return (
    <PermissionGuard permission="platform-users:create">
      <div className="space-y-4">
        <PageHeader
          title="Add Platform User"
          description="Create a NirmanSite administration account. Customer members must be invited from their Organization."
        />
        <Card>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
            >
              <option value="">Select role</option>
              {platformRoles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            {formError ? (
              <p className="text-[13px] text-red-600 md:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating" : "Create Platform User"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PermissionGuard>
  );
}
