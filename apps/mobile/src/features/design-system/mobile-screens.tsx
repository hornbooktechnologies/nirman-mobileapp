import { router, type Href } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PermissionKey } from '@nirman-app/shared';

import {
  AppIcon,
  Badge,
  Button,
  Chip,
  FloatingTabBar,
  GlassCard,
  GradientScreen,
  IconButton,
  IconContainer,
  Input,
  ListItem,
  ProgressRing,
  TextLink,
  Toggle,
  type AppIconName,
} from '../../components/ui';
import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import {
  automationRows,
  detailActions,
  detailRows,
  mobileTabs,
  projects,
  showcaseStatuses,
  workflowCards,
} from './mock-data';
import { ProjectContextCard } from '../projects';
import { getActiveProject } from '../../lib/auth';
import { useSession } from '../../providers';

type MobileMenuHref =
  | '/(app)/dashboard'
  | '/(app)/project-detail'
  | '/(app)/workers'
  | '/(app)/workflows'
  | '/(app)/design-system';

interface MobileMenuItem {
  title: string;
  icon: AppIconName;
  href: MobileMenuHref;
  permission?: PermissionKey;
}

const menuItems: readonly MobileMenuItem[] = [
  { title: 'Dashboard', icon: 'home-outline', href: '/(app)/dashboard' },
  {
    title: 'Project Detail',
    icon: 'folder-cog-outline',
    href: '/(app)/project-detail',
    permission: 'projects:read',
  },
  {
    title: 'Workers',
    icon: 'account-hard-hat-outline',
    href: '/(app)/workers',
    permission: 'workers:read',
  },
];

export function OnboardingScreen({ onStart }: { onStart: () => void }) {
  return (
    <GradientScreen scroll={false} style={styles.onboardingContent}>
      <View style={styles.onboardingImageWrap}>
        <Image
          source={require('../../../assets/brand/onboarding-construction.png')}
          resizeMode="cover"
          style={styles.onboardingImage}
        />
      </View>
      <GlassCard variant="strong" style={styles.onboardingPanel}>
        <View style={styles.logoFloat}>
          <Image
            source={require('../../../assets/brand/logo-full.png')}
            resizeMode="contain"
            style={styles.logoFull}
          />
        </View>
        <Text style={styles.onboardingTitle}>Site in Your Hands</Text>
        <Text style={styles.onboardingBody}>
          Track projects, teams and approvals from anywhere.
        </Text>
        <Button label="Start Now" size="lg" onPress={onStart} />
      </GlassCard>
    </GradientScreen>
  );
}

export function DashboardScreen() {
  const { session } = useSession();
  const activeProject = getActiveProject(session);
  const activeProjects =
    session?.projectAccess?.projects?.filter(
      (project) => project.status === 'ACTIVE',
    ) ?? [];
  const displayProjects = activeProjects.length
    ? activeProjects.map((project, index) => ({
        title: project.name,
        status: project.roleLabel ?? project.projectCode ?? project.status,
        icon: (index % 2 === 0
          ? 'office-building-marker-outline'
          : 'home-city-outline') as AppIconName,
        selected: project.id === session?.activeProjectId,
        progress: project.id === session?.activeProjectId ? 72 : 34,
      }))
    : projects;

  return (
    <GradientScreen
      footer={
        <FloatingTabBar
          activeKey="home"
          tabs={mobileTabs}
          onChange={handleTabChange}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hello, Rakesh</Text>
          <Text style={styles.screenTitle}>
            {session?.user?.name ?? 'Field User'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="menu"
            accessibilityLabel="Open menu"
            variant="glass"
            onPress={() => router.push('/(app)/menu')}
          />
          <IconButton
            icon="bell-outline"
            accessibilityLabel="Notifications"
            showDot
            variant="glass"
          />
        </View>
      </View>

      <ProjectContextCard />

      <View style={styles.teamSummary}>
        <View style={styles.sitesPill}>
          <AppIcon
            color={mobileTheme.color.text.primary}
            name="account-hard-hat-outline"
            size={mobileTheme.icon.sm}
          />
          <Text style={styles.metricMini}>
            {activeProjects.length || 0} Sites
          </Text>
        </View>
        <Text style={styles.sharedTeamText}>
          {activeProject?.roleLabel ?? 'Field Team'}
        </Text>
      </View>
      <View style={styles.avatarRail}>
        <View style={styles.addTeamCircle}>
          <AppIcon
            color={mobileTheme.color.text.primary}
            name="plus"
            size={mobileTheme.icon.lg}
          />
        </View>
        <View style={styles.avatarRow}>
          {['R', 'A', 'M', 'S'].map((item) => (
            <View key={item} style={styles.avatar}>
              <Text style={styles.avatarText}>{item}</Text>
            </View>
          ))}
          <View style={styles.moreAvatar}>
            <Text style={styles.avatarText}>+2</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Projects</Text>
        <TextLink label="View All" withChevron />
      </View>

      <View style={styles.projectGrid}>
        {displayProjects.map((project) => (
          <Pressable
            key={project.title}
            onPress={() =>
              project.selected && router.push('/(app)/project-detail')
            }
            style={[
              styles.projectCard,
              project.selected && styles.projectCardSelected,
            ]}
          >
            <View style={styles.projectTopRow}>
              <IconContainer icon={project.icon} variant="glass" />
              <Toggle value={project.selected} />
            </View>
            <View>
              <Text
                style={[
                  styles.projectTitle,
                  project.selected && styles.inverseText,
                ]}
              >
                {project.title}
              </Text>
              <Text
                style={[
                  styles.projectStatus,
                  project.selected && styles.inverseMuted,
                ]}
              >
                {project.status}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${project.progress}%` }]}
              />
            </View>
          </Pressable>
        ))}
      </View>
    </GradientScreen>
  );
}

export function ProjectDetailScreen() {
  const { session } = useSession();
  const activeProject = getActiveProject(session);

  return (
    <GradientScreen
      footer={
        <FloatingTabBar
          activeKey="home"
          tabs={mobileTabs}
          onChange={handleTabChange}
        />
      }
    >
      <View style={styles.headerRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Back"
          variant="glass"
          onPress={() => router.back()}
        />
        <Text style={styles.compactTitle}>
          {activeProject?.name ?? 'Project Context'}
        </Text>
        <IconButton
          icon="dots-horizontal"
          accessibilityLabel="More options"
          variant="glass"
        />
      </View>

      <ProjectContextCard compact />

      <GlassCard variant="strong" style={styles.progressPanel}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Overall Progress</Text>
          <IconContainer icon="target" variant="accent" />
        </View>
        <ProgressRing value={72} />
        <View style={styles.rangeRow}>
          <Text style={styles.mutedLabel}>0%</Text>
          <Text style={styles.mutedLabel}>100%</Text>
        </View>
      </GlassCard>

      <View style={styles.actionGrid}>
        {detailActions.map((action) => (
          <GlassCard
            key={action.title}
            variant={action.selected ? 'selected' : 'default'}
            padding="sm"
            style={styles.actionCard}
          >
            <IconContainer
              icon={action.icon}
              variant={action.selected ? 'dark' : 'glass'}
              size="sm"
            />
            <Text
              style={[styles.cardTitle, action.selected && styles.inverseText]}
            >
              {action.title}
            </Text>
            <Text
              style={[
                styles.cardCaption,
                action.selected && styles.inverseMuted,
              ]}
            >
              {action.subtitle}
            </Text>
          </GlassCard>
        ))}
      </View>

      <GlassCard variant="strong" style={styles.detailListPanel}>
        {detailRows.map((row) => (
          <ListItem
            key={row.title}
            leading={<IconContainer icon={row.icon} size="sm" />}
            title={row.title}
            subtitle={row.subtitle}
            meta={row.value}
            trailing={
              <AppIcon
                color={mobileTheme.color.text.muted}
                name="chevron-right"
                size={mobileTheme.icon.sm}
              />
            }
          />
        ))}
      </GlassCard>
    </GradientScreen>
  );
}

export function WorkflowsScreen() {
  const { session } = useSession();
  const activeProject = getActiveProject(session);

  return (
    <GradientScreen
      footer={
        <FloatingTabBar
          activeKey="updates"
          tabs={mobileTabs}
          onChange={handleTabChange}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>
            {activeProject?.name ?? 'Select a project'}
          </Text>
          <Text style={styles.screenTitle}>Field Workflows</Text>
        </View>
        <IconButton
          icon="cog-outline"
          accessibilityLabel="Workflow settings"
          variant="glass"
        />
      </View>

      <ProjectContextCard compact />

      {workflowCards.map((workflow) => (
        <GlassCard
          key={workflow.title}
          variant="default"
          style={styles.workflowCard}
        >
          <View style={styles.sectionRow}>
            <View style={styles.workflowTitleRow}>
              <IconContainer icon={workflow.icon} variant="accent" />
              <Text style={styles.sectionTitle}>{workflow.title}</Text>
            </View>
            <Badge label="Today" tone="info" />
          </View>
          <View
            style={
              workflow.metrics.length === 3
                ? styles.workflowMetricsThree
                : styles.workflowMetricsFour
            }
          >
            {workflow.metrics.map((metric, index) => (
              <View
                key={metric}
                style={[
                  styles.workflowPill,
                  index === 2 &&
                    workflow.metrics.length === 3 &&
                    styles.workflowPillWarm,
                ]}
              >
                <Text style={styles.workflowValue}>{metric.split(' ')[0]}</Text>
                <Text style={styles.workflowText}>
                  {metric.split(' ').slice(1).join(' ')}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ))}

      <GlassCard variant="sheet" style={styles.automationSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Automation</Text>
        <View style={styles.listStack}>
          {automationRows.map((row) => (
            <View key={row.title} style={styles.automationRow}>
              <IconContainer icon={row.icon} size="sm" />
              <View style={styles.automationText}>
                <Text style={styles.cardTitle}>{row.title}</Text>
                <Text style={styles.cardCaption}>{row.subtitle}</Text>
              </View>
              <Toggle value />
            </View>
          ))}
        </View>
      </GlassCard>
    </GradientScreen>
  );
}

export function DesignSystemShowcaseScreen() {
  return (
    <GradientScreen
      footer={
        <FloatingTabBar
          activeKey="home"
          tabs={mobileTabs}
          onChange={handleTabChange}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Design System</Text>
        <IconButton
          icon="cog-outline"
          accessibilityLabel="Settings"
          variant="glass"
        />
      </View>

      <GlassCard variant="strong" style={styles.showcaseBlock}>
        <Text style={styles.sectionTitle}>Colors and status</Text>
        <View style={styles.quickActionRow}>
          {showcaseStatuses.map((status, index) => (
            <Badge
              key={status}
              label={status}
              tone={
                index === 0
                  ? 'active'
                  : index === 1
                    ? 'purple'
                    : index === 2
                      ? 'warning'
                      : index === 3
                        ? 'success'
                        : index === 4
                          ? 'danger'
                          : 'info'
              }
            />
          ))}
        </View>
      </GlassCard>

      <GlassCard variant="default" style={styles.showcaseBlock}>
        <Text style={styles.sectionTitle}>Typography</Text>
        <Text style={styles.screenTitle}>Screen title Manrope</Text>
        <Text style={styles.sectionTitle}>Section title</Text>
        <Text style={styles.bodyCopy}>
          Body text stays readable for field users and calm enough for builders.
        </Text>
      </GlassCard>

      <GlassCard variant="default" style={styles.showcaseBlock}>
        <Text style={styles.sectionTitle}>Controls</Text>
        <Button label="Primary" fullWidth={false} />
        <Button label="Glass" variant="glass" fullWidth={false} />
        <Button label="Dark" variant="dark" fullWidth={false} />
        <Input placeholder="Rounded input" />
        <Toggle label="Switch control" value />
      </GlassCard>

      <GlassCard variant="sheet" style={styles.showcaseBlock}>
        <Text style={styles.sheetTitle}>Floating Sheet</Text>
        <ListItem
          title="Bottom sheet row"
          subtitle="Elevated white panel"
          meta="Ready"
        />
      </GlassCard>
    </GradientScreen>
  );
}

export function MenuScreen() {
  const { session, signOut } = useSession();
  const activeProject = getActiveProject(session);
  const visibleMenuItems = menuItems.filter(
    (item) =>
      !item.permission || session?.permissions.includes(item.permission),
  );

  return (
    <GradientScreen
      footer={
        <FloatingTabBar
          activeKey="menu"
          tabs={mobileTabs}
          onChange={handleTabChange}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Menu</Text>
        <IconButton
          icon="close"
          accessibilityLabel="Go back"
          variant="glass"
          onPress={() => router.back()}
        />
      </View>

      <GlassCard variant="strong" style={styles.menuProfileCard}>
        <Image
          source={require('../../../assets/brand/logo-mark.png')}
          resizeMode="contain"
          style={styles.menuLogo}
        />
        <View style={styles.menuProfileText}>
          <Text style={styles.cardTitle}>
            {session?.user?.name ?? 'Field User'}
          </Text>
          <Text style={styles.cardCaption}>
            {session?.activeOrganization?.name ?? 'No organization'} /{' '}
            {activeProject?.name ?? 'No project'}
          </Text>
        </View>
      </GlassCard>

      <ProjectContextCard compact />

      <GlassCard variant="strong" style={styles.menuList}>
        {visibleMenuItems.map((item) => (
          <ListItem
            key={item.title}
            leading={<IconContainer icon={item.icon} size="sm" />}
            title={item.title}
            subtitle="Open screen"
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

      <Button label="Sign Out" variant="outline" onPress={signOut} />
    </GradientScreen>
  );
}

function handleTabChange(key: string) {
  if (key === 'home') router.push('/(app)/dashboard');
  if (key === 'updates') router.push('/(app)/workflows');
  if (key === 'menu') router.push('/(app)/menu');
}

const styles = StyleSheet.create({
  onboardingContent: {
    gap: 0,
    justifyContent: 'space-between',
  },
  onboardingImageWrap: {
    borderRadius: 34,
    height: 380,
    marginHorizontal: mobileTheme.spacing[2],
    overflow: 'hidden',
    ...mobileShadows.card,
  },
  onboardingImage: {
    height: '100%',
    width: '100%',
  },
  onboardingPanel: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.subtle,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    gap: mobileTheme.spacing[6],
    minHeight: 330,
    paddingHorizontal: mobileTheme.spacing[6],
    paddingTop: 104,
  },
  logoFloat: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    height: 150,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -75,
    position: 'absolute',
    top: -75,
    width: 150,
    ...mobileShadows.floating,
  },
  logoFull: {
    height: 100,
    width: 118,
  },
  onboardingTitle: {
    ...mobileText.display,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  onboardingBody: {
    ...mobileText.body,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
    textAlign: 'center',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  greeting: {
    ...mobileText.body,
    color: mobileTheme.color.text.secondary,
  },
  screenTitle: {
    ...mobileText.title,
    fontSize: 30,
    lineHeight: 36,
  },
  compactTitle: {
    ...mobileText.sectionTitle,
    flex: 1,
    textAlign: 'center',
  },
  teamSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sitesPill: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    minHeight: 48,
    paddingHorizontal: mobileTheme.spacing[4],
    ...mobileShadows.soft,
  },
  metricMini: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    fontSize: 18,
  },
  sharedTeamText: {
    ...mobileText.body,
    color: mobileTheme.color.text.secondary,
    fontSize: 16,
  },
  mutedLabel: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  avatarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
  },
  avatarRail: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[5],
  },
  addTeamCircle: {
    alignItems: 'center',
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.full,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 50,
  },
  avatarText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    fontFamily: 'Manrope_700Bold',
  },
  addAvatar: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.action.primary,
    borderRadius: mobileTheme.radius.full,
    height: 38,
    justifyContent: 'center',
    marginLeft: mobileTheme.spacing[2],
    width: 38,
  },
  moreAvatar: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...mobileText.sectionTitle,
    fontSize: 22,
    lineHeight: 28,
  },
  projectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: mobileTheme.spacing[4],
  },
  projectCard: {
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.xxl,
    borderWidth: 1,
    gap: mobileTheme.spacing[6],
    height: 168,
    justifyContent: 'space-between',
    padding: mobileTheme.spacing[5],
    width: '47.5%',
    ...mobileShadows.card,
  },
  projectCardSelected: {
    backgroundColor: mobileTheme.color.action.primary,
    ...mobileShadows.copperGlow,
  },
  projectTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectTitle: {
    ...mobileText.sectionTitle,
    fontSize: 21,
    lineHeight: 27,
  },
  projectStatus: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    fontSize: 13,
  },
  inverseText: {
    color: mobileTheme.color.text.inverse,
  },
  inverseMuted: {
    color: mobileTheme.color.text.inverse,
    opacity: 0.76,
  },
  progressBar: {
    backgroundColor: mobileTheme.color.glass.subtle,
    borderRadius: mobileTheme.radius.full,
    height: mobileTheme.spacing[2],
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: mobileTheme.color.action.primary,
    borderRadius: mobileTheme.radius.full,
    height: '100%',
  },
  quickActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  progressPanel: {
    gap: mobileTheme.spacing[4],
    minHeight: 300,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
  },
  actionCard: {
    alignItems: 'center',
    flex: 1,
    gap: mobileTheme.spacing[3],
    minHeight: 126,
    justifyContent: 'center',
  },
  cardTitle: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    fontSize: 18,
    lineHeight: 24,
  },
  cardCaption: {
    ...mobileText.caption,
    fontSize: 13,
    lineHeight: 19,
  },
  listStack: {
    gap: 0,
  },
  detailListPanel: {
    gap: 0,
  },
  workflowCard: {
    gap: mobileTheme.spacing[6],
    minHeight: 160,
  },
  workflowTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  workflowMetricsThree: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
  },
  workflowMetricsFour: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  workflowPill: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.background.mist,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    flex: 1,
    minHeight: 62,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[3],
  },
  workflowPillWarm: {
    backgroundColor: mobileTheme.color.brand.secondarySoft,
  },
  workflowValue: {
    ...mobileText.sectionTitle,
    color: mobileTheme.color.text.primary,
    fontSize: 20,
    lineHeight: 24,
  },
  workflowText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    fontSize: 12,
    textAlign: 'center',
  },
  automationSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: mobileTheme.spacing[5],
    marginHorizontal: -mobileTheme.spacing[3],
    marginTop: -mobileTheme.spacing[2],
    minHeight: 390,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.full,
    height: mobileTheme.spacing[1],
    width: mobileTheme.spacing[12],
  },
  sheetTitle: {
    ...mobileText.title,
    fontSize: 24,
    lineHeight: 30,
  },
  automationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
    minHeight: 78,
    borderBottomColor: mobileTheme.color.border.subtle,
    borderBottomWidth: 1,
  },
  automationText: {
    flex: 1,
  },
  showcaseBlock: {
    gap: mobileTheme.spacing[4],
  },
  bodyCopy: {
    ...mobileText.body,
  },
  menuProfileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
  },
  menuLogo: {
    height: 56,
    width: 56,
  },
  menuProfileText: {
    flex: 1,
  },
  menuList: {
    gap: 0,
  },
});
