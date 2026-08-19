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
  labelKey: 'tabs.home' | 'tabs.team' | 'tabs.project' | 'tabs.members' | 'tabs.menu';
  titleKey: 'items.home.title' | 'items.team.title' | 'items.project.title' | 'items.members.title' | 'items.menu.title';
  descriptionKey: 'items.home.description' | 'items.team.description' | 'items.project.description' | 'items.members.description' | 'items.menu.description';
};

const customerNavigation: readonly CustomerNavigationDefinition[] = [
  { key: 'home', labelKey: 'tabs.home', titleKey: 'items.home.title', descriptionKey: 'items.home.description', icon: 'home-outline', href: '/(app)/dashboard' },
  { key: 'team', labelKey: 'tabs.team', titleKey: 'items.team.title', descriptionKey: 'items.team.description', icon: 'account-group-outline', href: '/(app)/team', permissionsAny: ['project-members:read', 'workers:read'] },
  { key: 'project', labelKey: 'tabs.project', titleKey: 'items.project.title', descriptionKey: 'items.project.description', icon: 'folder-cog-outline', href: '/(app)/project-detail', permission: 'projects:read' },
  { key: 'menu', labelKey: 'tabs.menu', titleKey: 'items.menu.title', descriptionKey: 'items.menu.description', icon: 'menu', href: '/(app)/menu' },
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
