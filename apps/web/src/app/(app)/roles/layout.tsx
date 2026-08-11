import { PermissionGuard } from '@/features/user-management/components/permission-guard';

export default function RolesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permission="platform-roles:read">
      {children}
    </PermissionGuard>
  );
}
