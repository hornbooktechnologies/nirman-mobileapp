import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  AppText,
  BottomSheet,
  getStatusTone,
  GlassCard,
  IconContainer,
  ListItem,
  StatusBadge,
} from '../../../components/ui';
import { getActiveProject, type MobileProjectSummary } from '../../../lib/auth';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';

const projectScopeTranslationKeys = {
  ALL: 'projectScope.ALL',
  ASSIGNED: 'projectScope.ASSIGNED',
  NONE: 'projectScope.NONE',
} as const;

const projectStatusTranslationKeys = {
  DRAFT: 'projectStatus.DRAFT',
  ACTIVE: 'projectStatus.ACTIVE',
  ON_HOLD: 'projectStatus.ON_HOLD',
  COMPLETED: 'projectStatus.COMPLETED',
  ARCHIVED: 'projectStatus.ARCHIVED',
} as const;

type ProjectContextCardProps = {
  compact?: boolean;
  featured?: boolean;
  onOpenProject?: () => void;
};

export function ProjectContextCard({ compact = false, featured = false, onOpenProject }: ProjectContextCardProps) {
  const { t } = useTranslation('home');
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

  const organizationName = session.activeOrganization?.name ?? t('projectContext.noActiveOrganization');
  const projectName = activeProject?.name ?? (
    selectableProjects.length ? t('projectContext.selectProject') : t('projectContext.noProjectAvailable')
  );
  const projectScope = session.projectAccess?.projectScope ?? 'NONE';
  const accessLabel = activeProject?.roleLabel ?? t(projectScopeTranslationKeys[projectScope]);

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
              <AppText style={styles.featuredEyebrowText} weight={700}>
                {activeProject ? t('projectContext.selectedProject') : t('projectContext.projectContext')}
              </AppText>
            </View>
            {canSwitch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('projectContext.switchProject')}
                style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
                onPress={() => setIsOpen(true)}
              >
                <AppIcon color={mobileTheme.color.text.inverse} name="swap-horizontal" size={mobileTheme.icon.md} />
                <AppText style={styles.switchLabel} weight={600}>{t('projectContext.switch')}</AppText>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.featuredCopy}>
            <AppText style={styles.featuredProject} numberOfLines={2} weight={700}>{projectName}</AppText>
            <AppText style={styles.featuredOrganization} numberOfLines={1} weight={500}>{organizationName}</AppText>
          </View>

          <View style={styles.featuredFooter}>
            <View style={styles.featuredMeta}>
              <AppText style={styles.featuredMetaLabel} weight={500}>{t('projectContext.access')}</AppText>
              <AppText style={styles.featuredMetaValue} numberOfLines={2} weight={600}>{accessLabel}</AppText>
            </View>
            {activeProject && onOpenProject ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('projectContext.openNamedProject', { project: activeProject.name })}
                onPress={onOpenProject}
                style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
              >
                <AppText style={styles.openButtonLabel} weight={600}>{t('projectContext.openProject')}</AppText>
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
        accessibilityLabel={`${organizationName}, ${projectName}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSwitch }}
        disabled={!canSwitch}
        onPress={() => canSwitch && setIsOpen(true)}
      >
        <GlassCard variant={activeProject ? 'strong' : 'default'} style={[styles.card, compact && styles.compactCard]}>
          <View style={styles.cardHeader}>
            <IconContainer icon="folder-cog-outline" size="sm" variant={activeProject ? 'accent' : 'glass'} />
            <View style={styles.cardText}>
              <AppText style={styles.organization} numberOfLines={1} weight={500}>
                {organizationName}
              </AppText>
              <AppText style={styles.project} numberOfLines={1} weight={700}>
                {projectName}
              </AppText>
            </View>
            {canSwitch ? (
              <AppIcon color={mobileTheme.color.text.primary} name="chevron-down" size={mobileTheme.icon.sm} />
            ) : null}
          </View>
          {!compact ? (
            <View style={styles.metaRow}>
              <StatusBadge
                label={projectScope === 'NONE' ? t('projectContext.unassigned') : t('projectContext.assigned')}
                tone={getStatusTone(projectScope === 'NONE' ? 'UNASSIGNED' : 'ASSIGNED')}
              />
              <AppText style={styles.caption} weight={500}>
                {selectableProjects.length
                  ? t('projectContext.workingProjects', { count: selectableProjects.length })
                  : t('projectContext.askAdministrator')}
              </AppText>
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
  const { t } = useTranslation('home');
  const { switchActiveProject } = useSession();

  async function handleSelect(projectId: string) {
    await switchActiveProject(projectId);
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      title={t('projectContext.pickerTitle')}
      description={t('projectContext.pickerDescription')}
      onClose={onClose}
    >
      {projects.map((project) => (
        <ListItem
          key={project.id}
          leading={<IconContainer icon="office-building-marker-outline" size="sm" />}
          title={project.name}
          subtitle={project.roleLabel ?? project.projectCode ?? t('projectContext.projectAccess')}
          meta={project.id === activeProjectId ? t('projectContext.selected') : undefined}
          trailing={
            <View style={styles.switcherStatus}>
              <StatusBadge
                label={t(projectStatusTranslationKeys[project.status])}
                tone={getStatusTone(project.status)}
              />
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
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[3],
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
  },
  switchButton: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.border.inverse,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.component.button.radius,
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
    flexWrap: 'wrap',
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
  },
  openButton: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.background.elevated,
    borderRadius: mobileTheme.component.button.radius,
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
