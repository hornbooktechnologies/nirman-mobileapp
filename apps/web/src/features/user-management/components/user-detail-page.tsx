"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { useUser } from "@/features/user-management/hooks/use-user-management";
import { safeAdministrationReturn } from "@/features/administration/administration-list";

function UserDetail({ userId }: { userId: string }) {
  const user = useUser(userId);
  const router = useRouter();
  const returnTo = safeAdministrationReturn(useSearchParams().get("returnTo"), "users");
  return (
    <div className="space-y-4">
      <PageHeader title={user.data?.name ?? "User"} description="Account identity and role. Customer organization memberships are managed from Members." onBack={() => router.push(returnTo)} />
      <Card className="space-y-4">
        {user.isLoading ? <LoadingState label="Loading user" /> : user.isError ? <p role="alert">Unable to load user. <Button variant="outline" onClick={() => void user.refetch()}>Retry</Button></p> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Account</h2><StatusBadge tone={user.data?.isActive ? "active" : "inactive"}>{user.data?.isActive ? "Active" : "Inactive"}</StatusBadge></div>
            <dl className="grid gap-4 sm:grid-cols-2">
              {[["Email", user.data?.email], ["Role", user.data?.role.name], ["Phone", user.data?.phone]].map(([name, value]) => <div key={name}><dt className="text-sm text-sub">{name}</dt><dd className="break-words font-medium">{value || "Not provided"}</dd></div>)}
            </dl>
          </>
        )}
      </Card>
    </div>
  );
}

export function UserDetailPage({ userId }: { userId: string }) {
  return <Suspense fallback={<LoadingState label="Loading user" />}><UserDetail userId={userId} /></Suspense>;
}
