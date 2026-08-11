import { PermissionGuard } from '@/features/user-management/components/permission-guard';

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permission="platform-users:read">
      {children}
    </PermissionGuard>
  );
}
