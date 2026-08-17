import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  GradientScreen,
  IconButton,
  Input,
  LoadingState,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import {
  createAssignmentDraft,
  ProjectAssignmentEditor,
  type ProjectAssignmentDraft,
} from '../members/project-assignment-editor';
import {
  assignProjectMember,
  fetchOrganizationMemberRoles,
  fetchOrganizationMembers,
  fetchProjectMembers,
  unassignProjectMember,
  updateProjectMember,
} from '../members/services';
import type {
  OrganizationMember,
  OrganizationMemberRole,
  ProjectMember,
  ProjectMemberInput,
} from '../members/types';
import { WorkersPanel } from '../workers/workers-screen';

export function ProjectTeamScreen() {
  const { refreshSession, session, signOut } = useSession();
  const params = useLocalSearchParams<{ projectId?: string; tab?: string }>();
  const project =
    session?.projectAccess.projects.find((candidate) => candidate.id === params.projectId) ??
    getActiveProject(session);
  const permissions = project?.permissions ?? getActiveProjectPermissions(session);
  const canReadMembers = permissions.includes('project-members:read');
  const canAssignMembers = permissions.includes('project-members:assign');
  const canUpdateMembers = permissions.includes('project-members:update');
  const canUnassignMembers = permissions.includes('project-members:unassign');
  const canReadWorkers = permissions.includes('workers:read');
  const [tab, setTab] = useState<'members' | 'workers'>(params.tab === 'workers' && canReadWorkers ? 'workers' : canReadMembers ? 'members' : 'workers');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [roles, setRoles] = useState<OrganizationMemberRole[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [actionMember, setActionMember] = useState<ProjectMember | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken || !session.activeOrganization || !project) return;
    setLoading(true);
    setError('');
    try {
      const [projectMembers, memberRows, roleRows] = await Promise.all([
        canReadMembers
          ? fetchProjectMembers(session.activeOrganization.id, project.id, session.accessToken)
          : Promise.resolve([]),
        canAssignMembers
          ? fetchOrganizationMembers(session.activeOrganization.id, session.accessToken)
          : Promise.resolve([]),
        canAssignMembers || canUpdateMembers
          ? fetchOrganizationMemberRoles(session.activeOrganization.id, session.accessToken)
          : Promise.resolve([]),
      ]);
      setMembers(projectMembers);
      setOrganizationMembers(memberRows);
      setRoles(roleRows);
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 401) {
        await signOut();
        return;
      }
      if (loadError instanceof ApiRequestError && loadError.status === 403) {
        await refreshSession().catch(() => undefined);
      }
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Project Team');
    } finally {
      setLoading(false);
    }
  }, [canAssignMembers, canReadMembers, canUpdateMembers, project, refreshSession, session?.accessToken, session?.activeOrganization, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleMembers = members.filter((member) => {
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      member.user.name.toLowerCase().includes(needle) ||
      member.user.email?.toLowerCase().includes(needle) ||
      member.role.name.toLowerCase().includes(needle) ||
      member.roleLabel?.toLowerCase().includes(needle)
    );
  });

  const availableMembers = useMemo(() => {
    const assignedIds = new Set(members.map((member) => member.memberId));
    return organizationMembers.filter(
      (member) => member.status === 'ACTIVE' && !assignedIds.has(member.id),
    );
  }, [members, organizationMembers]);

  async function saveNewMember(memberId: string, input: ProjectMemberInput) {
    if (!session?.accessToken || !session.activeOrganization || !project) return;
    setSaving(true);
    try {
      await assignProjectMember(
        session.activeOrganization.id,
        project.id,
        memberId,
        session.accessToken,
        input,
      );
      setShowAssign(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveEditedMember(input: ProjectMemberInput) {
    if (!session?.accessToken || !session.activeOrganization || !project || !editingMember) return;
    setSaving(true);
    try {
      await updateProjectMember(
        session.activeOrganization.id,
        project.id,
        editingMember.memberId,
        session.accessToken,
        input,
      );
      setEditingMember(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function confirmUnassign(member: ProjectMember) {
    Alert.alert(
      'End project assignment?',
      `${member.user.name} will lose this project’s access. Their organization membership remains active.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End assignment', style: 'destructive', onPress: () => void unassign(member) },
      ],
    );
  }

  async function unassign(member: ProjectMember) {
    if (!session?.accessToken || !session.activeOrganization || !project) return;
    setSaving(true);
    try {
      await unassignProjectMember(
        session.activeOrganization.id,
        project.id,
        member.memberId,
        session.accessToken,
      );
      setActionMember(null);
      await load();
    } catch (unassignError) {
      Alert.alert('Assignment not ended', errorMessage(unassignError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <GradientScreen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" accessibilityLabel="Back" variant="glass" onPress={() => router.back()} />
        <View style={styles.titleCopy}>
          <Text style={styles.title}>Project Team</Text>
          <Text style={styles.caption}>{project?.name ?? 'Select a project'}</Text>
        </View>
        {tab === 'members' && canAssignMembers ? (
          <IconButton icon="account-plus-outline" accessibilityLabel="Assign project member" variant="primary" onPress={() => setShowAssign(true)} />
        ) : <View style={styles.spacer} />}
      </View>

      <View style={styles.tabs}>
        {canReadMembers ? <Button label={`Members ${members.length}`} size="sm" variant={tab === 'members' ? 'dark' : 'outline'} fullWidth={false} onPress={() => setTab('members')} /> : null}
        {canReadWorkers ? <Button label="Workers" size="sm" variant={tab === 'workers' ? 'dark' : 'outline'} fullWidth={false} onPress={() => setTab('workers')} /> : null}
      </View>

      {tab === 'members' ? (
        <>
          <Input accessibilityLabel="Search assigned members" placeholder="Search assigned members" value={search} onChangeText={setSearch} />
          {loading ? <LoadingState label="Loading Project Team" /> : null}
          {error ? <EmptyState title="Team unavailable" description={error} actionLabel="Retry" onAction={() => void load()} /> : null}
          {!loading && !error ? (
            visibleMembers.length ? (
              <View style={styles.list}>
                {visibleMembers.map((member) => (
                  <Card key={member.id} style={styles.memberCard}>
                    <View style={styles.memberHeader}>
                      <View style={styles.memberCopy}>
                        <Text style={styles.memberName}>{member.user.name}</Text>
                        <Text style={styles.caption}>{member.role.name}{member.roleLabel ? ` · ${member.roleLabel}` : ''}</Text>
                      </View>
                      {(canUpdateMembers || canUnassignMembers) ? (
                        <IconButton icon="dots-horizontal" accessibilityLabel={`Actions for ${member.user.name}`} variant="ghost" onPress={() => setActionMember(member)} />
                      ) : null}
                    </View>
                    <View style={styles.badges}>
                      <Badge label={member.status} tone={member.status === 'ACTIVE' ? 'active' : 'warning'} />
                      <Badge label={member.permissionMode === 'CUSTOM' ? `${member.grantedPermissions.length} custom actions` : 'Role defaults'} tone={member.permissionMode === 'CUSTOM' ? 'warning' : 'neutral'} />
                    </View>
                    <Text style={styles.caption}>Access {formatDateRange(member.startsOn, member.endsOn)}</Text>
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState title={search ? 'No matching members' : 'No Project Members'} description={search ? 'Try another search.' : 'Assign an active organization member to this project.'} actionLabel={!search && canAssignMembers ? 'Assign Member' : undefined} onAction={!search && canAssignMembers ? () => setShowAssign(true) : undefined} />
            )
          ) : null}
        </>
      ) : null}

      {tab === 'workers' && canReadWorkers ? <WorkersPanel embedded projectIdOverride={project?.id} /> : null}

      {showAssign ? (
        <ProjectMemberEditorSheet mode="assign" availableMembers={availableMembers} roles={roles} saving={saving} onClose={() => setShowAssign(false)} onSave={saveNewMember} />
      ) : null}

      {editingMember ? (
        <ProjectMemberEditorSheet mode="edit" member={editingMember} roles={roles} saving={saving} onClose={() => setEditingMember(null)} onSave={async (_memberId, input) => saveEditedMember(input)} />
      ) : null}

      {actionMember ? (
        <BottomSheet visible title={actionMember.user.name} description={`${actionMember.role.name} · ${actionMember.status}`} onClose={() => setActionMember(null)}>
          {canUpdateMembers ? <ActionRow icon="account-edit-outline" label="Edit assignment and permissions" onPress={() => { setActionMember(null); setEditingMember(actionMember); }} /> : null}
          {canUnassignMembers ? <ActionRow icon="account-minus-outline" label="End project assignment" destructive disabled={saving} onPress={() => confirmUnassign(actionMember)} /> : null}
        </BottomSheet>
      ) : null}
    </GradientScreen>
  );
}

function ProjectMemberEditorSheet({ mode, member, availableMembers = [], roles, saving, onClose, onSave }: {
  mode: 'assign' | 'edit';
  member?: ProjectMember;
  availableMembers?: OrganizationMember[];
  roles: OrganizationMemberRole[];
  saving: boolean;
  onClose: () => void;
  onSave: (memberId: string, input: ProjectMemberInput) => Promise<void>;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(member?.memberId ?? '');
  const [memberSearch, setMemberSearch] = useState('');
  const [draft, setDraft] = useState<ProjectAssignmentDraft>(() => createAssignmentDraft(member));
  const [error, setError] = useState('');
  const selectedOrganizationMember = availableMembers.find((candidate) => candidate.id === selectedMemberId);
  const roleId = member?.role.id ?? selectedOrganizationMember?.roleId;
  const rolePermissions = roles.find((role) => role.id === roleId)?.permissions ?? [];
  const filteredMembers = availableMembers.filter((candidate) => {
    const needle = memberSearch.trim().toLowerCase();
    return !needle || candidate.user?.name.toLowerCase().includes(needle) || candidate.role?.name.toLowerCase().includes(needle);
  });

  async function submit() {
    setError('');
    if (!selectedMemberId) {
      setError('Select an active organization member.');
      return;
    }
    if (draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn) {
      setError('End date cannot be before start date.');
      return;
    }
    try {
      await onSave(selectedMemberId, {
        roleLabel: draft.roleLabel.trim() || null,
        permissionMode: draft.permissionMode,
        permissions: draft.permissionMode === 'CUSTOM' ? draft.permissions : [],
        status: draft.status,
        startsOn: draft.startsOn || null,
        endsOn: draft.endsOn || null,
      });
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title={mode === 'assign' ? 'Assign project member' : `Edit ${member?.user.name ?? 'member'}`} description="Responsibility is a readable label. Permissions control what the member can actually do." onClose={onClose} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? 'Saving' : mode === 'assign' ? 'Assign member' : 'Save assignment'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      {mode === 'assign' ? (
        <View style={styles.memberPicker}>
          <Text style={styles.fieldLabel}>Select organization member</Text>
          <Input accessibilityLabel="Search organization members" placeholder="Search active members" value={memberSearch} onChangeText={setMemberSearch} />
          <View style={styles.pickerList}>
            {filteredMembers.map((candidate) => {
              const selected = candidate.id === selectedMemberId;
              return (
                <Pressable key={candidate.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={[styles.pickerRow, selected && styles.pickerRowSelected]} onPress={() => setSelectedMemberId(candidate.id)}>
                  <View style={styles.memberCopy}><Text style={styles.memberName}>{candidate.user?.name ?? 'Member'}</Text><Text style={styles.caption}>{candidate.role?.name ?? 'Organization role'}</Text></View>
                  {selected ? <AppIcon name="check-circle" size={22} color={mobileTheme.color.action.primary} /> : null}
                </Pressable>
              );
            })}
            {!filteredMembers.length ? <Text style={styles.caption}>No unassigned active members match.</Text> : null}
          </View>
        </View>
      ) : null}
      {(mode === 'edit' || selectedMemberId) ? <ProjectAssignmentEditor value={draft} rolePermissions={rolePermissions} onChange={setDraft} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </BottomSheet>
  );
}

function ActionRow({ icon, label, destructive = false, disabled = false, onPress }: { icon: Parameters<typeof AppIcon>[0]['name']; label: string; destructive?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} style={[styles.actionRow, disabled && styles.disabled]} onPress={onPress}><AppIcon name={icon} size={24} color={destructive ? mobileTheme.color.status.danger.foreground : mobileTheme.color.text.primary} /><Text style={[styles.actionLabel, destructive && styles.destructive]}>{label}</Text><AppIcon name="chevron-right" size={22} color={mobileTheme.color.text.muted} /></Pressable>;
}

function formatDateRange(startsOn: string | null, endsOn: string | null) {
  if (!startsOn && !endsOn) return 'without a date limit';
  return `${startsOn?.slice(0, 10) ?? 'now'} to ${endsOn?.slice(0, 10) ?? 'ongoing'}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  titleCopy: { alignItems: 'center', flex: 1 },
  spacer: { width: 50 },
  title: { ...mobileText.sectionTitle, fontSize: 22 },
  caption: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  tabs: { flexDirection: 'row', gap: mobileTheme.spacing[2] },
  list: { gap: mobileTheme.spacing[3] },
  memberCard: { gap: mobileTheme.spacing[3] },
  memberHeader: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  memberCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  memberName: { ...mobileText.sectionTitle, fontSize: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  memberPicker: { gap: mobileTheme.spacing[2] },
  fieldLabel: { ...mobileText.label, color: mobileTheme.color.text.primary },
  pickerList: { gap: mobileTheme.spacing[2] },
  pickerRow: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 64, padding: mobileTheme.spacing[3] },
  pickerRowSelected: { backgroundColor: mobileTheme.color.surface.mist, borderColor: mobileTheme.color.border.selected },
  footerButton: { flex: 1 },
  errorText: { ...mobileText.caption, color: mobileTheme.color.status.danger.foreground },
  actionRow: { alignItems: 'center', borderBottomColor: mobileTheme.color.border.subtle, borderBottomWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 60, paddingVertical: mobileTheme.spacing[2] },
  actionLabel: { ...mobileText.label, color: mobileTheme.color.text.primary, flex: 1, fontSize: 16 },
  destructive: { color: mobileTheme.color.status.danger.foreground },
  disabled: { opacity: 0.5 },
});
