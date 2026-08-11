import { PermissionGuard } from '@/features/user-management/components/permission-guard';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permission="platform-settings:read">
      {children}
    </PermissionGuard>
  );
}
