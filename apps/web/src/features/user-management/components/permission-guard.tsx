"use client";

import { Card } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function PermissionGuard({
  permission,
  anyOf,
  children,
}: {
  permission?: string;
  anyOf?: readonly string[];
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();
  const allowed =
    (permission ? hasPermission(permission) : false) ||
    (anyOf?.some(hasPermission) ?? false);
  if (!allowed) {
    return <Card className="text-[13px] text-body">You do not have access to this page.</Card>;
  }
  return <>{children}</>;
}
