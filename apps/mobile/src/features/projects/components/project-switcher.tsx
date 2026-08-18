import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  BottomSheet,
  GlassCard,
  IconContainer,
  ListItem,
  StatusBadge,
} from '../../../components/ui';
import { getActiveProject, type MobileProjectSummary } from '../../../lib/auth';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';

type ProjectContextCardProps = {
  compact?: boolean;
  featured?: boolean;
  onOpenProject?: () => void;
};

export function ProjectContextCard({ compact = false, featured = false, onOpenProject }: ProjectContextCardProps) {
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const activeProject = getActiveProject(session);
  const selectableProjects = useMemo(
    () =>
      session?.projectAccess?.projects?.filter(
        (project) =>
          project.status === 'ACTIVE' ||
          project.status === 'DRAFT' ||
          project.status === 'ON_HOLD',
      ) ?? [],
    [session?.projectAccess?.projects],
  );
  const canSwitch = selectableProjects.length > 1 || (!activeProject && selectableProjects.length > 0);

  if (!session) return null;

  const organizationName = session.activeOrganization?.name ?? 'No active organization';
  const projectName = activeProject?.name ?? (selectableProjects.length ? 'Select project' : 'No project available');

  if (featured) {
    return (
      <>
        <GlassCard variant="strong" style={styles.featuredCard}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.watermark}>
            <AppIcon color={mobileTheme.color.border.inverse} name="office-building-marker-outline" size={150} />
          </View>
          <View style={styles.featuredTopRow}>
            <View style={styles.featuredEyebrow}>
              <View style={styles.activeDot} />
              <Text style={styles.featuredEyebrowText}>{activeProject ? 'Active project' : 'Project context'}</Text>
            </View>
            {canSwitch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch project"
                style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
                onPress={() => setIsOpen(true)}
              >
                <AppIcon color={mobileTheme.color.text.inverse} name="swap-horizontal" size={mobileTheme.icon.md} />
                <Text style={styles.switchLabel}>Switch</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.featuredCopy}>
            <Text style={styles.featuredProject} numberOfLines={2}>{projectName}</Text>
            <Text style={styles.featuredOrganization} numberOfLines={1}>{organizationName}</Text>
          </View>

          <View style={styles.featuredFooter}>
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredMetaLabel}>Access</Text>
              <Text style={styles.featuredMetaValue} numberOfLines={1}>
                {activeProject?.roleLabel ?? session.projectAccess?.projectScope ?? 'Not assigned'}
              </Text>
            </View>
            {activeProject && onOpenProject ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${activeProject.name}`}
                onPress={onOpenProject}
                style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
              >
                <Text style={styles.openButtonLabel}>Open site</Text>
                <AppIcon color={mobileTheme.color.text.primary} name="arrow-right" size={mobileTheme.icon.md} />
              </Pressable>
            ) : null}
          </View>
        </GlassCard>

        <ProjectSwitcherSheet
          activeProjectId={session.activeProjectId}
          projects={selectableProjects}
          visible={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={!canSwitch}
        onPress={() => canSwitch && setIsOpen(true)}
      >
        <GlassCard variant={activeProject ? 'strong' : 'default'} style={[styles.card, compact && styles.compactCard]}>
          <View style={styles.cardHeader}>
            <IconContainer icon="folder-cog-outline" size="sm" variant={activeProject ? 'accent' : 'glass'} />
            <View style={styles.cardText}>
              <Text style={styles.organization} numberOfLines={1}>
                {organizationName}
              </Text>
              <Text style={styles.project} numberOfLines={1}>
                {projectName}
              </Text>
            </View>
            {canSwitch ? (
              <AppIcon color={mobileTheme.color.text.primary} name="chevron-down" size={mobileTheme.icon.sm} />
            ) : null}
          </View>
          {!compact ? (
            <View style={styles.metaRow}>
              <StatusBadge label={session.projectAccess?.projectScope === 'NONE' ? 'UNASSIGNED' : 'ASSIGNED'} />
              <Text style={styles.caption}>
                {selectableProjects.length
                  ? `${selectableProjects.length} working project${selectableProjects.length === 1 ? '' : 's'} available`
                  : 'Ask an admin for project access'}
              </Text>
            </View>
          ) : null}
        </GlassCard>
      </Pressable>

      <ProjectSwitcherSheet
        activeProjectId={session.activeProjectId}
        projects={selectableProjects}
        visible={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

type ProjectSwitcherSheetProps = {
  activeProjectId: string | null;
  projects: MobileProjectSummary[];
  visible: boolean;
  onClose: () => void;
};

function ProjectSwitcherSheet({
  activeProjectId,
  projects,
  visible,
  onClose,
}: ProjectSwitcherSheetProps) {
  const { switchActiveProject } = useSession();

  async function handleSelect(projectId: string) {
    await switchActiveProject(projectId);
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      title="Switch Project"
      description="Choose a Project for management or field work. Draft Projects remain management-only until activated."
      onClose={onClose}
    >
      {projects.map((project) => (
        <ListItem
          key={project.id}
          leading={<IconContainer icon="office-building-marker-outline" size="sm" />}
          title={project.name}
          subtitle={project.roleLabel ?? project.projectCode ?? 'Project access'}
          meta={project.id === activeProjectId ? 'Selected' : undefined}
          trailing={
            <View style={styles.switcherStatus}>
              <StatusBadge label={project.status} />
              {project.id === activeProjectId ? <AppIcon color={mobileTheme.color.status.success.foreground} name="check" size={mobileTheme.icon.sm} /> : null}
            </View>
          }
          onPress={() => handleSelect(project.id)}
        />
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  switcherStatus: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  featuredCard: {
    backgroundColor: mobileTheme.color.navigation.floating,
    borderColor: mobileTheme.color.border.inverse,
    gap: mobileTheme.spacing[6],
    minHeight: 286,
    overflow: 'hidden',
    padding: mobileTheme.spacing[6],
  },
  watermark: {
    bottom: -28,
    opacity: 0.5,
    position: 'absolute',
    right: -26,
    transform: [{ rotate: '-8deg' }],
  },
  featuredTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredEyebrow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
  },
  activeDot: {
    backgroundColor: mobileTheme.color.action.primary,
    borderRadius: mobileTheme.radius.full,
    height: 8,
    width: 8,
  },
  featuredEyebrowText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.inverse,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: mobileTheme.typography.letterSpacing.caps,
    textTransform: 'uppercase',
  },
  switchButton: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.border.inverse,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    minHeight: 48,
    paddingHorizontal: mobileTheme.spacing[3],
  },
  switchLabel: {
    ...mobileText.label,
    color: mobileTheme.color.text.inverse,
  },
  featuredCopy: {
    gap: mobileTheme.spacing[2],
    maxWidth: '86%',
  },
  featuredProject: {
    ...mobileText.display,
    color: mobileTheme.color.text.inverse,
    fontSize: 34,
    lineHeight: 39,
  },
  featuredOrganization: {
    ...mobileText.body,
    color: mobileTheme.color.text.inverse,
    opacity: 0.68,
  },
  featuredFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  featuredMeta: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  featuredMetaLabel: {
    ...mobileText.caption,
    color: mobileTheme.color.text.inverse,
    opacity: 0.56,
  },
  featuredMetaValue: {
    ...mobileText.label,
    color: mobileTheme.color.text.inverse,
    textTransform: 'capitalize',
  },
  openButton: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.background.elevated,
    borderRadius: mobileTheme.radius.full,
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    minHeight: 48,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  openButtonLabel: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
  },
  pressed: {
    opacity: 0.76,
  },
  card: {
    gap: mobileTheme.spacing[4],
  },
  compactCard: {
    paddingVertical: mobileTheme.spacing[4],
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  cardText: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  organization: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    textTransform: 'uppercase',
  },
  project: {
    ...mobileText.sectionTitle,
    fontSize: 20,
    lineHeight: 26,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[3],
  },
  caption: {
    ...mobileText.caption,
    flex: 1,
  },
});
