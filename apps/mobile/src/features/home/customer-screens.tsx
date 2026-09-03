import type { AttendanceSummaryResponse, KharchiSummary, MaterialSummary, ProjectProgressSummary, SiteExpenseSummary } from '@nirman-app/shared';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  AppIcon,
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
import { getActiveProject, getActiveProjectPermissions, type MobileSession } from '../../lib/auth';
import { formatInr, formatNumber, getLocalizedErrorMessage } from '../../i18n';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import {
  CustomerTabBar,
  DashboardQuickActions,
  FinancialSnapshotCard,
  NeedsAttentionCard,
  ProjectProgressCard,
  ProjectSummaryStrip,
  TodayAtSiteCard,
  visibleNavigation,
  visibleOrganizationNavigation,
} from './components';
import { fetchAttendanceSummary } from '../attendance/services';
import { monthValue, todayDateOnly } from '../attendance/date-utils';
import { fetchExpenseSummary } from '../expenses';
import { fetchKharchiSummary } from '../kharchi/services';
import { fetchMaterialsSummary } from '../materials';
import { fetchProgressSummary } from '../progress';
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

type DashboardSnapshot = {
  attendance: AttendanceSummaryResponse | null;
  expenses: SiteExpenseSummary | null;
  expensesToday: SiteExpenseSummary | null;
  failed: string[];
  kharchi: KharchiSummary | null;
  materials: MaterialSummary | null;
  progress: ProjectProgressSummary | null;
};

async function settleDashboardRequest<T>(key: string, request: Promise<T> | null) {
  if (!request) return { data: null as T | null, failed: false, key };
  try {
    return { data: await request, failed: false, key };
  } catch {
    return { data: null as T | null, failed: true, key };
  }
}

export function DashboardScreen() {
  const { t: tHome } = useTranslation('home');
  const { t: tNavigation } = useTranslation('navigation');
  const { t: tProgress } = useTranslation('progress');
  const { refreshSession, session } = useSession();
  const { language } = useLocalization();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardSnapshot>({ attendance: null, expenses: null, expensesToday: null, failed: [], kharchi: null, materials: null, progress: null });
  const requestSequence = useRef(0);
  const activeProject = getActiveProject(session);
  const projectPermissions = getActiveProjectPermissions(session);
  const canReadAttendance = projectPermissions.includes('attendance:read');
  const canReadExpenses = projectPermissions.includes('expenses:read');
  const canReadKharchi = projectPermissions.includes('kharchi:read');
  const canReadMaterials = projectPermissions.includes('materials:read');
  const canReadProgress = projectPermissions.includes('progress:read');
  const availableProjects =
    session?.projectAccess.projects.filter((project) => project.status !== 'ARCHIVED') ?? [];
  const workspaceNavigation = [
    ...visibleNavigation(session, tNavigation).filter((item) => item.key !== 'home' && item.key !== 'menu'),
    ...visibleOrganizationNavigation(session, tNavigation),
  ];
  const firstName = session?.user.name.trim().split(/\s+/)[0] || tHome('greeting.fallbackName');
  const projectScope = session?.projectAccess.projectScope ?? 'NONE';
  const projectScopeLabel = tHome(projectScopeTranslationKeys[projectScope]);
  const today = todayDateOnly();
  const monthStart = `${monthValue()}-01`;

  const loadDashboard = useCallback(async () => {
    const organizationId = session?.activeOrganization?.id;
    const projectId = activeProject?.id;
    const accessToken = session?.accessToken;
    const sequence = ++requestSequence.current;

    if (!organizationId || !projectId || !accessToken) {
      setDashboard({ attendance: null, expenses: null, expensesToday: null, failed: [], kharchi: null, materials: null, progress: null });
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);
    const [attendance, expenses, expensesToday, kharchi, materials, progress] = await Promise.all([
      settleDashboardRequest('attendance', canReadAttendance ? fetchAttendanceSummary(organizationId, projectId, { startDate: today, endDate: today, selectedDate: today, page: 1, pageSize: 1 }, accessToken) : null),
      settleDashboardRequest('expenses', canReadExpenses ? fetchExpenseSummary(organizationId, projectId, accessToken, { expenseFrom: monthStart, expenseTo: today }) : null),
      settleDashboardRequest('expensesToday', canReadExpenses ? fetchExpenseSummary(organizationId, projectId, accessToken, { expenseFrom: today, expenseTo: today }) : null),
      settleDashboardRequest('kharchi', canReadKharchi ? fetchKharchiSummary(organizationId, projectId, accessToken, { startDate: monthStart, endDate: today }) : null),
      settleDashboardRequest('materials', canReadMaterials ? fetchMaterialsSummary(organizationId, projectId, accessToken) : null),
      settleDashboardRequest('progress', canReadProgress ? fetchProgressSummary(organizationId, projectId, accessToken) : null),
    ]);

    if (sequence !== requestSequence.current) return;
    setDashboard({
      attendance: attendance.data,
      expenses: expenses.data,
      expensesToday: expensesToday.data,
      failed: [attendance, expenses, expensesToday, kharchi, materials, progress].filter((result) => result.failed).map((result) => result.key),
      kharchi: kharchi.data,
      materials: materials.data,
      progress: progress.data,
    });
    setLoadingDashboard(false);
  }, [activeProject?.id, canReadAttendance, canReadExpenses, canReadKharchi, canReadMaterials, canReadProgress, monthStart, session?.accessToken, session?.activeOrganization?.id, today]);

  useEffect(() => {
    void loadDashboard();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadDashboard]);

  const number = (value: number) => formatNumber(value, language, { maximumFractionDigits: 1 });
  const money = (value: string) => formatInr(Number(value), language, { maximumFractionDigits: 0 });
  const materialApprovalCount = Number(dashboard.materials?.countsByStatus.PENDING_VERIFICATION ?? 0) + Number(dashboard.materials?.countsByStatus.PENDING_FINAL ?? 0);
  const attentionItems = [
    ...(materialApprovalCount > 0 ? [{
      accessibilityLabel: tHome('attention.materialApprovalsA11y', { count: materialApprovalCount }),
      icon: 'package-variant-closed' as const,
      label: tHome('attention.materialApprovals', { count: materialApprovalCount }),
      meta: tHome('attention.materialApprovalsMeta'),
      onPress: () => router.push('/(app)/materials'),
    }] : []),
    ...((dashboard.materials?.overdueRequests ?? 0) > 0 ? [{
      accessibilityLabel: tHome('attention.overdueMaterialsA11y', { count: dashboard.materials!.overdueRequests }),
      icon: 'calendar-alert' as const,
      label: tHome('attention.overdueMaterials', { count: dashboard.materials!.overdueRequests }),
      meta: tHome('attention.overdueMaterialsMeta'),
      onPress: () => router.push('/(app)/materials'),
      tone: 'danger' as const,
    }] : []),
    ...((dashboard.expenses?.pendingCount ?? 0) > 0 ? [{
      accessibilityLabel: tHome('attention.pendingExpensesA11y', { count: dashboard.expenses!.pendingCount, amount: money(dashboard.expenses!.pendingAmount) }),
      icon: 'receipt-text-outline' as const,
      label: tHome('attention.pendingExpenses', { count: dashboard.expenses!.pendingCount }),
      meta: money(dashboard.expenses!.pendingAmount),
      onPress: () => router.push('/(app)/expenses'),
    }] : []),
  ];
  const attentionUnavailable = attentionItems.length === 0 && (
    (canReadMaterials && dashboard.failed.includes('materials')) ||
    (canReadExpenses && dashboard.failed.includes('expenses'))
  );
  const financialMetrics = [
    ...(dashboard.expenses ? [{ accessibilityLabel: tHome('finance.expensesA11y', { amount: money(dashboard.expenses.recognizedAmount) }), label: tHome('finance.expenses'), value: money(dashboard.expenses.recognizedAmount) }] : []),
    ...(dashboard.kharchi ? [{ accessibilityLabel: tHome('finance.kharchiA11y', { amount: money(dashboard.kharchi.effectiveAmount) }), label: tHome('finance.kharchi'), value: money(dashboard.kharchi.effectiveAmount) }] : []),
  ];
  const progressStages = dashboard.progress
    ? (dashboard.progress.stages.some((stage) => stage.percentage > 0)
      ? dashboard.progress.stages.filter((stage) => stage.percentage > 0)
      : dashboard.progress.stages).slice(0, 3).map((stage) => ({ label: tProgress(`stage.${stage.stage}`), percentage: stage.percentage }))
    : [];
  const canCreateProject = Boolean(session?.permissions.includes('projects:create'));
  const quickNavigation = workspaceNavigation.filter((item) => !['project', 'team', 'members'].includes(item.key)).slice(0, canCreateProject ? 2 : 3);
  const quickActions = [
    ...(canCreateProject ? [{ key: 'create-project', label: tHome('workspace.createProject'), accessibilityHint: tHome('quickActions.createProjectHint'), icon: 'plus' as const, onPress: () => setShowCreateProject(true) }] : []),
    ...quickNavigation.map((item) => ({ key: item.key, label: item.title, accessibilityHint: item.description, icon: item.icon, onPress: () => router.push(item.href as Href) })),
    ...(workspaceNavigation.length ? [{ key: 'more', label: tHome('quickActions.more'), accessibilityHint: tHome('quickActions.moreHint'), icon: 'dots-horizontal' as const, onPress: () => router.push('/(app)/menu') }] : []),
  ];

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="home" />} style={styles.homeContent}>
      <View style={styles.homeHeader}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <AppText style={styles.eyebrow} weight={700}>{tHome('greeting.eyebrow')}</AppText>
          </View>
          <AppText style={styles.homeTitle} weight={700}>
            {tHome('greeting.welcomeBack', { name: firstName })}
          </AppText>
          <AppText style={styles.homeSubtitle} numberOfLines={1} weight={500}>
            {activeRoleName(session, tHome('greeting.noActiveOrganization'), tHome('greeting.organizationMember'))} · {session?.activeOrganization?.name ?? 'NirmanSite'}
          </AppText>
        </View>
        <IconButton
          icon="menu"
          accessibilityLabel={tNavigation('a11y.openMenu')}
          variant="dark"
          onPress={() => router.push('/(app)/menu')}
        />
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

      {activeProject && canReadAttendance ? (
        <TodayAtSiteCard
          title={tHome('today.title')}
          loadingLabel={loadingDashboard ? tHome('data.loading') : dashboard.failed.includes('attendance') ? tHome('data.unavailable') : undefined}
          stats={dashboard.attendance ? [
            { accessibilityLabel: tHome('today.workersA11y', { count: dashboard.attendance.totals.workers }), icon: 'account-hard-hat-outline', label: tHome('today.workers'), value: number(dashboard.attendance.totals.workers) },
            { accessibilityLabel: tHome('today.presentA11y', { count: dashboard.attendance.totals.presentDays }), icon: 'account-check-outline', label: tHome('today.present'), value: number(dashboard.attendance.totals.presentDays) },
            { accessibilityLabel: tHome('today.absentA11y', { count: dashboard.attendance.totals.absentDays }), icon: 'account-off-outline', label: tHome('today.absent'), value: number(dashboard.attendance.totals.absentDays) },
            ...(dashboard.expensesToday ? [{ accessibilityLabel: tHome('today.spendA11y', { amount: money(dashboard.expensesToday.recognizedAmount) }), icon: 'cash' as const, label: tHome('today.spend'), value: money(dashboard.expensesToday.recognizedAmount) }] : []),
          ] : []}
        />
      ) : null}

      {activeProject && (canReadProgress || canReadMaterials || canReadExpenses) ? (
        <View style={styles.bentoRow}>
          {canReadProgress ? (
          <ProjectProgressCard
            accessibilityLabel={dashboard.progress ? tProgress('summary.a11y', { percentage: dashboard.progress.overallPercentage, updated: dashboard.progress.updatedStages, total: dashboard.progress.stages.length }) : tProgress('screen.title')}
            emptyLabel={tProgress('summary.notStarted')}
            loadingLabel={loadingDashboard ? tHome('data.loading') : dashboard.failed.includes('progress') ? tHome('data.unavailable') : undefined}
            percentage={dashboard.progress?.overallPercentage}
            stages={progressStages}
            title={tProgress('screen.title')}
            onPress={() => router.push('/(app)/progress')}
          />
          ) : null}
          {canReadMaterials || canReadExpenses ? (
          <NeedsAttentionCard
            title={tHome('attention.title')}
            emptyLabel={tHome('attention.clear')}
            items={attentionItems}
            loadingLabel={loadingDashboard ? tHome('data.loading') : attentionUnavailable ? tHome('data.unavailable') : undefined}
          />
          ) : null}
        </View>
      ) : null}

      {activeProject && ((canReadExpenses || canReadKharchi) || quickActions.length) ? (
        <View style={styles.bentoRow}>
          {canReadExpenses || canReadKharchi ? (
          <FinancialSnapshotCard
            title={tHome('finance.title')}
            loadingLabel={loadingDashboard ? tHome('data.loading') : !financialMetrics.length && dashboard.failed.some((key) => key === 'expenses' || key === 'kharchi') ? tHome('data.unavailable') : undefined}
            metrics={financialMetrics}
          />
          ) : null}
          {quickActions.length ? <DashboardQuickActions title={tHome('quickActions.title')} items={quickActions} /> : null}
        </View>
      ) : null}

      {dashboard.failed.length ? (
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
  const activeProject = getActiveProject(session);
  const roleName = !session?.activeOrganization
    ? t('menu.noActiveOrganization')
    : session.memberships.find(
      (membership) => membership.organizationId === session.activeOrganization?.id,
    )?.role.name ?? t('menu.organizationMember');

  return (
    <NirmanScreenBackground>
      <View style={styles.headerRow}>
        <AppText style={styles.screenTitle} weight={700}>{t('menu.title')}</AppText>
        <IconButton
          icon="close"
          accessibilityLabel={t('a11y.goBack')}
          variant="glass"
          onPress={() => router.back()}
        />
      </View>

      <GlassCard variant="strong" style={styles.profileCard}>
        <IconContainer icon="account-circle-outline" variant="accent" />
        <View style={styles.projectCopy}>
          <AppText style={styles.cardTitle} weight={600}>{session?.user.name ?? t('menu.customerUser')}</AppText>
          <AppText style={styles.cardCaption} weight={500}>{roleName}</AppText>
          <AppText style={styles.cardCaption} weight={500}>{session?.user.email ?? ''}</AppText>
        </View>
      </GlassCard>

      <ProjectContextCard compact />

      <GlassCard variant="strong">
        <LanguagePicker />
      </GlassCard>

      {session && session.memberships.length > 1 ? (
        <>
          <View style={styles.sectionRow}>
            <AppText style={styles.sectionTitle} weight={700}>{t('menu.organizations')}</AppText>
          </View>
          <GlassCard variant="strong" style={styles.menuList}>
            {session.memberships
              .filter((membership) => membership.memberStatus === 'ACTIVE')
              .map((membership) => (
                <ListItem
                  key={membership.organizationId}
                  leading={<IconContainer icon="office-building-outline" size="sm" />}
                  title={membership.organizationName}
                  subtitle={membership.role.name}
                  meta={
                    membership.organizationId === session.activeOrganization?.id
                      ? t('menu.active')
                      : t('menu.switch')
                  }
                  onPress={() =>
                    void switchActiveOrganization(membership.organizationId)
                  }
                />
              ))}
          </GlassCard>
        </>
      ) : null}

      <GlassCard variant="strong" style={styles.menuList}>
        {visibleOrganizationNavigation(session, t).map((item) => (
          <ListItem
            key={item.key}
            leading={<IconContainer icon={item.icon} size="sm" />}
            title={item.title}
            subtitle={session?.activeOrganization?.name ?? t('menu.organization')}
            trailing={
              <AppIcon
                color={mobileTheme.color.text.muted}
                name="chevron-right"
                size={mobileTheme.icon.sm}
              />
            }
            onPress={() => router.push(item.href as Href)}
          />
        ))}
        {visibleNavigation(session, t).filter((item) => item.key !== 'menu').map((item) => (
          <ListItem
            key={item.key}
            leading={<IconContainer icon={item.icon} size="sm" />}
            title={item.title}
            subtitle={
              item.key === 'project'
                ? activeProject?.name ?? t('menu.selectProject')
                : t('menu.openScreen')
            }
            trailing={
              <AppIcon
                color={mobileTheme.color.text.muted}
                name="chevron-right"
                size={mobileTheme.icon.sm}
              />
            }
            onPress={() => router.push(item.href as Href)}
          />
        ))}
      </GlassCard>

      <Button
        label={isRefreshing ? t('menu.refreshingAccess') : t('menu.refreshAccess')}
        variant="info"
        disabled={isRefreshing}
        onPress={() => void refreshSession()}
      />
      <Button label={t('menu.signOut')} variant="danger" onPress={signOut} />
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  homeContent: {
    gap: mobileTheme.spacing[4],
  },
  homeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
  },
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
    fontSize: 30,
    lineHeight: 35,
  },
  homeSubtitle: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    marginTop: mobileTheme.spacing[1],
  },
  screenTitle: {
    ...mobileText.title,
    fontSize: 28,
    lineHeight: 34,
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
  bentoRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
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
});
