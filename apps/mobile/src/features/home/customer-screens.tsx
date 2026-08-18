import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Button,
  EmptyState,
  GlassCard,
  GradientScreen,
  IconButton,
  IconContainer,
  ListItem,
  OperationalEntityCard,
  QuickActionGrid,
  getStatusTone,
} from '../../components/ui';
import { getActiveProject, type MobileSession } from '../../lib/auth';
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

function activeRoleName(session: MobileSession | null) {
  if (!session?.activeOrganization) return 'No active organization';
  return (
    session.memberships.find(
      (membership) =>
        membership.organizationId === session.activeOrganization?.id,
    )?.role.name ?? 'Organization member'
  );
}

export function DashboardScreen() {
  const { refreshSession, session } = useSession();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const activeProject = getActiveProject(session);
  const availableProjects =
    session?.projectAccess.projects.filter((project) => project.status !== 'ARCHIVED') ?? [];
  const workspaceNavigation = [
    ...visibleNavigation(session).filter((item) => item.key !== 'home' && item.key !== 'menu'),
    ...visibleOrganizationNavigation(session),
  ];
  const firstName = session?.user.name.trim().split(/\s+/)[0] || 'there';

  return (
    <GradientScreen footer={<CustomerTabBar activeKey="home" />} style={styles.homeContent}>
      <View style={styles.homeHeader}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>Field workspace</Text>
          </View>
          <Text style={styles.homeTitle}>Welcome back, {firstName}</Text>
          <Text style={styles.homeSubtitle} numberOfLines={1}>
            {activeRoleName(session)} · {session?.activeOrganization?.name ?? 'NirmanSite'}
          </Text>
        </View>
        <IconButton
          icon="menu"
          accessibilityLabel="Open menu"
          variant="dark"
          onPress={() => router.push('/(app)/menu')}
        />
      </View>

      <ProjectContextCard
        featured
        onOpenProject={activeProject ? () => router.push('/(app)/project-detail') : undefined}
      />

      <View style={styles.metricGrid}>
        <HomeMetricCard icon="office-building-marker-outline" label="Working sites" tone="primary" value={availableProjects.length} />
        <HomeMetricCard icon="shield-check-outline" label="Project scope" tone="secondary" value={session?.projectAccess.projectScope ?? 'NONE'} />
      </View>

      <HomeSectionHeader
        eyebrow="Main navigation"
        title="Your workspace"
        trailing={session?.permissions.includes('projects:create') ? (
          <IconButton
            accessibilityLabel="Create project"
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
          title="Workspace access pending"
          description="Your available tools will appear here when an administrator assigns project access."
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
    </GradientScreen>
  );
}

export function ProjectDetailScreen() {
  const { refreshSession, session } = useSession();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const activeProject = getActiveProject(session);
  const selectedProject =
    session?.projectAccess.projects.find((project) => project.id === params.projectId) ??
    activeProject;

  async function openEditProject() {
    if (!session?.activeOrganization || !selectedProject) return;
    setLoadingEdit(true);
    try {
      const detail = await fetchProject(session.activeOrganization.id, selectedProject.id, session.accessToken);
      setEditingProject(detail);
    } catch (error) {
      Alert.alert('Project unavailable', error instanceof Error ? error.message : 'Unable to load project');
    } finally {
      setLoadingEdit(false);
    }
  }

  return (
    <GradientScreen footer={<CustomerTabBar activeKey="project" />}>
      <View style={styles.headerRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Back"
          variant="glass"
          onPress={() => router.back()}
        />
        <Text style={styles.compactTitle}>Project</Text>
        <View style={styles.headerSpacer} />
      </View>

      {selectedProject ? (
        <>
          <OperationalEntityCard
            accessibilityLabel={`${selectedProject.name}, ${selectedProject.status}`}
            contextLeading={selectedProject.projectCode ?? 'PROJECT'}
            contextTrailing={selectedProject.status}
            footerLeading={session?.activeOrganization?.name ?? 'Project workspace'}
            footerTrailing={selectedProject.permissions.includes('projects:update') ? (
              <Button
                accessibilityLabel="Edit project"
                disabled={loadingEdit}
                fullWidth={false}
                label={loadingEdit ? 'Loading…' : 'Edit'}
                leadingIcon="pencil-outline"
                size="sm"
                variant="brand"
                onPress={() => void openEditProject()}
              />
            ) : null}
            supporting={selectedProject.roleLabel ?? 'Project access'}
            title={selectedProject.name}
            tone={getStatusTone(selectedProject.status)}
            style={styles.projectIdentity}
          />

          <QuickActionGrid
            items={[
              ...(selectedProject.permissions.includes('project-members:read') || selectedProject.permissions.includes('workers:read') ? [{
                key: 'team',
                label: 'Team',
                accessibilityLabel: 'Open project team members and workers',
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
              title="Organization"
              subtitle={session?.activeOrganization?.type ?? 'Customer organization'}
              meta={session?.activeOrganization?.name ?? 'Not available'}
            />
            <ListItem
              leading={<IconContainer icon="shield-account-outline" size="sm" />}
              title="Your Access"
              subtitle={activeRoleName(session)}
              meta={session?.projectAccess.projectScope ?? 'NONE'}
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
          title="Select a project"
          description="Choose an active project from Home before opening project work."
          actionLabel="Go to Home"
          onAction={() => router.replace('/(app)/dashboard')}
        />
      )}
    </GradientScreen>
  );
}

export function MenuScreen() {
  const { isRefreshing, refreshSession, session, signOut, switchActiveOrganization } = useSession();
  const activeProject = getActiveProject(session);

  return (
    <GradientScreen>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Menu</Text>
        <IconButton
          icon="close"
          accessibilityLabel="Go back"
          variant="glass"
          onPress={() => router.back()}
        />
      </View>

      <GlassCard variant="strong" style={styles.profileCard}>
        <IconContainer icon="account-circle-outline" variant="accent" />
        <View style={styles.projectCopy}>
          <Text style={styles.cardTitle}>{session?.user.name ?? 'Customer user'}</Text>
          <Text style={styles.cardCaption}>{activeRoleName(session)}</Text>
          <Text style={styles.cardCaption}>{session?.user.email ?? ''}</Text>
        </View>
      </GlassCard>

      <ProjectContextCard compact />

      {session && session.memberships.length > 1 ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Organizations</Text>
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
                      ? 'Active'
                      : 'Switch'
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
        {visibleOrganizationNavigation(session).map((item) => (
          <ListItem
            key={item.key}
            leading={<IconContainer icon={item.icon} size="sm" />}
            title={item.title}
            subtitle={session?.activeOrganization?.name ?? 'Organization'}
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
        {visibleNavigation(session).filter((item) => item.key !== 'menu').map((item) => (
          <ListItem
            key={item.key}
            leading={<IconContainer icon={item.icon} size="sm" />}
            title={item.title}
            subtitle={
              item.key === 'project'
                ? activeProject?.name ?? 'Select an active project'
                : 'Open screen'
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
        label={isRefreshing ? 'Refreshing Access' : 'Refresh Access'}
        variant="info"
        disabled={isRefreshing}
        onPress={() => void refreshSession()}
      />
      <Button label="Sign Out" variant="danger" onPress={signOut} />
    </GradientScreen>
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
  headerSpacer: {
    width: 48,
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
    fontFamily: 'Manrope_700Bold',
    letterSpacing: mobileTheme.typography.letterSpacing.caps,
    textTransform: 'uppercase',
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
  compactTitle: {
    ...mobileText.sectionTitle,
    flex: 1,
    textAlign: 'center',
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
