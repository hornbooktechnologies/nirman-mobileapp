"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui";
import {
  Button,
  Card,
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
import { useUsers } from "@/features/user-management/hooks/use-user-management";
import { useRoles } from "@/features/user-management/hooks/use-user-management";
import { CollectionPagination } from "@/components/ui/collection-toolbar";
import { AdministrationFilters } from "@/features/administration/administration-filters";
import { administrationDetailUrl, administrationListUrl } from "@/features/administration/administration-list";

function UserList() {
  const { hasPermission } = useAuth();
  const canReadRoles = hasPermission("platform-roles:read");
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const rawPage = Number(params.get("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const search = (params.get("search") ?? "").slice(0, 160);
  const roleId = canReadRoles && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.get("roleId") ?? "") ? params.get("roleId")! : "";
  const users = useUsers({ page, pageSize: 25, search: search || undefined, roleId: roleId || undefined });
  const roles = useRoles(canReadRoles);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="View application identities and create platform administration accounts. Customer teams are invited from their Organization."
        actions={
          hasPermission("platform-users:create") ? (
            <Link href={administrationDetailUrl("/users/new", administrationListUrl(pathname, params, {}))}>
              <Button>Add Platform User</Button>
            </Link>
          ) : undefined
        }
      />
      <AdministrationFilters
        name="users"
        scope="Application identities are listed here. Manage customer organization memberships from Members. Search and role filter use the Users API."
        search={{ value: search, placeholder: "Name or email", onChange: (value) => router.replace(administrationListUrl(pathname, params, { search: value }, ["page"]), { scroll: false }) }}
        value={canReadRoles ? { roleId } : {}}
        fields={canReadRoles ? [{ key: "roleId", label: "Role", options: (roles.data ?? []).map((role) => ({ value: role.id, label: role.name })) }] : []}
        onApply={(value) => router.replace(administrationListUrl(pathname, params, value, ["page"]), { scroll: false })}
      />
      <Card>
        {users.isLoading ? (
          <LoadingState label="Loading users" />
        ) : users.isError ? (
          <p role="alert" className="text-sm text-danger">Unable to load users. <Button variant="outline" onClick={() => void users.refetch()}>Retry</Button></p>
        ) : (
          <>
          <p className="mb-3 text-sm text-sub">{users.data?.meta.total ?? 0} matching users</p>
          {!users.data?.data.length ? <p className="text-sm text-sub">No users match this view.</p> :
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data?.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link className="break-words underline" href={administrationDetailUrl(`/users/${user.id}`, administrationListUrl(pathname, params, {}))}>{user.name}</Link>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role.name}</TableCell>
                  <TableCell><StatusBadge tone={user.isActive ? "active" : "inactive"}>{user.isActive ? "Active" : "Inactive"}</StatusBadge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          }
          <CollectionPagination page={users.data?.meta.page ?? page} pageCount={users.data?.meta.pageCount ?? 1} total={users.data?.meta.total ?? 0} busy={users.isFetching} onPageChange={(next) => router.replace(administrationListUrl(pathname, params, { page: String(next) }), { scroll: false })} />
          </>
        )}
      </Card>
    </div>
  );
}

export function UserListPage() {
  return <Suspense fallback={<LoadingState label="Loading users" />}><UserList /></Suspense>;
}
