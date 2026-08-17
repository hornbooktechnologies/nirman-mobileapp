import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PermissionKey } from '@nirman-app/shared';

import {
  AppIcon,
  Badge,
  Button,
  EmptyState,
  FloatingTabBar,
  GlassCard,
  GradientScreen,
  IconButton,
  IconContainer,
  ListItem,
  type AppIconName,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions, type MobileSession } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import {
  createProject,
  fetchProject,
  ProjectContextCard,
  ProjectFormSheet,
  updateProject,
  type Project,
  type ProjectInput,
} from '../projects';

type CustomerRoute =
  | '/(app)/dashboard'
  | '/(app)/project-detail'
  | '/(app)/workers'
  | '/(app)/team'
  | '/(app)/members'
  | '/(app)/menu';

type CustomerNavigationItem = {
  key: string;
  label: string;
  title: string;
  icon: AppIconName;
  href: CustomerRoute;
  permission?: PermissionKey;
};

const customerNavigation: readonly CustomerNavigationItem[] = [
  {
    key: 'home',
    label: 'Home',
    title: 'Home',
    icon: 'home-outline',
    href: '/(app)/dashboard',
  },
  {
    key: 'team',
    label: 'Team',
    title: 'Project Team',
    icon: 'account-group-outline',
    href: '/(app)/team',
    permission: 'project-members:read',
  },
  {
    key: 'project',
    label: 'Project',
    title: 'Selected Project',
    icon: 'folder-cog-outline',
    href: '/(app)/project-detail',
    permission: 'projects:read',
  },
  {
    key: 'workers',
    label: 'Workers',
    title: 'Workers',
    icon: 'account-hard-hat-outline',
    href: '/(app)/workers',
    permission: 'workers:read',
  },
  {
    key: 'menu',
    label: 'Menu',
    title: 'Menu',
    icon: 'menu',
    href: '/(app)/menu',
  },
];

const organizationNavigation: readonly CustomerNavigationItem[] = [
  {
    key: 'members',
    label: 'Members',
    title: 'Organization Members',
    icon: 'account-multiple-outline',
    href: '/(app)/members',
    permission: 'members:read',
  },
];

function visibleNavigation(session: MobileSession | null) {
  const projectPermissions = getActiveProjectPermissions(session);
  return customerNavigation.filter(
    (item) =>
      !item.permission || projectPermissions.includes(item.permission),
  );
}

function visibleOrganizationNavigation(session: MobileSession | null) {
  return organizationNavigation.filter(
    (item) => !item.permission || session?.permissions.includes(item.permission),
  );
}

function navigateTo(key: string, session: MobileSession | null) {
  const item = visibleNavigation(session).find((candidate) => candidate.key === key);
  if (item) router.push(item.href as Href);
}

function CustomerTabBar({ activeKey }: { activeKey: string }) {
  const { session } = useSession();
  const tabs = visibleNavigation(session).map(({ key, label, icon }) => ({
    key,
    label,
    icon,
  }));

  return (
    <FloatingTabBar
      activeKey={activeKey}
      tabs={tabs}
      onChange={(key) => navigateTo(key, session)}
    />
  );
}

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
  const { refreshSession, session, switchActiveProject } = useSession();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const availableProjects =
    session?.projectAccess.projects.filter((project) => project.status !== 'ARCHIVED') ?? [];

  async function openProject(projectId: string, status: string) {
    if (status === 'ACTIVE' || status === 'DRAFT' || status === 'ON_HOLD') {
      await switchActiveProject(projectId);
    }
    router.push({ pathname: '/(app)/project-detail', params: { projectId } });
  }

  return (
    <GradientScreen footer={<CustomerTabBar activeKey="home" />}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>{activeRoleName(session)}</Text>
          <Text style={styles.screenTitle}>{session?.user.name ?? 'NirmanSite'}</Text>
        </View>
        <IconButton
          icon="menu"
          accessibilityLabel="Open menu"
          variant="glass"
          onPress={() => router.push('/(app)/menu')}
        />
      </View>

      <ProjectContextCard />

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Your Projects</Text>
        <View style={styles.sectionActions}>
          <Badge label={`${availableProjects.length} available`} tone={availableProjects.length ? 'active' : 'warning'} />
          {session?.permissions.includes('projects:create') ? <IconButton icon="plus" accessibilityLabel="Create project" variant="primary" onPress={() => setShowCreateProject(true)} /> : null}
        </View>
      </View>

      {availableProjects.length ? (
        <View style={styles.projectList}>
          {availableProjects.map((project) => {
            const isSelected = project.id === session?.activeProjectId;
            return (
              <Pressable
                accessibilityRole="button"
                key={project.id}
                onPress={() => void openProject(project.id, project.status)}
              >
                <GlassCard
                  variant={isSelected ? 'selected' : 'strong'}
                  style={styles.projectCard}
                >
                  <IconContainer
                    icon="office-building-marker-outline"
                    variant={isSelected ? 'dark' : 'glass'}
                  />
                  <View style={styles.projectCopy}>
                    <Text style={[styles.cardTitle, isSelected && styles.inverseText]}>
                      {project.name}
                    </Text>
                    <Text style={[styles.cardCaption, isSelected && styles.inverseMuted]}>
                      {project.projectCode ?? project.roleLabel ?? project.status}
                    </Text>
                  </View>
                  <AppIcon
                    color={
                      isSelected
                        ? mobileTheme.color.text.inverse
                        : mobileTheme.color.text.muted
                    }
                    name="chevron-right"
                    size={mobileTheme.icon.md}
                  />
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title="No project access"
          description="Ask your Organization Owner or Admin to assign an active project."
        />
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Available Work</Text>
      </View>

      <GlassCard variant="strong" style={styles.menuList}>
        {visibleOrganizationNavigation(session).map((item) => (
          <ListItem
            key={item.key}
            leading={<IconContainer icon={item.icon} size="sm" />}
            title={item.title}
            subtitle="Manage organization login users"
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
        {visibleNavigation(session)
          .filter((item) => item.key !== 'home' && item.key !== 'menu')
          .map((item) => (
            <ListItem
              key={item.key}
              leading={<IconContainer icon={item.icon} size="sm" />}
              title={item.title}
              subtitle="Open for the selected project"
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
        <Text style={styles.compactTitle}>Selected Project</Text>
        <View style={styles.headerSpacer} />
      </View>

      {selectedProject ? (
        <>
          <GlassCard variant="strong" style={styles.projectSummary}>
            <IconContainer icon="office-building-marker-outline" variant="accent" />
            <View style={styles.projectCopy}>
              <Text style={styles.screenTitle}>{selectedProject.name}</Text>
              <Text style={styles.cardCaption}>
                {selectedProject.projectCode ?? 'No project code'}
              </Text>
            </View>
            <Badge label={selectedProject.status} tone={selectedProject.status === 'ACTIVE' ? 'active' : 'warning'} />
          </GlassCard>

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

          {selectedProject.permissions.includes('projects:update') ? (
            <Button label={loadingEdit ? 'Loading Project' : 'Edit Project'} variant="outline" disabled={loadingEdit} onPress={() => void openEditProject()} />
          ) : null}

          {selectedProject.permissions.includes('project-members:read') ? (
            <Button
              label="Open Project Team"
              size="lg"
              onPress={() => router.push({ pathname: '/(app)/team', params: { projectId: selectedProject.id } })}
            />
          ) : null}

          {selectedProject.permissions.includes('workers:read') ? (
            <Button
              label="Open Workers"
              size="lg"
              onPress={() =>
                selectedProject.status === 'ACTIVE'
                  ? router.push('/(app)/workers')
                  : router.push({ pathname: '/(app)/team', params: { projectId: selectedProject.id, tab: 'workers' } })
              }
            />
          ) : null}

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
    <GradientScreen footer={<CustomerTabBar activeKey="menu" />}>
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
        {visibleNavigation(session).map((item) => (
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
        variant="outline"
        disabled={isRefreshing}
        onPress={() => void refreshSession()}
      />
      <Button label="Sign Out" variant="outline" onPress={signOut} />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
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
  greeting: {
    ...mobileText.body,
    color: mobileTheme.color.text.secondary,
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
  sectionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
  },
  projectList: {
    gap: mobileTheme.spacing[3],
  },
  projectCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
    minHeight: 92,
    ...mobileShadows.card,
  },
  projectSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
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
  inverseText: {
    color: mobileTheme.color.text.inverse,
  },
  inverseMuted: {
    color: mobileTheme.color.text.inverse,
    opacity: 0.76,
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
