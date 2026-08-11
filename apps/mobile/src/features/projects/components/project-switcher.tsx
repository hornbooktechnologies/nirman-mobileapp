import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Badge,
  BottomSheet,
  GlassCard,
  IconContainer,
  ListItem,
} from '../../../components/ui';
import { getActiveProject, type MobileProjectSummary } from '../../../lib/auth';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';

type ProjectContextCardProps = {
  compact?: boolean;
};

export function ProjectContextCard({ compact = false }: ProjectContextCardProps) {
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const activeProject = getActiveProject(session);
  const activeProjects = useMemo(
    () => session?.projectAccess?.projects?.filter((project) => project.status === 'ACTIVE') ?? [],
    [session?.projectAccess?.projects],
  );
  const canSwitch = activeProjects.length > 1;

  if (!session) return null;

  const organizationName = session.activeOrganization?.name ?? 'No active organization';
  const projectName = activeProject?.name ?? (activeProjects.length ? 'Select project' : 'No active project');

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
              <Badge label={session.projectAccess?.projectScope ?? 'NONE'} tone={session.projectAccess?.projectScope === 'NONE' ? 'warning' : 'active'} />
              <Text style={styles.caption}>
                {activeProjects.length
                  ? `${activeProjects.length} active project${activeProjects.length === 1 ? '' : 's'} available`
                  : 'Ask an admin for project access'}
              </Text>
            </View>
          ) : null}
        </GlassCard>
      </Pressable>

      <ProjectSwitcherSheet
        activeProjectId={session.activeProjectId}
        projects={activeProjects}
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
      description="Choose the project context for field work."
      onClose={onClose}
    >
      {projects.map((project) => (
        <ListItem
          key={project.id}
          leading={<IconContainer icon="office-building-marker-outline" size="sm" />}
          title={project.name}
          subtitle={project.roleLabel ?? project.projectCode ?? 'Field access'}
          meta={project.id === activeProjectId ? 'Active' : undefined}
          trailing={
            project.id === activeProjectId ? (
              <AppIcon color={mobileTheme.color.action.primary} name="check" size={mobileTheme.icon.sm} />
            ) : null
          }
          onPress={() => handleSelect(project.id)}
        />
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
