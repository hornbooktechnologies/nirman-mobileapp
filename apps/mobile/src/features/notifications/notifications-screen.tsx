import type { NotificationItem } from '@nirman-app/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon, AppText, Button, Card, CompactScreenHeader, EmptyState, IconButton, LoadingState, NirmanScreenBackground, StatusBadge } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { notificationHref } from './notification-routing';
import { useNotifications } from './notifications-provider';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from './services';

export function NotificationsScreen() {
  const { t } = useTranslation('notifications');
  const { t: tCommon } = useTranslation('common');
  const { locale } = useLocalization();
  const { session } = useSession();
  const { setUnreadCount, refreshUnreadCount, unreadCount } = useNotifications();
  const organizationId = session?.activeOrganization?.id;
  const token = session?.accessToken;
  const canRead = Boolean(session?.permissions.includes('notifications:read'));
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (!organizationId || !token || !canRead) { setLoading(false); return; }
    const request = ++sequence.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const result = await fetchNotifications(organizationId, token, nextPage, unreadOnly);
      if (request !== sequence.current) return;
      setItems((current) => append ? [...current, ...result.items.filter((item) => !current.some((row) => row.id === item.id))] : result.items);
      setPage(result.pagination.page); setTotalPages(result.pagination.totalPages);
    } catch (loadError) { if (request === sequence.current) setError(getLocalizedErrorMessage(loadError, t('errors.load'))); }
    finally { if (request === sequence.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); } }
  }, [canRead, organizationId, t, token, unreadOnly]);

  useEffect(() => { setItems([]); setPage(1); void load(1); return () => { sequence.current += 1; }; }, [load]);

  async function open(item: NotificationItem) {
    if (!organizationId || !token) return;
    if (!item.readAt) {
      try { await markNotificationRead(organizationId, item.id, token); setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)); setUnreadCount(Math.max(0, unreadCount - 1)); } catch { /* target remains usable if read receipt fails */ }
    }
    const href = notificationHref(item);
    if (href) router.push(href);
  }

  async function markAll() {
    if (!organizationId || !token || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(organizationId, token);
      setItems((current) => unreadOnly ? [] : current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } finally { setMarkingAll(false); }
  }

  const header = <View style={styles.header}>
    <CompactScreenHeader title={t('screen.title')} subtitle={t('screen.subtitle', { count: unreadCount })} leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} action={unreadCount ? <IconButton icon="check-all" accessibilityLabel={t('actions.markAllA11y', { count: unreadCount })} variant="glass" disabled={markingAll} onPress={() => void markAll()} /> : undefined} />
    <View accessibilityRole="tablist" style={styles.filters}>
      <Button style={styles.filterButton} label={t('filters.all')} variant={!unreadOnly ? 'brand' : 'secondary'} onPress={() => setUnreadOnly(false)} />
      <Button style={styles.filterButton} label={t('filters.unread', { count: unreadCount })} variant={unreadOnly ? 'brand' : 'secondary'} onPress={() => setUnreadOnly(true)} />
    </View>
  </View>;

  if (!canRead) return <NirmanScreenBackground><CompactScreenHeader title={t('screen.title')} leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} /><EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} /></NirmanScreenBackground>;

  return <NirmanScreenBackground footer={<CustomerTabBar activeKey="notifications" />} scroll={false}>
    <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={[styles.list, !items.length && !loading && styles.emptyList]} ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void Promise.all([load(1), refreshUnreadCount()]); }} />}
      ListEmptyComponent={loading ? <LoadingState label={t('loading')} /> : error ? <EmptyState title={t('errors.title')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void load(1)} /> : <EmptyState title={unreadOnly ? t('empty.unreadTitle') : t('empty.title')} description={unreadOnly ? t('empty.unreadDescription') : t('empty.description')} />}
      ListFooterComponent={loadingMore ? <LoadingState label={t('loadingMore')} /> : null}
      onEndReachedThreshold={0.35} onEndReached={() => { if (!loading && !loadingMore && page < totalPages) void load(page + 1, true); }}
      renderItem={({ item }) => <NotificationCard item={item} locale={locale} onPress={() => void open(item)} />}
    />
  </NirmanScreenBackground>;
}

function NotificationCard({ item, locale, onPress }: { item: NotificationItem; locale: string; onPress: () => void }) {
  const { t } = useTranslation('notifications');
  const title = t(`types.${item.type}.title`, { defaultValue: item.title });
  const message = t(`types.${item.type}.message`, { defaultValue: item.message });
  const actionable = Boolean(notificationHref(item));
  const time = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt));
  return <Pressable accessibilityRole={actionable ? 'button' : undefined} accessibilityLabel={t('card.a11y', { title, message, time, state: item.readAt ? t('card.read') : t('card.unread') })} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
    <Card style={[styles.card, !item.readAt && styles.unreadCard]}>
      <View style={styles.cardTop}><View style={[styles.icon, item.importance === 'HIGH' || item.importance === 'URGENT' ? styles.importantIcon : undefined]}><AppIcon name={item.type.includes('MATERIAL') ? 'package-variant-closed' : item.type.includes('EXPENSE') ? 'receipt-text-outline' : item.type.includes('GALLERY') ? 'image-multiple-outline' : 'bell-outline'} size={22} color={mobileTheme.color.text.primary} /></View><View style={styles.copy}><AppText style={styles.title} weight={700}>{title}</AppText><AppText style={styles.message}>{message}</AppText></View>{!item.readAt ? <StatusBadge label={t('card.new')} tone="warning" /> : null}</View>
      <View style={styles.footer}><AppText style={styles.time}>{time}</AppText>{actionable ? <View style={styles.open}><AppText style={styles.openText} weight={700}>{t('card.open')}</AppText><AppIcon name="chevron-right" size={18} color={mobileTheme.color.action.primary} /></View> : null}</View>
    </Card>
  </Pressable>;
}

const styles = StyleSheet.create({
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[4] }, emptyList: { flexGrow: 1 }, header: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[2] }, filters: { flexDirection: 'row', gap: mobileTheme.spacing[3] }, filterButton: { flex: 1 },
  card: { gap: mobileTheme.spacing[4], overflow: 'hidden' }, unreadCard: { borderLeftColor: mobileTheme.color.action.primary, borderLeftWidth: 5 }, pressed: { opacity: 0.82 }, cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: mobileTheme.spacing[3] }, icon: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.selected, borderRadius: mobileTheme.radius.lg, height: 44, justifyContent: 'center', width: 44 }, importantIcon: { backgroundColor: mobileTheme.color.status.warning.background }, copy: { flex: 1, gap: mobileTheme.spacing[1], minWidth: 0 }, title: { ...mobileText.body, color: mobileTheme.color.text.primary }, message: { ...mobileText.caption, color: mobileTheme.color.text.secondary }, footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, time: { ...mobileText.caption }, open: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[1], minHeight: 44 }, openText: { ...mobileText.label, color: mobileTheme.color.action.primary },
});
