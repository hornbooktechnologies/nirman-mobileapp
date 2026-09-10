import type { DashboardActionKey, RoleDashboardResponse } from '@nirman-app/shared';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  AppIcon,
  Badge,
  Button,
  CompactScreenHeader,
  EmptyState,
  GlassCard,
  NirmanScreenBackground,
  IconButton,
  IconContainer,
  ListItem,
  LanguagePicker,
  OperationalEntityCard,
  QuickActionGrid,
  getStatusTone,
} from '../../components/ui';
import { getActiveProject, type MobileSession } from '../../lib/auth';
import { formatDate, formatInr, formatNumber, getLocalizedErrorMessage } from '../../i18n';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import {
  CustomerTabBar,
  DashboardInsightPanel,
  ProjectProgressCard,
  ProjectSummaryStrip,
  RecentSiteActivityCard,
  TodayAtSiteCard,
  visibleNavigation,
  visibleOrganizationNavigation,
} from './components';
import { fetchRoleDashboard } from './services';
import { useNotifications } from '../notifications';
import {
  createProject,
  fetchProject,
  ProjectContextCard,
  ProjectFormSheet,
  updateProject,
  type Project,
  type ProjectInput,
} from '../projects';

const projectScopeTranslationKeys = {
  ALL: 'projectScope.ALL',
  ASSIGNED: 'projectScope.ASSIGNED',
  NONE: 'projectScope.NONE',
} as const;

const projectDetailStatusTranslationKeys = {
  DRAFT: 'status.DRAFT',
  ACTIVE: 'status.ACTIVE',
  ON_HOLD: 'status.ON_HOLD',
  COMPLETED: 'status.COMPLETED',
  ARCHIVED: 'status.ARCHIVED',
} as const;

const projectDetailScopeTranslationKeys = {
  ALL: 'scope.ALL',
  ASSIGNED: 'scope.ASSIGNED',
  NONE: 'scope.NONE',
} as const;

const organizationTypeTranslationKeys = {
  BUILDER: 'organizationType.BUILDER',
  CONTRACTOR: 'organizationType.CONTRACTOR',
} as const;

function activeRoleName(session: MobileSession | null, noOrganizationLabel: string, memberLabel: string) {
  if (!session?.activeOrganization) return noOrganizationLabel;
  return (
    session.memberships.find(
      (membership) =>
        membership.organizationId === session.activeOrganization?.id,
    )?.role.name ?? memberLabel
  );
}

export function DashboardScreen() {
  const { t: tHome } = useTranslation('home');
  const { t: tNavigation } = useTranslation('navigation');
  const { t: tProgress } = useTranslation('progress');
  const { refreshSession, session } = useSession();
  const { unreadCount } = useNotifications();
  const { language } = useLocalization();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboard, setDashboard] = useState<RoleDashboardResponse | null>(null);
  const [dashboardFailed, setDashboardFailed] = useState(false);
  const requestSequence = useRef(0);
  const activeProject = getActiveProject(session);
  const availableProjects =
    session?.projectAccess.projects.filter((project) => project.status !== 'ARCHIVED') ?? [];
  const workspaceNavigation = [
    ...visibleNavigation(session, tNavigation).filter((item) => item.key !== 'home' && item.key !== 'menu'),
    ...visibleOrganizationNavigation(session, tNavigation),
  ];
  const firstName = session?.user.name.trim().split(/\s+/)[0] || tHome('greeting.fallbackName');
  const activeRoleLabel = activeRoleName(
    session,
    tHome('greeting.noActiveOrganization'),
    tHome('greeting.organizationMember'),
  );
  const activeOrganizationName = session?.activeOrganization?.name ?? 'NirmanSite';
  const projectScope = session?.projectAccess.projectScope ?? 'NONE';
  const projectScopeLabel = tHome(projectScopeTranslationKeys[projectScope]);

  const loadDashboard = useCallback(async () => {
    const organizationId = session?.activeOrganization?.id;
    const projectId = activeProject?.id;
    const accessToken = session?.accessToken;
    const sequence = ++requestSequence.current;

    if (!organizationId || !projectId || !accessToken || !session?.permissions.includes('dashboards:read')) {
      setDashboard(null);
      setDashboardFailed(false);
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);
    try {
      const nextDashboard = await fetchRoleDashboard(organizationId, projectId, accessToken);
      if (sequence !== requestSequence.current) return;
      setDashboard(nextDashboard);
      setDashboardFailed(false);
    } catch {
      if (sequence !== requestSequence.current) return;
      setDashboard(null);
      setDashboardFailed(true);
    } finally {
      if (sequence === requestSequence.current) setLoadingDashboard(false);
    }
  }, [activeProject?.id, session?.accessToken, session?.activeOrganization?.id, session?.permissions]);

  useEffect(() => {
    void loadDashboard();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadDashboard]);

  const number = (value: number) => formatNumber(value, language, { maximumFractionDigits: 1 });
  const money = (value: string) => formatInr(Number(value), language, { maximumFractionDigits: 0 });
  const materialApprovalCount = dashboard?.workflow?.pendingMaterialApprovals ?? 0;
  const attentionItems = [
    ...(materialApprovalCount > 0 ? [{
      accessibilityLabel: tHome('attention.materialApprovalsA11y', { count: materialApprovalCount }),
      icon: 'package-variant-closed' as const,
      label: tHome('attention.materialApprovals', { count: materialApprovalCount }),
      meta: tHome('attention.materialApprovalsMeta'),
      onPress: () => router.push('/(app)/materials'),
    }] : []),
    ...((dashboard?.workflow?.overdueMaterialRequests ?? 0) > 0 ? [{
      accessibilityLabel: tHome('attention.overdueMaterialsA11y', { count: dashboard!.workflow!.overdueMaterialRequests }),
      icon: 'calendar-alert' as const,
      label: tHome('attention.overdueMaterials', { count: dashboard!.workflow!.overdueMaterialRequests }),
      meta: tHome('attention.overdueMaterialsMeta'),
      onPress: () => router.push('/(app)/materials'),
      tone: 'danger' as const,
    }] : []),
    ...((dashboard?.workflow?.pendingExpenses ?? 0) > 0 ? [{
      accessibilityLabel: tHome('attention.pendingExpensesA11y', { count: dashboard!.workflow!.pendingExpenses, amount: money(dashboard!.workflow!.pendingExpenseAmount ?? '0') }),
      icon: 'receipt-text-outline' as const,
      label: tHome('attention.pendingExpenses', { count: dashboard!.workflow!.pendingExpenses }),
      meta: money(dashboard!.workflow!.pendingExpenseAmount ?? '0'),
      onPress: () => router.push('/(app)/expenses'),
    }] : []),
  ];
  const attentionUnavailable = dashboardFailed;
  const financialMetrics = [
    ...(dashboard?.finance?.recognizedExpensesThisMonth ? [{ accessibilityLabel: tHome('finance.expensesA11y', { amount: money(dashboard.finance.recognizedExpensesThisMonth) }), label: tHome('finance.expenses'), value: money(dashboard.finance.recognizedExpensesThisMonth) }] : []),
    ...(dashboard?.finance?.outstandingKharchi ? [{ accessibilityLabel: tHome('finance.kharchiA11y', { amount: money(dashboard.finance.outstandingKharchi) }), label: tHome('finance.outstandingKharchi'), value: money(dashboard.finance.outstandingKharchi) }] : []),
    ...(dashboard?.finance?.wageEstimate ? [{ accessibilityLabel: tHome('finance.wageEstimateA11y', { amount: money(dashboard.finance.wageEstimate) }), label: tHome('finance.wageEstimate'), value: money(dashboard.finance.wageEstimate) }] : []),
  ];
  const progressStages: Array<{ label: string; percentage: number }> = [];
  const canCreateProject = Boolean(session?.permissions.includes('projects:create'));
  const quickNavigation = workspaceNavigation.filter((item) => !['project', 'team', 'members'].includes(item.key)).slice(0, canCreateProject ? 2 : 3);
  const actionRoutes: Record<DashboardActionKey, { href: Href; icon: 'calendar-check-outline' | 'cash-plus' | 'package-variant-closed-plus' | 'receipt-text-plus-outline' | 'chart-timeline-variant' | 'camera-plus-outline' | 'account-plus-outline' | 'calendar-clock-outline' | 'office-building-outline' }> = {
    MARK_ATTENDANCE: { href: '/(app)/attendance', icon: 'calendar-check-outline' }, ADD_KHARCHI: { href: '/(app)/kharchi', icon: 'cash-plus' },
    REQUEST_MATERIAL: { href: '/(app)/materials', icon: 'package-variant-closed-plus' }, ADD_EXPENSE: { href: '/(app)/expenses', icon: 'receipt-text-plus-outline' },
    UPDATE_PROGRESS: { href: '/(app)/progress', icon: 'chart-timeline-variant' }, UPLOAD_PHOTO: { href: '/(app)/gallery', icon: 'camera-plus-outline' },
    ADD_LEAD: { href: '/(app)/sales', icon: 'account-plus-outline' }, VIEW_FOLLOWUPS: { href: '/(app)/sales', icon: 'calendar-clock-outline' }, VIEW_PROJECT: { href: '/(app)/project-detail', icon: 'office-building-outline' },
  };
  const roleQuickActions = (dashboard?.quickActions ?? []).map((key) => ({ key, label: tHome(`role.actions.${key}`), accessibilityHint: tHome(`role.actionHints.${key}`), icon: actionRoutes[key].icon, onPress: () => router.push(actionRoutes[key].href) }));
  const quickActions = [
    ...(canCreateProject ? [{ key: 'create-project', label: tHome('workspace.createProject'), accessibilityHint: tHome('quickActions.createProjectHint'), icon: 'plus' as const, onPress: () => setShowCreateProject(true) }] : []),
    ...(roleQuickActions.length ? roleQuickActions.slice(0, canCreateProject ? 3 : 4) : quickNavigation.map((item) => ({ key: item.key, label: item.title, accessibilityHint: item.description, icon: item.icon, onPress: () => router.push(item.href as Href) }))),
    ...(workspaceNavigation.length ? [{ key: 'more', label: tHome('quickActions.more'), accessibilityHint: tHome('quickActions.moreHint'), icon: 'dots-horizontal' as const, onPress: () => router.push('/(app)/menu') }] : []),
  ];

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="home" />} style={styles.homeContent} variant="dashboard">
      <View style={styles.homeHeader}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <AppText style={styles.eyebrow} weight={700}>{tHome('greeting.eyebrow')}</AppText>
          </View>
          <AppText adjustsFontSizeToFit minimumFontScale={0.86} numberOfLines={1} style={styles.homeTitle} weight={700}>
            {tHome('greeting.welcomeBack', { name: firstName })}
          </AppText>
          <View
            accessible
            accessibilityLabel={`${activeRoleLabel}, ${activeOrganizationName}`}
            style={styles.identityRow}
          >
            <Badge label={activeRoleLabel} style={styles.roleBadge} tone="warning" />
            <AppText style={styles.organizationName} weight={700}>{activeOrganizationName}</AppText>
          </View>
        </View>
        <View style={styles.homeHeaderActions}>
          {session?.permissions.includes('notifications:read') ? <IconButton badgeCount={unreadCount} icon="bell-outline" accessibilityLabel={tNavigation('a11y.openNotifications', { count: unreadCount })} variant="glass" onPress={() => router.push('/(app)/notifications')} /> : null}
          <IconButton icon="menu" accessibilityLabel={tNavigation('a11y.openMenu')} variant="dark" onPress={() => router.push('/(app)/menu')} />
        </View>
      </View>

      <ProjectContextCard
        featured
        onOpenProject={activeProject ? () => router.push('/(app)/project-detail') : undefined}
      />

      <ProjectSummaryStrip items={[
        { accessibilityLabel: tHome('metrics.workingSitesA11y', { count: availableProjects.length }), icon: 'office-building-marker-outline', label: tHome('metrics.workingSites'), tone: 'brand', value: availableProjects.length },
        { accessibilityLabel: tHome('metrics.projectScopeA11y', { scope: projectScopeLabel }), icon: 'shield-check-outline', label: tHome('metrics.projectScope'), tone: 'warm', value: projectScopeLabel },
      ]} />

      {!workspaceNavigation.length ? (
        <EmptyState
          title={tHome('workspace.emptyTitle')}
          description={tHome('workspace.emptyDescription')}
        />
      ) : null}

      {activeProject && dashboard?.progress ? (
        <ProjectProgressCard
          accessibilityLabel={tProgress('summary.a11y', { percentage: dashboard.progress.overallPercentage, updated: dashboard.progress.updatedStages, total: 9 })}
          emptyLabel={tProgress('summary.notStarted')}
          loadingLabel={loadingDashboard ? tHome('data.loading') : undefined}
          percentage={dashboard.progress.overallPercentage}
          stages={progressStages}
          statusLabel={tHome('progress.updatedStages', { count: dashboard.progress.updatedStages })}
          summaryLabel={tHome('progress.completion')}
          title={tProgress('screen.title')}
          onPress={() => router.push('/(app)/progress')}
        />
      ) : null}

      {activeProject && dashboard?.site ? (
        <TodayAtSiteCard
          artwork={false}
          dateLabel={formatDate(dashboard.generatedAt, language, { dateStyle: 'medium' })}
          title={tHome('today.title')}
          loadingLabel={loadingDashboard ? tHome('data.loading') : undefined}
          stats={[
            { accessibilityLabel: tHome('today.workersA11y', { count: dashboard.site.assignedWorkers ?? 0 }), icon: 'account-hard-hat-outline', label: tHome('today.workers'), value: number(dashboard.site.assignedWorkers ?? 0) },
            { accessibilityLabel: tHome('today.presentA11y', { count: dashboard.site.presentToday ?? 0 }), icon: 'account-check-outline', label: tHome('today.present'), value: number(dashboard.site.presentToday ?? 0) },
            { accessibilityLabel: tHome('today.absentA11y', { count: dashboard.site.absentToday ?? 0 }), icon: 'account-off-outline', label: tHome('today.absent'), value: number(dashboard.site.absentToday ?? 0) },
            ...(dashboard.site.todaySpend ? [{ accessibilityLabel: tHome('today.spendA11y', { amount: money(dashboard.site.todaySpend) }), icon: 'cash' as const, label: tHome('today.spend'), value: money(dashboard.site.todaySpend) }] : []),
          ]}
        />
      ) : null}

      {dashboard?.sales ? <TodayAtSiteCard artwork={false} title={tHome('role.salesPulse')} stats={[
        { accessibilityLabel: tHome('role.metrics.pipeline'), icon: 'chart-line-variant', label: tHome('role.metrics.pipeline'), value: number(dashboard.sales.activePipeline ?? 0) },
        { accessibilityLabel: tHome('role.metrics.overdueFollowUps'), icon: 'calendar-alert', label: tHome('role.metrics.overdueFollowUps'), value: number(dashboard.sales.overdueFollowUps ?? 0) },
        { accessibilityLabel: tHome('role.metrics.expiringBlocks'), icon: 'timer-alert-outline', label: tHome('role.metrics.expiringBlocks'), value: number(dashboard.sales.blocksNearingExpiry ?? 0) },
        { accessibilityLabel: tHome('role.metrics.bookedUnits'), icon: 'home-outline', label: tHome('role.metrics.bookedUnits'), value: number(dashboard.sales.bookedUnits ?? 0) },
      ]} /> : null}

      {activeProject && (dashboard?.finance || dashboard?.workflow || quickActions.length) ? (
        <DashboardInsightPanel
          actions={quickActions}
          actionsLabel={tHome('quickActions.tab')}
          attentionEmptyLabel={tHome('attention.clear')}
          attentionItems={attentionItems}
          attentionLabel={tHome('attention.tab')}
          financeLabel={tHome('finance.tab')}
          financeMetrics={financialMetrics}
          loadingLabel={loadingDashboard ? tHome('data.loading') : attentionUnavailable ? tHome('data.unavailable') : undefined}
          showAttention={Boolean(dashboard?.workflow)}
        />
      ) : null}

      {activeProject && dashboard?.gallery ? (
        <RecentSiteActivityCard
          count={dashboard.gallery.recentUpdates}
          emptyLabel={tHome('activity.empty')}
          latestLabel={dashboard.gallery.latestCapturedAt ? tHome('activity.latest', { date: formatDate(dashboard.gallery.latestCapturedAt, language, { dateStyle: 'medium', timeStyle: 'short' }) }) : undefined}
          onPress={() => router.push('/(app)/gallery')}
          title={tHome('activity.title')}
          updatesLabel={tHome('activity.updates', { count: dashboard.gallery.recentUpdates })}
          viewAllLabel={tHome('activity.viewAll')}
        />
      ) : null}

      {dashboardFailed ? (
        <Button fullWidth={false} label={tHome('data.retry')} leadingIcon="refresh" size="sm" variant="secondary" onPress={() => void loadDashboard()} />
      ) : null}

      {showCreateProject && session?.activeOrganization ? (
        <ProjectFormSheet
          saving={savingProject}
          onClose={() => setShowCreateProject(false)}
          onSave={async (input) => {
            setSavingProject(true);
            try {
              await createProject(session.activeOrganization!.id, session.accessToken, input);
              setShowCreateProject(false);
              await refreshSession();
            } finally {
              setSavingProject(false);
            }
          }}
        />
      ) : null}
    </NirmanScreenBackground>
  );
}

export function ProjectDetailScreen() {
  const { t } = useTranslation('projects');
  const { t: tCommon } = useTranslation('common');
  const { refreshSession, session } = useSession();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const activeProject = getActiveProject(session);
  const selectedProject =
    session?.projectAccess.projects.find((project) => project.id === params.projectId) ??
    activeProject;
  const selectedStatusLabel = selectedProject
    ? t(projectDetailStatusTranslationKeys[selectedProject.status])
    : '';
  const projectScope = session?.projectAccess.projectScope ?? 'NONE';
  const projectScopeLabel = t(projectDetailScopeTranslationKeys[projectScope]);
  const organizationType = session?.activeOrganization?.type;
  const organizationTypeLabel = organizationType
    ? t(organizationTypeTranslationKeys[organizationType])
    : t('detail.customerOrganization');
  const roleLabel = !session?.activeOrganization
    ? t('detail.notAvailable')
    : session.memberships.find(
      (membership) => membership.organizationId === session.activeOrganization?.id,
    )?.role.name ?? t('detail.projectAccess');

  async function openEditProject() {
    if (!session?.activeOrganization || !selectedProject) return;
    setLoadingEdit(true);
    try {
      const detail = await fetchProject(session.activeOrganization.id, selectedProject.id, session.accessToken);
      setEditingProject(detail);
    } catch (error) {
      Alert.alert(t('detail.unavailableTitle'), getLocalizedErrorMessage(error, t('detail.loadFailure')));
    } finally {
      setLoadingEdit(false);
    }
  }

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="project" />}>
      <CompactScreenHeader
        leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />}
        subtitle={selectedProject?.name ?? t('detail.chooseProject')}
        title={t('detail.title')}
      />

      {selectedProject ? (
        <>
          <OperationalEntityCard
            accessibilityLabel={t('detail.summaryA11y', { name: selectedProject.name, status: selectedStatusLabel })}
            contextLeading={selectedProject.projectCode ?? t('detail.defaultCode')}
            contextTrailing={selectedStatusLabel}
            footerLeading={session?.activeOrganization?.name ?? t('detail.workspace')}
            footerTrailing={selectedProject.permissions.includes('projects:update') ? (
              <Button
                accessibilityLabel={t('detail.editProject')}
                disabled={loadingEdit}
                fullWidth={false}
                label={loadingEdit ? t('detail.loading') : t('detail.edit')}
                leadingIcon="pencil-outline"
                size="sm"
                variant="brand"
                onPress={() => void openEditProject()}
              />
            ) : null}
            supporting={selectedProject.roleLabel ?? t('detail.projectAccess')}
            title={selectedProject.name}
            tone={getStatusTone(selectedProject.status)}
            style={styles.projectIdentity}
          />

          <QuickActionGrid
            items={[
              ...(selectedProject.permissions.includes('project-members:read') || selectedProject.permissions.includes('workers:read') ? [{
                key: 'team',
                label: t('detail.team'),
                accessibilityLabel: t('detail.teamA11y'),
                icon: 'account-group-outline' as const,
                tone: 'info' as const,
                onPress: () => router.push({
                  pathname: '/(app)/team',
                  params: {
                    projectId: selectedProject.id,
                    ...(!selectedProject.permissions.includes('project-members:read') ? { tab: 'workers' } : {}),
                  },
                }),
              }] : []),
            ]}
          />

          <GlassCard variant="strong" style={styles.menuList}>
            <ListItem
              leading={<IconContainer icon="office-building-outline" size="sm" />}
              title={t('detail.organization')}
              subtitle={organizationTypeLabel}
              meta={session?.activeOrganization?.name ?? t('detail.notAvailable')}
            />
            <ListItem
              leading={<IconContainer icon="shield-account-outline" size="sm" />}
              title={t('detail.yourAccess')}
              subtitle={roleLabel}
              meta={projectScopeLabel}
            />
          </GlassCard>

          {editingProject && session?.activeOrganization ? (
            <ProjectFormSheet
              project={editingProject}
              saving={savingProject}
              onClose={() => setEditingProject(null)}
              onSave={async (input: ProjectInput) => {
                setSavingProject(true);
                try {
                  await updateProject(session.activeOrganization!.id, editingProject.id, session.accessToken, input);
                  setEditingProject(null);
                  await refreshSession();
                } finally {
                  setSavingProject(false);
                }
              }}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          title={t('detail.selectTitle')}
          description={t('detail.selectDescription')}
          actionLabel={t('detail.goHome')}
          onAction={() => router.replace('/(app)/dashboard')}
        />
      )}
    </NirmanScreenBackground>
  );
}

export function MenuScreen() {
  const { t } = useTranslation('navigation');
  const { isRefreshing, refreshSession, session, signOut, switchActiveOrganization } = useSession();
  const { unreadCount } = useNotifications();
  const roleName = !session?.activeOrganization
    ? t('menu.noActiveOrganization')
    : session.memberships.find(
      (membership) => membership.organizationId === session.activeOrganization?.id,
    )?.role.name ?? t('menu.organizationMember');
  const organizationNavigation = visibleOrganizationNavigation(session, t);
  const navigation = visibleNavigation(session, t);
  const notificationItem = organizationNavigation.find((item) => item.key === 'notifications');
  const mainItems = navigation.filter((item) => ['home', 'team', 'project'].includes(item.key));
  const workforceItems = navigation.filter((item) => ['workers', 'attendance', 'wages', 'kharchi', 'materials', 'expenses'].includes(item.key));
  const projectItems = navigation.filter((item) => ['progress', 'gallery', 'sales'].includes(item.key));
  const organizationItems = organizationNavigation.filter((item) => item.key !== 'notifications');
  const activeMemberships = session?.memberships.filter((membership) => membership.memberStatus === 'ACTIVE') ?? [];

  const renderNavigationRow = (item: (typeof navigation)[number]) => (
    <Pressable
      accessibilityLabel={t('a11y.open', { screen: item.title })}
      accessibilityRole="button"
      key={item.key}
      onPress={() => router.push(item.href as Href)}
      style={({ pressed }) => [styles.drawerRow, pressed && styles.drawerRowPressed]}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.drawerRowIcon}>
        <AppIcon color={mobileTheme.color.text.brand} name={item.icon} size={mobileTheme.icon.md} />
      </View>
      <AppText numberOfLines={1} style={styles.drawerRowLabel} weight={600}>{item.title}</AppText>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <AppIcon color={mobileTheme.color.text.muted} name="chevron-right" size={mobileTheme.icon.md} />
      </View>
    </Pressable>
  );

  const renderSection = (title: string, items: (typeof navigation)[number][]) => {
    if (!items.length) return null;

    return (
      <View style={styles.drawerSection}>
        <AppText style={styles.drawerSectionTitle} weight={700}>{title}</AppText>
        <GlassCard padding="none" variant="strong" style={styles.drawerSectionCard}>
          {items.map(renderNavigationRow)}
        </GlassCard>
      </View>
    );
  };

  return (
    <NirmanScreenBackground
      footer={
        <GlassCard padding="sm" variant="strong" style={styles.menuFooter}>
          <Button
            label={isRefreshing ? t('menu.refreshingAccess') : t('menu.refreshAccess')}
            leadingIcon="sync"
            variant="brand"
            disabled={isRefreshing}
            onPress={() => void refreshSession()}
          />
          <Button label={t('menu.signOut')} leadingIcon="logout" variant="danger" onPress={signOut} />
        </GlassCard>
      }
      style={styles.menuContent}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <AppText style={styles.screenTitle} weight={700}>{t('menu.title')}</AppText>
          <AppText numberOfLines={1} style={styles.menuSubtitle} weight={500}>{t('menu.subtitle')}</AppText>
        </View>
        <IconButton
          icon="close"
          accessibilityLabel={t('a11y.goBack')}
          variant="glass"
          onPress={() => router.back()}
        />
      </View>

      <GlassCard variant="strong" style={styles.profileCard}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.avatarWrap}>
          {session?.user.avatarUrl ? (
            <Image source={{ uri: session.user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <AppIcon color={mobileTheme.color.text.brand} name="account" size={mobileTheme.icon.xl} />
          )}
          <View style={styles.avatarEditMark}>
            <AppIcon color={mobileTheme.color.text.inverse} name="camera-outline" size={mobileTheme.icon.xs} />
          </View>
        </View>
        <View style={styles.projectCopy}>
          <AppText numberOfLines={1} style={styles.cardTitle} weight={700}>{session?.user.name ?? t('menu.customerUser')}</AppText>
          <AppText numberOfLines={1} style={styles.profileRole} weight={600}>{roleName}</AppText>
          {session?.user.email ? <AppText numberOfLines={1} style={styles.cardCaption} weight={500}>{session.user.email}</AppText> : null}
        </View>
      </GlassCard>

      <ProjectContextCard compact />

      <View style={styles.menuQuickActions}>
        <LanguagePicker compact showDescription={false} style={styles.languageControl} />
        {notificationItem ? (
          <IconButton
            badgeCount={unreadCount}
            icon="bell-outline"
            accessibilityLabel={t('a11y.openNotifications', { count: unreadCount })}
            variant="glass"
            onPress={() => router.push(notificationItem.href as Href)}
          />
        ) : null}
      </View>

      {renderSection(t('menu.sections.main'), mainItems)}
      {renderSection(t('menu.sections.workforce'), workforceItems)}
      {renderSection(t('menu.sections.projectManagement'), projectItems)}
      {organizationItems.length || activeMemberships.length > 1 ? (
        <View style={styles.drawerSection}>
          <AppText style={styles.drawerSectionTitle} weight={700}>{t('menu.sections.organization')}</AppText>
          <GlassCard padding="none" variant="strong" style={styles.drawerSectionCard}>
            {organizationItems.map(renderNavigationRow)}
            {activeMemberships.length > 1 ? activeMemberships.map((membership) => (
              <Pressable
                accessibilityLabel={`${membership.organizationName}, ${membership.organizationId === session?.activeOrganization?.id ? t('menu.active') : t('menu.switch')}`}
                accessibilityRole="button"
                key={membership.organizationId}
                onPress={() => void switchActiveOrganization(membership.organizationId)}
                style={({ pressed }) => [styles.drawerRow, membership.organizationId === session?.activeOrganization?.id && styles.activeOrganizationRow, pressed && styles.drawerRowPressed]}
              >
                <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.drawerRowIcon}>
                  <AppIcon color={mobileTheme.color.text.brand} name="office-building-outline" size={mobileTheme.icon.md} />
                </View>
                <AppText numberOfLines={1} style={styles.drawerRowLabel} weight={600}>{membership.organizationName}</AppText>
                <View accessible={false} importantForAccessibility="no-hide-descendants">
                  <AppIcon color={mobileTheme.color.text.muted} name="chevron-right" size={mobileTheme.icon.md} />
                </View>
              </Pressable>
            )) : null}
          </GlassCard>
        </View>
      ) : null}
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  homeContent: { gap: mobileTheme.spacing[4] },
  homeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
  },
  homeHeaderActions: { flexDirection: 'row', gap: mobileTheme.spacing[2] },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    marginBottom: mobileTheme.spacing[2],
  },
  liveDot: {
    backgroundColor: mobileTheme.color.action.primary,
    borderRadius: mobileTheme.radius.full,
    height: 8,
    width: 8,
  },
  eyebrow: {
    ...mobileText.caption,
    color: mobileTheme.color.text.brand,
  },
  homeTitle: {
    ...mobileText.title,
    fontSize: 22,
    lineHeight: 27,
  },
  identityRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
    marginTop: mobileTheme.spacing[2],
    maxWidth: '100%',
  },
  roleBadge: {
    borderColor: mobileTheme.color.border.accent,
    paddingHorizontal: mobileTheme.spacing[2],
  },
  organizationName: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    flexShrink: 1,
    fontSize: mobileTheme.typography.size.md,
  },
  screenTitle: {
    ...mobileText.title,
    fontSize: 28,
    lineHeight: 34,
  },
  menuSubtitle: {
    ...mobileText.body,
    color: mobileTheme.color.text.secondary,
    marginTop: mobileTheme.spacing[1],
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...mobileText.sectionTitle,
    fontSize: 21,
    lineHeight: 27,
  },
  projectIdentity: {
    minHeight: 142,
  },
  projectCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  cardTitle: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    fontSize: 18,
    lineHeight: 24,
  },
  cardCaption: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
  },
  menuList: {
    gap: 0,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.brand.primarySoft,
    borderColor: mobileTheme.color.border.accent,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    height: 68,
    justifyContent: 'center',
    overflow: 'visible',
    width: 68,
  },
  avatarImage: {
    borderRadius: mobileTheme.radius.full,
    height: 66,
    width: 66,
  },
  avatarEditMark: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.brand.primary,
    borderColor: mobileTheme.color.glass.strong,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 2,
    bottom: -2,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 28,
  },
  profileRole: {
    ...mobileText.caption,
    color: mobileTheme.color.text.brand,
  },
  menuContent: {
    paddingBottom: 176,
  },
  menuQuickActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  languageControl: {
    flex: 1,
  },
  drawerSection: {
    gap: mobileTheme.spacing[2],
  },
  drawerSectionTitle: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    letterSpacing: mobileTheme.typography.letterSpacing.caps,
    paddingHorizontal: mobileTheme.spacing[2],
  },
  drawerSectionCard: {
    overflow: 'hidden',
  },
  drawerRow: {
    alignItems: 'center',
    borderBottomColor: mobileTheme.color.border.subtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 56,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  drawerRowPressed: {
    backgroundColor: mobileTheme.color.brand.primarySoft,
  },
  drawerRowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  drawerRowLabel: {
    ...mobileText.body,
    color: mobileTheme.color.text.primary,
    flex: 1,
    minWidth: 0,
  },
  activeOrganizationRow: {
    backgroundColor: mobileTheme.color.brand.primarySoft,
  },
  menuFooter: {
    gap: mobileTheme.spacing[2],
  },
});
