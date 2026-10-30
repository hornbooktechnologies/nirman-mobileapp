import type { NotificationItem } from '@nirman-app/shared';
import type { Href } from 'expo-router';

export function notificationHref(notification: Pick<NotificationItem, 'referenceType' | 'referenceId' | 'deepLink'> & { projectId?: string | null }): Href | null {
  const id = notification.referenceId;
  const project = notification.projectId ? { projectId: notification.projectId } : {};
  switch (notification.referenceType?.toLowerCase()) {
    case 'material_request': return id ? ({ pathname: '/(app)/material-detail', params: { materialRequestId: id, ...project } } as Href) : '/(app)/materials';
    case 'site_expense': return id ? ({ pathname: '/(app)/expense-detail', params: { expenseId: id, ...project } } as Href) : '/(app)/expenses';
    case 'gallery_entry': return notification.projectId ? { pathname: '/(app)/gallery', params: project } as Href : '/(app)/gallery';
    case 'lead': return id ? ({ pathname: '/(app)/sales-lead', params: { leadId: id, ...project } } as Href) : '/(app)/sales';
    case 'site_visit': return { pathname: '/(app)/sales', params: { ...project, view: 'visits' } } as Href;
    case 'unit': return id ? ({ pathname: '/(app)/sales-unit', params: { unitId: id, ...project } } as Href) : '/(app)/sales';
    case 'wage_payment': return notification.projectId ? { pathname: '/(app)/wages', params: project } as Href : '/(app)/wages';
    default:
      return notification.deepLink?.startsWith('/(app)/') ? notification.deepLink as Href : null;
  }
}

export function notificationProjectAccess(item: Pick<NotificationItem, 'organizationId' | 'projectId' | 'referenceType'>, organizationId: string, projects: readonly { id: string; permissions: readonly string[] }[]) {
  if (item.organizationId !== organizationId) return false;
  const required: Record<string, string[]> = {
    material_request: ['materials:read'], site_expense: ['expenses:read'], gallery_entry: ['gallery:read'],
    lead: ['leads:read-own', 'leads:read-team', 'leads:read-all'], unit: ['inventory:read'],
    site_visit: ['leads:read-own', 'leads:read-team', 'leads:read-all'], wage_payment: ['wages:read'],
  };
  const permissions = required[item.referenceType?.toLowerCase() ?? ''];
  if (!item.projectId) return !permissions;
  const project = projects.find(candidate => candidate.id === item.projectId);
  if (!project) return false;
  return !permissions || permissions.some(permission => project.permissions.includes(permission));
}
