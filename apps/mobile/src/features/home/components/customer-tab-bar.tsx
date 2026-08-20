import type { PermissionKey } from '@nirman-app/shared';
import { router, type Href } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { FloatingTabBar, type AppIconName } from '../../../components/ui';
import { getActiveProjectPermissions, type MobileSession } from '../../../lib/auth';
import { useSession } from '../../../providers';

export type CustomerRoute =
  | '/(app)/dashboard'
  | '/(app)/project-detail'
  | '/(app)/workers'
  | '/(app)/attendance'
  | '/(app)/wages'
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
  permissionsAny?: readonly PermissionKey[];
};

const customerNavigation: readonly CustomerNavigationItem[] = [
  { key: 'home', label: 'Home', title: 'Home', description: 'Your field command center', icon: 'home-outline', href: '/(app)/dashboard' },
  { key: 'team', label: 'Team', title: 'Project Team', description: 'Roles and site assignments', icon: 'account-group-outline', href: '/(app)/team', permission: 'project-members:read' },
  { key: 'project', label: 'Project', title: 'Selected Project', description: 'Site details and controls', icon: 'folder-cog-outline', href: '/(app)/project-detail', permission: 'projects:read' },
  { key: 'workers', label: 'Workers', title: 'Workers', description: 'Crew and allocations', icon: 'account-hard-hat-outline', href: '/(app)/workers', permission: 'workers:read' },
  { key: 'attendance', label: 'Attendance', title: 'Attendance', description: 'Daily worker presence', icon: 'calendar-check', href: '/(app)/attendance', permission: 'attendance:read' },
  { key: 'wages', label: 'Wages', title: 'Wages', description: 'Pay workers', icon: 'cash-multiple', href: '/(app)/wages', permission: 'wages:read' },
  { key: 'menu', label: 'Menu', title: 'Menu', description: 'Account and organization', icon: 'menu', href: '/(app)/menu' },
];

const organizationNavigation: readonly CustomerNavigationDefinition[] = [
  { key: 'members', labelKey: 'tabs.members', titleKey: 'items.members.title', descriptionKey: 'items.members.description', icon: 'account-multiple-outline', href: '/(app)/members', permission: 'members:read' },
];

function localizeNavigationItem(item: CustomerNavigationDefinition, t: TFunction<'navigation'>): CustomerNavigationItem {
  return {
    ...item,
    label: t(item.labelKey),
    title: t(item.titleKey),
    description: t(item.descriptionKey),
  };
}

export function visibleNavigation(session: MobileSession | null, t: TFunction<'navigation'>) {
  const projectPermissions = getActiveProjectPermissions(session);
  return customerNavigation.filter((item) =>
    (!item.permission || projectPermissions.includes(item.permission)) &&
    (!item.permissionsAny || item.permissionsAny.some((permission) => projectPermissions.includes(permission)))
  ).map((item) => localizeNavigationItem(item, t));
}

export function visibleOrganizationNavigation(session: MobileSession | null, t: TFunction<'navigation'>) {
  return organizationNavigation
    .filter((item) => !item.permission || session?.permissions.includes(item.permission))
    .map((item) => localizeNavigationItem(item, t));
}

export function CustomerTabBar({ activeKey }: { activeKey: string }) {
  const { t } = useTranslation('navigation');
  const { session } = useSession();
  const tabs = visibleNavigation(session, t)
    .filter((item) => item.key !== 'menu')
    .map(({ key, label, icon }) => ({ key, label, icon }));

  return (
    <FloatingTabBar
      activeKey={activeKey}
      tabs={tabs}
      onChange={(key) => {
        const item = visibleNavigation(session, t).find((candidate) => candidate.key === key);
        if (item) router.push(item.href as Href);
      }}
    />
  );
}
