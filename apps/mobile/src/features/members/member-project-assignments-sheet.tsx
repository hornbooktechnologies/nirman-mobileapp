import type { PermissionKey, ProjectStatus } from '@nirman-app/shared';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Badge,
  BottomSheet,
  Button,
  Card,
  Input,
} from '../../components/ui';
import { mobileText, mobileTheme } from '../../theme';
import {
  createAssignmentDraft,
  ProjectAssignmentEditor,
  type ProjectAssignmentDraft,
} from './project-assignment-editor';
import type {
  OrganizationMember,
  OrganizationProjectAssignmentsOverview,
  SaveMemberProjectAssignmentsInput,
} from './types';

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
    const invalidProject = selectedProjects.find((project) => {
      const draft = drafts[project.id];
      return draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn;
    });
    if (invalidProject) {
      setError(`End date cannot be before start date for ${invalidProject.name}.`);
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
      setError(saveError instanceof Error ? saveError.message : 'Unable to save assignments');
    }
  }

  return (
    <BottomSheet
      visible
      scroll
      showCloseButton={false}
      title={configuringProject ? configuringProject.name : `Projects · ${member.user?.name ?? 'Member'}`}
      description={
        configuringProject
          ? 'Set this project’s responsibility, dates, status, and allowed actions.'
          : 'Select one or more projects. Configure details only where they need to differ.'
      }
      onClose={onClose}
      footer={
        configuringProject ? (
          <Button label="Back to projects" variant="secondary" onPress={() => setConfiguringProjectId(null)} />
        ) : (
          <>
            <Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} />
            <Button
              label={saving ? 'Saving' : 'Save assignments'}
              disabled={saving}
              style={styles.footerButton}
              onPress={() => void save()}
            />
          </>
        )
      }
    >
      {configuringProject ? (
        <ProjectAssignmentEditor
          value={drafts[configuringProject.id]}
          rolePermissions={rolePermissions}
          onChange={(draft) =>
            setDrafts((current) => ({ ...current, [configuringProject.id]: draft }))
          }
        />
      ) : (
        <View style={styles.content}>
          <View style={styles.summaryRow}>
            <Badge label={`${selectedIds.length} selected`} tone={selectedIds.length ? 'active' : 'neutral'} />
            <Text style={styles.caption}>Changes save together</Text>
          </View>
          <Input
            accessibilityLabel="Search projects"
            placeholder="Search projects"
            value={search}
            onChangeText={setSearch}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
                      <Text style={styles.projectName}>{project.name}</Text>
                      <Text style={styles.caption}>{project.projectCode ?? 'No project code'}</Text>
                      <View style={styles.badges}>
                        <Badge label={project.status} tone={writable ? 'neutral' : 'warning'} />
                        {assigned ? <Badge label="Assigned" tone="info" /> : null}
                      </View>
                    </View>
                  </Pressable>
                  {selected && writable ? (
                    <Button
                      label="Configure access"
                      size="sm"
                      variant="outline"
                      onPress={() => setConfiguringProjectId(project.id)}
                    />
                  ) : null}
                </Card>
              );
            })}
            {!visibleProjects.length ? (
              <Text style={styles.empty}>No projects match your search.</Text>
            ) : null}
          </View>
          <Text style={styles.caption}>
            Completed and archived projects remain visible for history and cannot be changed.
          </Text>
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
  error: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
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
