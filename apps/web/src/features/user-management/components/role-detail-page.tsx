"use client";

import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_RESOURCES,
  type PermissionKey,
} from "@nirman-app/shared";
import { useState } from "react";
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

const PERMISSIONS_BY_RESOURCE = PERMISSION_RESOURCES.map((resource) => ({
  resource,
  permissions: ALL_PERMISSIONS.filter((permission) =>
    permission.startsWith(`${resource}:`),
  ),
})).filter((group) => group.permissions.length > 0);

export function RoleDetailPage({ roleId }: { roleId: string }) {
  const role = useRole(roleId);

  if (role.isLoading) return <Card>Loading role</Card>;
  if (role.isError || !role.data) return <Card>Unable to load role</Card>;

  return <RolePermissionEditor key={role.data.updatedAt} role={role.data} />;
}

function RolePermissionEditor({ role }: { role: Role }) {
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
        description={
          role.isSystem
            ? "System role template and permission reference."
            : "Manage the permissions assigned to this custom role."
        }
        actions={
          canManage ? (
            <Button
              onClick={() => void savePermissions()}
              disabled={replacePermissions.isPending}
            >
              {replacePermissions.isPending ? "Saving" : "Save Permissions"}
            </Button>
          ) : undefined
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
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Role name"
              maxLength={50}
              required
              disabled={!canUpdate}
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              maxLength={200}
              disabled={!canUpdate}
            />
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

      <Card>
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
