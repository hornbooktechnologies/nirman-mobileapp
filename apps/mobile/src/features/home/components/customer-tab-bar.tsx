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
  | '/(app)/work-calendar'
  | '/(app)/wages'
  | '/(app)/kharchi'
  | '/(app)/materials'
  | '/(app)/expenses'
  | '/(app)/progress'
  | '/(app)/gallery'
  | '/(app)/notifications'
  | '/(app)/sales'
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

type CustomerNavigationDefinition = Omit<CustomerNavigationItem, 'label' | 'title' | 'description'> & {
  labelKey: string;
  titleKey: string;
  descriptionKey: string;
};

const organizationNavigation: readonly CustomerNavigationDefinition[] = [
  { key: 'notifications', labelKey: 'items.notifications.title', titleKey: 'items.notifications.title', descriptionKey: 'items.notifications.description', icon: 'bell-outline', href: '/(app)/notifications', permission: 'notifications:read' },
  { key: 'members', labelKey: 'tabs.members', titleKey: 'items.members.title', descriptionKey: 'items.members.description', icon: 'account-multiple-outline', href: '/(app)/members', permission: 'members:read' },
  { key: 'work-calendar', labelKey: 'items.calendar.title', titleKey: 'items.calendar.title', descriptionKey: 'items.calendar.description', icon: 'calendar-month-outline', href: '/(app)/work-calendar', permission: 'work-calendar:read' },
];

const customerNavigation: readonly CustomerNavigationDefinition[] = [
  { key: 'home', labelKey: 'tabs.home', titleKey: 'items.home.title', descriptionKey: 'items.home.description', icon: 'home-outline', href: '/(app)/dashboard' },
  { key: 'team', labelKey: 'tabs.team', titleKey: 'items.team.title', descriptionKey: 'items.team.description', icon: 'account-group-outline', href: '/(app)/team', permission: 'project-members:read' },
  { key: 'project', labelKey: 'tabs.project', titleKey: 'items.project.title', descriptionKey: 'items.project.description', icon: 'folder-cog-outline', href: '/(app)/project-detail', permission: 'projects:read' },
  { key: 'workers', labelKey: 'items.workers.title', titleKey: 'items.workers.title', descriptionKey: 'items.workers.description', icon: 'account-hard-hat-outline', href: '/(app)/workers', permission: 'workers:read' },
  { key: 'attendance', labelKey: 'items.attendance.title', titleKey: 'items.attendance.title', descriptionKey: 'items.attendance.description', icon: 'calendar-check', href: '/(app)/attendance', permission: 'attendance:read' },
  { key: 'wages', labelKey: 'items.wages.title', titleKey: 'items.wages.title', descriptionKey: 'items.wages.description', icon: 'cash-multiple', href: '/(app)/wages', permission: 'wages:read' },
  { key: 'kharchi', labelKey: 'items.kharchi.title', titleKey: 'items.kharchi.title', descriptionKey: 'items.kharchi.description', icon: 'cash-minus', href: '/(app)/kharchi', permission: 'kharchi:read' },
  { key: 'materials', labelKey: 'items.materials.title', titleKey: 'items.materials.title', descriptionKey: 'items.materials.description', icon: 'package-variant-closed', href: '/(app)/materials', permission: 'materials:read' },
  { key: 'expenses', labelKey: 'items.expenses.title', titleKey: 'items.expenses.title', descriptionKey: 'items.expenses.description', icon: 'receipt-text-outline', href: '/(app)/expenses', permission: 'expenses:read' },
  { key: 'progress', labelKey: 'items.progress.title', titleKey: 'items.progress.title', descriptionKey: 'items.progress.description', icon: 'chart-timeline-variant-shimmer', href: '/(app)/progress', permission: 'progress:read' },
  { key: 'gallery', labelKey: 'items.gallery.title', titleKey: 'items.gallery.title', descriptionKey: 'items.gallery.description', icon: 'image-multiple-outline', href: '/(app)/gallery', permission: 'gallery:read' },
  { key: 'sales', labelKey: 'items.sales.title', titleKey: 'items.sales.title', descriptionKey: 'items.sales.description', icon: 'account-tie-outline', href: '/(app)/sales', permissionsAny: ['leads:read-own', 'leads:read-team', 'leads:read-all', 'inventory:read'] },
  { key: 'menu', labelKey: 'tabs.menu', titleKey: 'items.menu.title', descriptionKey: 'items.menu.description', icon: 'menu', href: '/(app)/menu' },
];

function localizeNavigationItem(item: CustomerNavigationDefinition, t: TFunction<'navigation'>): CustomerNavigationItem {
  return {
    ...item,
    label: t(item.labelKey as never),
    title: t(item.titleKey as never),
    description: t(item.descriptionKey as never),
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
  const projectPermissions = getActiveProjectPermissions(session);
  return organizationNavigation
    .filter((item) => !item.permission || session?.permissions.includes(item.permission) || projectPermissions.includes(item.permission))
    .map((item) => localizeNavigationItem(item, t));
}

export function CustomerTabBar({ activeKey }: { activeKey: string }) {
  const { t } = useTranslation('navigation');
  const { session } = useSession();
  const tabs = visibleNavigation(session, t)
    .filter((item) => item.key === 'home' || item.key === 'team' || item.key === 'project')
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
