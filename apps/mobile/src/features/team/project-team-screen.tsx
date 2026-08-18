import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  ActionListItem,
  Badge,
  BottomSheet,
  Button,
  CollectionPickerModal,
  CompactScreenHeader,
  EmptyState,
  GradientScreen,
  IconButton,
  LoadingState,
  OperationalEntityCard,
  SearchField,
  StatusBadge,
  getStatusTone,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
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
    <GradientScreen footer={<CustomerTabBar activeKey="team" />}>
      <CompactScreenHeader
        action={tab === 'members' && canAssignMembers ? <IconButton icon="account-plus-outline" accessibilityLabel="Assign project member" variant="primary" onPress={() => setShowAssign(true)} /> : undefined}
        leading={<IconButton icon="arrow-left" accessibilityLabel="Back" variant="glass" onPress={() => router.back()} />}
        subtitle={project?.name ?? 'Choose a project'}
        title="Team"
      />

      <View style={styles.tabs}>
        {canReadMembers ? <Button label={`Members ${members.length}`} size="sm" variant={tab === 'members' ? 'dark' : 'outline'} fullWidth={false} onPress={() => setTab('members')} /> : null}
        {canReadWorkers ? <Button label="Workers" size="sm" variant={tab === 'workers' ? 'dark' : 'outline'} fullWidth={false} onPress={() => setTab('workers')} /> : null}
      </View>

      {tab === 'members' ? (
        <>
          <SearchField accessibilityLabel="Search assigned members" placeholder="Search name, role or responsibility" value={search} onChangeText={setSearch} />
          {loading ? <LoadingState label="Loading Project Team" /> : null}
          {error ? <EmptyState title="Team unavailable" description={error} actionLabel="Retry" onAction={() => void load()} /> : null}
          {!loading && !error ? (
            visibleMembers.length ? (
              <View style={styles.list}>
                {visibleMembers.map((member) => (
                  <OperationalEntityCard
                    accessibilityLabel={`${member.user.name}, ${member.role.name}, ${member.roleLabel ?? 'project member'}, ${member.status}, ${member.permissionMode === 'CUSTOM' ? `${member.grantedPermissions.length} custom actions` : 'role defaults'}`}
                    contextLeading={member.role.name}
                    contextTrailing={member.roleLabel ?? 'Project member'}
                    footerLeading={formatDateRange(member.startsOn, member.endsOn)}
                    footerTrailing={<StatusBadge label={member.status} />}
                    key={member.id}
                    onPress={(canUpdateMembers || canUnassignMembers) ? () => setActionMember(member) : undefined}
                    supporting={member.user.email ?? 'No email'}
                    title={member.user.name}
                    tone={getStatusTone(member.status)}
                  />
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
          {canUpdateMembers ? <ActionListItem icon="account-edit-outline" label="Edit assignment and permissions" tone="brand" onPress={() => { setActionMember(null); setEditingMember(actionMember); }} /> : null}
          {canUnassignMembers ? <ActionListItem icon="account-minus-outline" label="End project assignment" tone="danger" disabled={saving} onPress={() => confirmUnassign(actionMember)} /> : null}
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
  const [pickerVisible, setPickerVisible] = useState(false);
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
    <>
    <BottomSheet visible={!pickerVisible} scroll showCloseButton={false} title={mode === 'assign' ? 'Set project access' : member?.user.name ?? 'Edit access'} description={mode === 'assign' ? 'Choose a member, then confirm responsibility, dates and permissions.' : 'Edit responsibility, dates and permissions for this project.'} onClose={onClose} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? 'Saving…' : mode === 'assign' ? 'Assign' : 'Save changes'} variant={mode === 'assign' ? 'primary' : 'brand'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      {mode === 'assign' ? (
        <View style={styles.memberPicker}>
          <Text style={styles.fieldLabel}>Member</Text>
          {selectedOrganizationMember ? (
            <OperationalEntityCard
              accessibilityLabel={`${selectedOrganizationMember.user?.name ?? 'Member'}, selected. Change member`}
              contextLeading={selectedOrganizationMember.role?.name ?? 'Organization member'}
              contextTrailing="Selected"
              footerLeading={selectedOrganizationMember.user?.email ?? 'Active organization member'}
              footerTrailing={<Badge label="CHANGE" tone="info" />}
              onPress={() => setPickerVisible(true)}
              supporting={selectedOrganizationMember.designation ?? 'Project assignment candidate'}
              title={selectedOrganizationMember.user?.name ?? 'Member'}
            />
          ) : (
            <Button label="Choose member" leadingIcon="account-search-outline" variant="info" onPress={() => setPickerVisible(true)} />
          )}
        </View>
      ) : null}
      {(mode === 'edit' || selectedMemberId) ? <ProjectAssignmentEditor value={draft} rolePermissions={rolePermissions} onChange={setDraft} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </BottomSheet>
    <CollectionPickerModal
      accessibilityLabel="Search organization members"
      data={filteredMembers}
      emptyDescription={memberSearch ? 'Try another name or role.' : 'Every active member is already assigned to this project.'}
      emptyTitle={memberSearch ? 'No matching members' : 'No members available'}
      keyExtractor={(candidate) => candidate.id}
      renderItem={({ item: candidate }) => (
        <OperationalEntityCard
          accessibilityLabel={`Select ${candidate.user?.name ?? 'member'}, ${candidate.role?.name ?? 'organization member'}`}
          contextLeading={candidate.role?.name ?? 'Organization member'}
          contextTrailing={candidate.status}
          footerLeading={candidate.user?.email ?? 'No email'}
          footerTrailing={candidate.id === selectedMemberId ? <StatusBadge label="SELECTED" /> : <AppIcon name="chevron-right" size={20} color={mobileTheme.color.text.muted} />}
          onPress={() => {
            setSelectedMemberId(candidate.id);
            setPickerVisible(false);
          }}
          supporting={candidate.designation ?? 'Available for project assignment'}
          title={candidate.user?.name ?? 'Member'}
          tone={getStatusTone(candidate.status)}
        />
      )}
      searchPlaceholder="Search name or role"
      searchValue={memberSearch}
      subtitle="Active members not yet assigned"
      title="Choose member"
      visible={pickerVisible}
      onClose={() => setPickerVisible(false)}
      onSearchChange={setMemberSearch}
    />
    </>
  );
}

function formatDateRange(startsOn: string | null, endsOn: string | null) {
  if (!startsOn && !endsOn) return 'without a date limit';
  return `${startsOn?.slice(0, 10) ?? 'now'} → ${endsOn?.slice(0, 10) ?? 'ongoing'}`;
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
  disabled: { opacity: 0.5 },
});
