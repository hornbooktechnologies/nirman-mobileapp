"use client";

import { LoadingState } from "@/components/ui";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_RESOURCES,
  type PermissionKey,
} from "@nirman-app/shared";
import { useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Checkbox,
  Input,
  NotificationBanner,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useReplaceRolePermissions,
  useRole,
  useUpdateRole,
} from "@/features/user-management/hooks/use-user-management";
import type { Role } from "@/features/user-management/types/user-management.types";
import { safeAdministrationReturn } from "@/features/administration/administration-list";

const PERMISSIONS_BY_RESOURCE = PERMISSION_RESOURCES.map((resource) => ({
  resource,
  permissions: ALL_PERMISSIONS.filter((permission) =>
    permission.startsWith(`${resource}:`),
  ),
})).filter((group) => group.permissions.length > 0);

function RoleDetail({ roleId }: { roleId: string }) {
  const role = useRole(roleId);
  const router = useRouter();
  const returnTo = safeAdministrationReturn(useSearchParams().get("returnTo"), "roles");

  if (role.isLoading) return <LoadingState label="Loading role" />;
  if (role.isError || !role.data) return <Card>Unable to load role</Card>;

  return <RolePermissionEditor key={role.data.updatedAt} role={role.data} onBack={() => router.push(returnTo)} />;
}

export function RoleDetailPage({ roleId }: { roleId: string }) {
  return <Suspense fallback={<LoadingState label="Loading role" />}><RoleDetail roleId={roleId} /></Suspense>;
}

function RolePermissionEditor({ role, onBack }: { role: Role; onBack: () => void }) {
  const { hasPermission } = useAuth();
  const replacePermissions = useReplaceRolePermissions(role.id);
  const updateRole = useUpdateRole(role.id);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState(
    () =>
      new Set(
        role.permissions?.map(
          (permission) =>
            `${permission.resource}:${permission.action}` as PermissionKey,
        ) ?? [],
      ),
  );
  const canUpdate =
    !role.isSystem && hasPermission("platform-roles:update");
  const canManage =
    !role.isSystem && hasPermission("platform-roles:manage");

  function togglePermission(permission: PermissionKey) {
    if (!canManage) return;
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  async function savePermissions() {
    await replacePermissions.mutateAsync(
      [...selectedPermissions].map((permission) => {
        const [resource, action] = permission.split(":");
        return { resource, action };
      }),
    );
  }

  async function saveRoleDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdate) return;
    await updateRole.mutateAsync({
      name: name.trim(),
      description: description.trim(),
    });
  }

  const mutationError = updateRole.error ?? replacePermissions.error;

  return (
    <div className="space-y-4">
      <PageHeader
        title={role.name}
        onBack={onBack}
        description={
          role.isSystem
            ? "System role template and permission reference."
            : "Manage the permissions assigned to this custom role."
        }
      />

      {role.isSystem ? (
        <NotificationBanner
          title="Protected system role"
          description="System role templates are synchronized by the approved seed and are read-only in this screen. Create a custom role to configure a separate permission set."
        />
      ) : null}

      {!role.isSystem ? (
        <Card>
          <form className="space-y-4" onSubmit={saveRoleDetails}>
            <div>
              <h2 className="text-[15px] font-semibold text-body">
                Role details
              </h2>
              <p className="mt-1 text-[12.5px] text-sub">
                Update the custom role name and description.
              </p>
            </div>
            <label className="grid gap-1 text-sm font-medium">Role name<Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Role name"
              maxLength={50}
              required
              disabled={!canUpdate}
            /></label>
            <label className="grid gap-1 text-sm font-medium">Description<Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              maxLength={200}
              disabled={!canUpdate}
            /></label>
            {canUpdate ? (
              <Button type="submit" disabled={updateRole.isPending}>
                {updateRole.isPending ? "Saving" : "Save Role Details"}
              </Button>
            ) : null}
          </form>
        </Card>
      ) : null}

      {updateRole.isSuccess ? (
        <NotificationBanner
          title="Role updated"
          description="The custom role details have been saved."
          variant="success"
        />
      ) : null}

      {replacePermissions.isSuccess ? (
        <NotificationBanner
          title="Permissions saved"
          description="The custom role permission set has been updated."
          variant="success"
        />
      ) : null}

      {mutationError ? (
        <NotificationBanner
          title="Unable to update role"
          description={
            mutationError instanceof Error
              ? mutationError.message
              : "Review your access and try again."
          }
          variant="danger"
        />
      ) : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Permission set</h2><p className="text-sm text-sub">These grants affect users assigned to this role. Review changes before saving.</p></div>
          {canManage && <Button onClick={() => void savePermissions()} disabled={replacePermissions.isPending}>{replacePermissions.isPending ? "Saving" : "Save Permissions"}</Button>}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Permissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSIONS_BY_RESOURCE.map(({ resource, permissions }) => (
              <TableRow key={resource}>
                <TableCell className="align-top font-semibold">
                  {PERMISSION_LABELS[resource]}
                </TableCell>
                <TableCell>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {permissions.map((permission) => (
                      <Checkbox
                        key={permission}
                        label={permission.split(":")[1]}
                        checked={selectedPermissions.has(permission)}
                        disabled={!canManage}
                        onChange={() => togglePermission(permission)}
                      />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

    </div>
  );
}
