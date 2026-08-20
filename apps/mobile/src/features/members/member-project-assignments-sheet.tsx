import type { PermissionKey, ProjectStatus } from '@nirman-app/shared';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  AppText,
  Badge,
  BottomSheet,
  Button,
  Card,
  FormError,
  Input,
  StatusBadge,
} from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { mobileText, mobileTheme } from '../../theme';
import {
  createAssignmentDraft,
  ProjectAssignmentEditor,
  type ProjectAssignmentDraft,
  type ProjectAssignmentFieldErrors,
} from './project-assignment-editor';
import type {
  OrganizationMember,
  OrganizationProjectAssignmentsOverview,
  SaveMemberProjectAssignmentsInput,
} from './types';

const projectStatusTranslationKeys = {
  DRAFT: 'projectStatus.DRAFT',
  ACTIVE: 'projectStatus.ACTIVE',
  ON_HOLD: 'projectStatus.ON_HOLD',
  COMPLETED: 'projectStatus.COMPLETED',
  ARCHIVED: 'projectStatus.ARCHIVED',
} as const;

function isWritableProject(status: ProjectStatus) {
  return status !== 'ARCHIVED' && status !== 'COMPLETED';
}

export function MemberProjectAssignmentsSheet({
  member,
  overview,
  rolePermissions,
  saving,
  onClose,
  onSave,
}: {
  member: OrganizationMember;
  overview: OrganizationProjectAssignmentsOverview;
  rolePermissions: PermissionKey[];
  saving: boolean;
  onClose: () => void;
  onSave: (input: SaveMemberProjectAssignmentsInput) => Promise<void>;
}) {
  const { t } = useTranslation('members');
  const memberAssignments = useMemo(
    () => overview.assignments.filter((assignment) => assignment.memberId === member.id),
    [member.id, overview.assignments],
  );
  const initialByProject = useMemo(
    () => new Map(memberAssignments.map((assignment) => [assignment.projectId, assignment])),
    [memberAssignments],
  );
  const [selectedIds, setSelectedIds] = useState(
    memberAssignments.map((assignment) => assignment.projectId),
  );
  const [drafts, setDrafts] = useState<Record<string, ProjectAssignmentDraft>>(() =>
    Object.fromEntries(
      overview.projects.map((project) => [
        project.id,
        createAssignmentDraft(initialByProject.get(project.id)),
      ]),
    ),
  );
  const [configuringProjectId, setConfiguringProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [fieldErrorsByProject, setFieldErrorsByProject] = useState<Record<string, ProjectAssignmentFieldErrors>>({});

  const visibleProjects = overview.projects.filter((project) => {
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      project.name.toLowerCase().includes(needle) ||
      project.projectCode?.toLowerCase().includes(needle)
    );
  });
  const selectedProjects = overview.projects.filter((project) => selectedIds.includes(project.id));
  const configuringProject = overview.projects.find((project) => project.id === configuringProjectId);

  function toggleProject(projectId: string) {
    setSelectedIds((current) =>
      current.includes(projectId)
        ? current.filter((candidate) => candidate !== projectId)
        : [...current, projectId],
    );
  }

  async function save() {
    setError('');
    setFieldErrorsByProject({});
    const invalidProject = selectedProjects.find((project) => {
      const draft = drafts[project.id];
      return draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn;
    });
    if (invalidProject) {
      setFieldErrorsByProject({
        [invalidProject.id]: { endsOn: t('assignments.dateOrder') },
      });
      setConfiguringProjectId(invalidProject.id);
      return;
    }

    const input: SaveMemberProjectAssignmentsInput = {
      assignments: selectedProjects
        .filter((project) => isWritableProject(project.status))
        .map((project) => {
          const draft = drafts[project.id];
          return {
            projectId: project.id,
            roleLabel: draft.roleLabel.trim() || null,
            permissionMode: draft.permissionMode,
            permissions: draft.permissionMode === 'CUSTOM' ? draft.permissions : [],
            status: draft.status,
            startsOn: draft.startsOn || null,
            endsOn: draft.endsOn || null,
          };
        }),
      unassignProjectIds: memberAssignments
        .filter(
          (assignment) =>
            !selectedIds.includes(assignment.projectId) &&
            isWritableProject(assignment.project.status),
        )
        .map((assignment) => assignment.projectId),
    };

    try {
      await onSave(input);
    } catch (saveError) {
      setError(getLocalizedErrorMessage(saveError, t('assignments.saveFailed')));
    }
  }

  return (
    <BottomSheet
      visible
      scroll
      showCloseButton={false}
      title={configuringProject ? configuringProject.name : t('assignments.title', { name: member.user?.name ?? t('assignments.member') })}
      description={
        configuringProject
          ? t('assignments.configureDescription')
          : t('assignments.description')
      }
      onClose={onClose}
      footer={
        configuringProject ? (
          <Button label={t('assignments.back')} variant="secondary" onPress={() => setConfiguringProjectId(null)} />
        ) : (
          <>
            <Button label={t('assignments.cancel')} variant="secondary" style={styles.footerButton} onPress={onClose} />
            <Button
              label={saving ? t('assignments.saving') : t('assignments.save')}
              variant="brand"
              disabled={saving}
              style={styles.footerButton}
              onPress={() => void save()}
            />
          </>
        )
      }
    >
      <FormError message={error} />
      {configuringProject ? (
        <ProjectAssignmentEditor
          value={drafts[configuringProject.id]}
          rolePermissions={rolePermissions}
          errors={fieldErrorsByProject[configuringProject.id]}
          onChange={(draft) => {
            setDrafts((current) => ({ ...current, [configuringProject.id]: draft }));
            setFieldErrorsByProject((current) => ({ ...current, [configuringProject.id]: {} }));
          }}
        />
      ) : (
        <View style={styles.content}>
          <View style={styles.summaryRow}>
            <Badge label={t('assignments.selected', { count: selectedIds.length })} tone={selectedIds.length ? 'info' : 'neutral'} />
            <AppText style={styles.caption} weight={500}>{t('assignments.saveTogether')}</AppText>
          </View>
          <Input
            accessibilityLabel={t('assignments.searchA11y')}
            placeholder={t('assignments.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.projectList}>
            {visibleProjects.map((project) => {
              const selected = selectedIds.includes(project.id);
              const assigned = initialByProject.has(project.id);
              const writable = isWritableProject(project.status);
              return (
                <Card key={project.id} style={styles.projectCard}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: !writable }}
                    disabled={!writable}
                    style={styles.projectSelect}
                    onPress={() => toggleProject(project.id)}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected ? (
                        <AppIcon name="check" size={18} color={mobileTheme.color.text.inverse} />
                      ) : null}
                    </View>
                    <View style={styles.projectCopy}>
                      <AppText style={styles.projectName} weight={700}>{project.name}</AppText>
                      <AppText style={styles.caption} weight={500}>{project.projectCode ?? t('assignments.noCode')}</AppText>
                      <View style={styles.badges}>
                        <StatusBadge label={t(projectStatusTranslationKeys[project.status])} />
                        {assigned ? <StatusBadge label={t('assignments.assigned')} /> : null}
                      </View>
                    </View>
                  </Pressable>
                  {selected && writable ? (
                    <Button
                      label={t('assignments.configure')}
                      size="sm"
                      variant="info"
                      onPress={() => setConfiguringProjectId(project.id)}
                    />
                  ) : null}
                </Card>
              );
            })}
            {!visibleProjects.length ? (
              <AppText style={styles.empty}>{t('assignments.noMatch')}</AppText>
            ) : null}
          </View>
          <AppText style={styles.caption} weight={500}>{t('assignments.historyNote')}</AppText>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: mobileTheme.spacing[3],
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caption: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  projectList: {
    gap: mobileTheme.spacing[3],
  },
  projectCard: {
    gap: mobileTheme.spacing[3],
  },
  projectSelect: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 54,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.sm,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  checkboxSelected: {
    backgroundColor: mobileTheme.color.action.primary,
    borderColor: mobileTheme.color.action.primary,
  },
  projectCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  projectName: {
    ...mobileText.sectionTitle,
    fontSize: 17,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
    marginTop: mobileTheme.spacing[1],
  },
  empty: {
    ...mobileText.body,
    paddingVertical: mobileTheme.spacing[5],
    textAlign: 'center',
  },
  footerButton: {
    flex: 1,
  },
});
