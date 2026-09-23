"use client";

import { Pencil, Trash2 } from "lucide-react";
import { LoadingState } from "@/components/ui";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  Button,
  Card,
  Dialog,
  IconButton,
  NotificationBanner,
  PageHeader,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useDeleteRole,
  useRoles,
} from "@/features/user-management/hooks/use-user-management";
import type { Role } from "@/features/user-management/types/user-management.types";
import { AdministrationFilters } from "@/features/administration/administration-filters";
import { administrationDetailUrl, administrationListUrl } from "@/features/administration/administration-list";

function RoleList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = (params.get("search") ?? "").slice(0, 160);
  const kind = ["system", "custom"].includes(params.get("kind") ?? "") ? params.get("kind")! : "";
  const { hasPermission } = useAuth();
  const roles = useRoles();
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const deleteRole = useDeleteRole(deleteTarget?.id ?? "");
  const canCreate = hasPermission("platform-roles:create");
  const canUpdate = hasPermission("platform-roles:update");
  const canDelete = hasPermission("platform-roles:delete");
  const visible = (roles.data ?? []).filter((role) =>
    (!kind || (kind === "system" ? role.isSystem : !role.isSystem)) &&
    `${role.name} ${role.description ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteRole.mutateAsync();
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles & Permissions"
        description="View system role templates and manage custom permission sets."
        actions={
          canCreate ? (
            <Link href={administrationDetailUrl("/roles/new", administrationListUrl(pathname, params, {}))}>
              <Button>Add Role</Button>
            </Link>
          ) : undefined
        }
      />
      <AdministrationFilters
        name="roles"
        scope="System roles are protected templates. Custom role changes affect assigned users. Search and type filter the retrieved list."
        search={{ value: search, placeholder: "Role name or description", onChange: (value) => router.replace(administrationListUrl(pathname, params, { search: value }), { scroll: false }) }}
        value={{ kind }}
        fields={[{ key: "kind", label: "Role type", options: [{ value: "system", label: "System template" }, { value: "custom", label: "Custom role" }] }]}
        onApply={(value) => router.replace(administrationListUrl(pathname, params, value), { scroll: false })}
      />

      {deleteRole.isError ? (
        <NotificationBanner
          title="Unable to delete role"
          description={
            deleteRole.error instanceof Error
              ? deleteRole.error.message
              : "The role could not be deleted."
          }
          variant="danger"
        />
      ) : null}

      <Card>
        {roles.isLoading ? (
          <LoadingState label="Loading roles" />
        ) : roles.isError ? (
          <p role="alert">Unable to load roles. <Button variant="outline" onClick={() => void roles.refetch()}>Retry</Button></p>
        ) : (
          <>
          <p className="mb-3 text-sm text-sub">{visible.length} matching roles</p>
          {!visible.length ? <p className="text-sm text-sub">No roles match this view.</p> :
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((role) => {
                const assignedUsers = role.userCount ?? 0;
                return (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Link className="break-words underline" href={administrationDetailUrl(`/roles/${role.id}`, administrationListUrl(pathname, params, {}))}>{role.name}</Link>
                      <div className="mt-1"><StatusBadge tone={role.isSystem ? "info" : "active"}>{role.isSystem ? "System template" : "Custom role"}</StatusBadge></div>
                    </TableCell>
                    <TableCell>{assignedUsers}</TableCell>
                    <TableCell>{role.permissionCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {!role.isSystem && canUpdate ? (
                          <IconButton
                            size="sm"
                            variant="ghost"
                            aria-label={`Edit ${role.name}`}
                            title={`Edit ${role.name}`}
                            onClick={() => router.push(administrationDetailUrl(`/roles/${role.id}`, administrationListUrl(pathname, params, {})))}
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </IconButton>
                        ) : null}
                        {!role.isSystem && canDelete ? (
                          <IconButton
                            size="sm"
                            variant="ghost"
                            className="text-danger"
                            aria-label={`Delete ${role.name}`}
                            title={
                              assignedUsers > 0
                                ? "Roles assigned to users cannot be deleted"
                                : `Delete ${role.name}`
                            }
                            disabled={assignedUsers > 0}
                            onClick={() => setDeleteTarget(role)}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </IconButton>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          }
          </>
        )}
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete custom role?"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              disabled={deleteRole.isPending}
            >
              {deleteRole.isPending ? "Deleting" : "Delete Role"}
            </Button>
          </>
        }
      >
        <p>
          You are deleting <strong>{deleteTarget?.name}</strong> and its
          permission set.
        </p>
      </Dialog>
    </div>
  );
}

export function RoleListPage() {
  return <Suspense fallback={<LoadingState label="Loading roles" />}><RoleList /></Suspense>;
}
