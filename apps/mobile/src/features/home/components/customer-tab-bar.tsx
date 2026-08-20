import type { PermissionKey } from '@nirman-app/shared';
import { router, type Href } from 'expo-router';

import { FloatingTabBar, type AppIconName } from '../../../components/ui';
import { getActiveProjectPermissions, type MobileSession } from '../../../lib/auth';
import { useSession } from '../../../providers';

export type CustomerRoute =
  | '/(app)/dashboard'
  | '/(app)/project-detail'
  | '/(app)/workers'
  | '/(app)/attendance'
  | '/(app)/team'
  | '/(app)/members'
  | '/(app)/menu';

export type CustomerNavigationItem = {
  key: string;
  label: string;
  title: string;
  description: string;
  icon: AppIconName;
  href: CustomerRoute;
  permission?: PermissionKey;
};

const customerNavigation: readonly CustomerNavigationItem[] = [
  { key: 'home', label: 'Home', title: 'Home', description: 'Your field command center', icon: 'home-outline', href: '/(app)/dashboard' },
  { key: 'team', label: 'Team', title: 'Project Team', description: 'Roles and site assignments', icon: 'account-group-outline', href: '/(app)/team', permission: 'project-members:read' },
  { key: 'project', label: 'Project', title: 'Selected Project', description: 'Site details and controls', icon: 'folder-cog-outline', href: '/(app)/project-detail', permission: 'projects:read' },
  { key: 'workers', label: 'Workers', title: 'Workers', description: 'Crew and allocations', icon: 'account-hard-hat-outline', href: '/(app)/workers', permission: 'workers:read' },
  { key: 'attendance', label: 'Attendance', title: 'Attendance', description: 'Daily worker presence', icon: 'calendar-check', href: '/(app)/attendance', permission: 'attendance:read' },
  { key: 'menu', label: 'Menu', title: 'Menu', description: 'Account and organization', icon: 'menu', href: '/(app)/menu' },
];

const organizationNavigation: readonly CustomerNavigationItem[] = [
  { key: 'members', label: 'Members', title: 'Organization Members', description: 'Access, roles and invitations', icon: 'account-multiple-outline', href: '/(app)/members', permission: 'members:read' },
];

export function visibleNavigation(session: MobileSession | null) {
  const projectPermissions = getActiveProjectPermissions(session);
  return customerNavigation.filter((item) => !item.permission || projectPermissions.includes(item.permission));
}

export function visibleOrganizationNavigation(session: MobileSession | null) {
  return organizationNavigation.filter((item) => !item.permission || session?.permissions.includes(item.permission));
}

export function CustomerTabBar({ activeKey }: { activeKey: string }) {
  const { session } = useSession();
  const tabs = visibleNavigation(session)
    .filter((item) => item.key !== 'menu')
    .map(({ key, label, icon }) => ({ key, label, icon }));

  return (
    <FloatingTabBar
      activeKey={activeKey}
      tabs={tabs}
      onChange={(key) => {
        const item = visibleNavigation(session).find((candidate) => candidate.key === key);
        if (item) router.push(item.href as Href);
      }}
    />
  );
}
