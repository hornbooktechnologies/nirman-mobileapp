import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
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
import { getActiveProject, type MobileSession } from '../../lib/auth';
import { getLocalizedErrorMessage } from '../../i18n';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import {
  CustomerTabBar,
  HomeMetricCard,
  HomeSectionHeader,
  WorkspaceTile,
  visibleNavigation,
  visibleOrganizationNavigation,
} from './components';
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
  const { refreshSession, session } = useSession();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const activeProject = getActiveProject(session);
  const availableProjects =
    session?.projectAccess.projects.filter((project) => project.status !== 'ARCHIVED') ?? [];
  const workspaceNavigation = [
    ...visibleNavigation(session, tNavigation).filter((item) => item.key !== 'home' && item.key !== 'menu'),
    ...visibleOrganizationNavigation(session, tNavigation),
  ];
  const firstName = session?.user.name.trim().split(/\s+/)[0] || tHome('greeting.fallbackName');
  const projectScope = session?.projectAccess.projectScope ?? 'NONE';
  const projectScopeLabel = tHome(projectScopeTranslationKeys[projectScope]);

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

      <View style={styles.metricGrid}>
        <HomeMetricCard
          accessibilityLabel={tHome('metrics.workingSitesA11y', { count: availableProjects.length })}
          icon="office-building-marker-outline"
          label={tHome('metrics.workingSites')}
          tone="primary"
          value={availableProjects.length}
        />
        <HomeMetricCard
          accessibilityLabel={tHome('metrics.projectScopeA11y', { scope: projectScopeLabel })}
          icon="shield-check-outline"
          label={tHome('metrics.projectScope')}
          tone="secondary"
          value={projectScopeLabel}
        />
      </View>

      <HomeSectionHeader
        eyebrow={tHome('workspace.eyebrow')}
        title={tHome('workspace.title')}
        trailing={session?.permissions.includes('projects:create') ? (
          <IconButton
            accessibilityLabel={tHome('workspace.createProject')}
            icon="plus"
            variant="primary"
            onPress={() => setShowCreateProject(true)}
          />
        ) : null}
      />

      {workspaceNavigation.length ? (
        <View style={styles.workspaceGrid}>
          {workspaceNavigation.map((item, index) => (
            <WorkspaceTile
              key={item.key}
              description={item.description}
              emphasis={index === 0}
              icon={item.icon}
              title={item.title}
              wide={workspaceNavigation.length % 2 === 1 && index === 0}
              onPress={() => router.push(item.href as Href)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title={tHome('workspace.emptyTitle')}
          description={tHome('workspace.emptyDescription')}
        />
      )}

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
    gap: mobileTheme.spacing[6],
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
  metricGrid: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  workspaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
