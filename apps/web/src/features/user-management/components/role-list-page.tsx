"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  Dialog,
  IconButton,
  NotificationBanner,
  PageHeader,
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

export function RoleListPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const roles = useRoles();
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const deleteRole = useDeleteRole(deleteTarget?.id ?? "");
  const canCreate = hasPermission("platform-roles:create");
  const canUpdate = hasPermission("platform-roles:update");
  const canDelete = hasPermission("platform-roles:delete");

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
            <Link href="/roles/new">
              <Button>Add Role</Button>
            </Link>
          ) : undefined
        }
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
          "Loading roles"
        ) : roles.isError ? (
          "Unable to load roles"
        ) : (
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
              {roles.data?.map((role) => {
                const assignedUsers = role.userCount ?? 0;
                return (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Link href={`/roles/${role.id}`}>{role.name}</Link>
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
                            onClick={() => router.push(`/roles/${role.id}`)}
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
