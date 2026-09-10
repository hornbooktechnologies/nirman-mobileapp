import type { NotificationItem } from '@nirman-app/shared';
import type { Href } from 'expo-router';

export function notificationHref(notification: Pick<NotificationItem, 'referenceType' | 'referenceId' | 'deepLink'>): Href | null {
  const id = notification.referenceId;
  switch (notification.referenceType?.toLowerCase()) {
    case 'material_request': return id ? ({ pathname: '/(app)/material-detail', params: { materialRequestId: id } } as Href) : '/(app)/materials';
    case 'site_expense': return id ? ({ pathname: '/(app)/expense-detail', params: { expenseId: id } } as Href) : '/(app)/expenses';
    case 'gallery_entry': return '/(app)/gallery';
    case 'lead': return id ? ({ pathname: '/(app)/sales-lead', params: { leadId: id } } as Href) : '/(app)/sales';
    case 'site_visit': return '/(app)/sales';
    case 'unit': return id ? ({ pathname: '/(app)/sales-unit', params: { unitId: id } } as Href) : '/(app)/sales';
    case 'wage_payment': return '/(app)/wages';
    default:
      return notification.deepLink?.startsWith('/(app)/') ? notification.deepLink as Href : null;
  }
}
