import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { useLocalization } from '../../providers/localization-provider';
import { useSession } from '../../providers/session-provider';
import { deactivatePushDevice, fetchNotificationSummary, markNotificationRead, registerPushDevice } from './services';
import { notificationHref } from './notification-routing';

type NotificationsContextValue = { unreadCount: number; refreshUnreadCount: () => Promise<void>; setUnreadCount: (count: number) => void };
const NotificationsContext = createContext<NotificationsContextValue | null>(null);

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }) });

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { language } = useLocalization();
  const { session, switchActiveProject } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const handledResponseId = useRef<string | null>(null);
  const organizationId = session?.activeOrganization?.id;
  const canRead = Boolean(session?.permissions.includes('notifications:read'));

  const refreshUnreadCount = useCallback(async () => {
    if (!session || !organizationId || !canRead) { setUnreadCount(0); return; }
    try { setUnreadCount((await fetchNotificationSummary(organizationId, session.accessToken)).unreadCount); } catch { /* keep last known count while offline */ }
  }, [canRead, organizationId, session]);

  useEffect(() => { void refreshUnreadCount(); const timer = setInterval(() => void refreshUnreadCount(), 60_000); return () => clearInterval(timer); }, [refreshUnreadCount]);

  useEffect(() => {
    if (!session || !organizationId || !canRead || Platform.OS === 'web') return;
    let active = true;
    let registered: { id: string } | null = null;
    void (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        const resolved = permission.status === 'granted' ? permission : await Notifications.requestPermissionsAsync();
        if (resolved.status !== 'granted') return;
        if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('important-updates', { name: 'Important updates', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250] });
        const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
        if (!projectId) return;
        const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        const result = await registerPushDevice(organizationId, session.accessToken, { expoPushToken, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID', locale: language });
        if (active) registered = result;
      } catch { /* inbox remains available when device push registration is unavailable */ }
    })();
    return () => { active = false; if (registered) void deactivatePushDevice(organizationId, registered.id, session.accessToken).catch(() => undefined); };
  }, [canRead, language, organizationId, session]);

  useEffect(() => {
    if (!session || !canRead) return;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      if (handledResponseId.current === response.notification.request.identifier) return;
      handledResponseId.current = response.notification.request.identifier;
      const data = response.notification.request.content.data as Record<string, unknown>;
      const projectId = typeof data.projectId === 'string' ? data.projectId : null;
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : null;
      const responseOrganizationId = typeof data.organizationId === 'string' ? data.organizationId : null;
      const href = notificationHref({ referenceType: typeof data.referenceType === 'string' ? data.referenceType : null, referenceId: typeof data.referenceId === 'string' ? data.referenceId : null, deepLink: typeof data.deepLink === 'string' ? data.deepLink : null });
      void (async () => {
        if (notificationId && responseOrganizationId === organizationId) await markNotificationRead(organizationId, notificationId, session.accessToken).catch(() => undefined);
        if (projectId && session.projectAccess.projects.some((project) => project.id === projectId)) await switchActiveProject(projectId);
        if (href) router.push(href);
        await refreshUnreadCount();
      })();
    };
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) handleResponse(response); });
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [canRead, organizationId, refreshUnreadCount, session, switchActiveProject]);

  const value = useMemo(() => ({ unreadCount, refreshUnreadCount, setUnreadCount }), [refreshUnreadCount, unreadCount]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used within NotificationsProvider');
  return value;
}
