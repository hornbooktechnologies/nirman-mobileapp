"use client";

import Link from "next/link";
import {
  Button,
  Card,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useUsers } from "@/features/user-management/hooks/use-user-management";

export function UserListPage() {
  const { hasPermission } = useAuth();
  const users = useUsers();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Platform Users"
        description="View application identities and create platform administration accounts. Customer teams are invited from their Organization."
        actions={
          hasPermission("platform-users:create") ? (
            <Link href="/users/new">
              <Button>Add Platform User</Button>
            </Link>
          ) : undefined
        }
      />
      <Card>
        {users.isLoading ? (
          <p className="text-[13px] text-body">Loading users</p>
        ) : users.isError ? (
          <p className="text-[13px] text-red-600">Unable to load users</p>
        ) : (
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
                    <Link href={`/users/${user.id}`}>{user.name}</Link>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role.name}</TableCell>
                  <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
