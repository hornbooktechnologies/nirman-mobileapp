import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  AppText,
  ActionListItem,
  Badge,
  BottomSheet,
  Button,
  CollectionPickerModal,
  CompactScreenHeader,
  EmptyState,
  FormError,
  FormField,
  NirmanScreenBackground,
  IconButton,
  ListControls,
  LoadingState,
  OperationalEntityCard,
  SearchField,
  StatusBadge,
  getStatusTone,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { getLocalizedErrorMessage } from '../../i18n';
import { isValidDateOnly } from '../../lib/validation';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import {
  createAssignmentDraft,
  ProjectAssignmentEditor,
  type ProjectAssignmentDraft,
  type ProjectAssignmentFieldErrors,
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

const projectMemberStatusTranslationKeys = {
  ACTIVE: 'status.ACTIVE',
  INACTIVE: 'status.INACTIVE',
  ENDED: 'status.ENDED',
} as const;

export function ProjectTeamScreen() {
  const { t } = useTranslation('team');
  const { t: tCommon } = useTranslation('common');
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
      setError(getLocalizedErrorMessage(loadError, t('errors.load')));
    } finally {
      setLoading(false);
    }
  }, [canAssignMembers, canReadMembers, canUpdateMembers, project, refreshSession, session?.accessToken, session?.activeOrganization, signOut, t]);

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
      t('confirm.endTitle'),
      t('confirm.endDescription', { name: member.user.name }),
      [
        { text: t('confirm.cancel'), style: 'cancel' },
        { text: t('confirm.endAction'), style: 'destructive', onPress: () => void unassign(member) },
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
      Alert.alert(t('confirm.notEnded'), getLocalizedErrorMessage(unassignError, t('errors.generic')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="team" />}>
      <CompactScreenHeader
        action={tab === 'members' && canAssignMembers ? <IconButton icon="account-plus-outline" accessibilityLabel={t('screen.assignMemberA11y')} variant="primary" onPress={() => setShowAssign(true)} /> : undefined}
        leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />}
        subtitle={project?.name ?? t('screen.chooseProject')}
        title={t('screen.title')}
      />

      <View style={styles.tabs}>
        {canReadMembers ? <Button label={t('screen.membersCount', { count: members.length })} size="sm" variant={tab === 'members' ? 'dark' : 'outline'} fullWidth={false} onPress={() => setTab('members')} /> : null}
        {canReadWorkers ? <Button label={t('screen.workers')} size="sm" variant={tab === 'workers' ? 'dark' : 'outline'} fullWidth={false} onPress={() => setTab('workers')} /> : null}
      </View>

      {tab === 'members' ? (
        <>
          <ListControls>
            <SearchField accessibilityLabel={t('screen.searchA11y')} placeholder={t('screen.searchPlaceholder')} value={search} onChangeText={setSearch} />
          </ListControls>
          {loading ? <LoadingState label={t('screen.loading')} /> : null}
          {error ? <EmptyState title={t('screen.unavailable')} description={error} actionLabel={t('screen.retry')} onAction={() => void load()} /> : null}
          {!loading && !error ? (
            visibleMembers.length ? (
              <View style={styles.list}>
                {visibleMembers.map((member) => (
                  <OperationalEntityCard
                    accessibilityLabel={`${member.user.name}, ${member.role.name}, ${member.roleLabel ?? t('screen.projectMember')}, ${t(projectMemberStatusTranslationKeys[member.status])}, ${member.permissionMode === 'CUSTOM' ? t('screen.customActions', { count: member.grantedPermissions.length }) : t('screen.roleDefaults')}`}
                    contextLeading={member.role.name}
                    contextTrailing={member.roleLabel ?? t('screen.projectMember')}
                    footerLeading={!member.startsOn && !member.endsOn ? t('assignment.withoutDateLimit') : t('assignment.dateRange', { start: member.startsOn?.slice(0, 10) ?? t('assignment.now'), end: member.endsOn?.slice(0, 10) ?? t('assignment.ongoing') })}
                    footerTrailing={<StatusBadge label={t(projectMemberStatusTranslationKeys[member.status])} />}
                    key={member.id}
                    onPress={(canUpdateMembers || canUnassignMembers) ? () => setActionMember(member) : undefined}
                    supporting={member.user.email ?? t('screen.noEmail')}
                    title={member.user.name}
                    tone={getStatusTone(member.status)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState title={search ? t('screen.noMatchingTitle') : t('screen.noMembersTitle')} description={search ? t('screen.tryAnotherSearch') : t('screen.noMembersDescription')} actionLabel={!search && canAssignMembers ? t('screen.assignMember') : undefined} onAction={!search && canAssignMembers ? () => setShowAssign(true) : undefined} />
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
        <BottomSheet visible title={actionMember.user.name} description={`${actionMember.role.name} · ${t(projectMemberStatusTranslationKeys[actionMember.status])}`} onClose={() => setActionMember(null)}>
          {canUpdateMembers ? <ActionListItem icon="account-edit-outline" label={t('actions.edit')} tone="brand" onPress={() => { setActionMember(null); setEditingMember(actionMember); }} /> : null}
          {canUnassignMembers ? <ActionListItem icon="account-minus-outline" label={t('actions.end')} tone="danger" disabled={saving} onPress={() => confirmUnassign(actionMember)} /> : null}
        </BottomSheet>
      ) : null}
    </NirmanScreenBackground>
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
  const { t } = useTranslation('team');
  const { t: tCommon } = useTranslation('common');
  const [selectedMemberId, setSelectedMemberId] = useState(member?.memberId ?? '');
  const [memberSearch, setMemberSearch] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draft, setDraft] = useState<ProjectAssignmentDraft>(() => createAssignmentDraft(member));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ProjectAssignmentFieldErrors & { memberId?: string }>({});
  const selectedOrganizationMember = availableMembers.find((candidate) => candidate.id === selectedMemberId);
  const roleId = member?.role.id ?? selectedOrganizationMember?.roleId;
  const rolePermissions = roles.find((role) => role.id === roleId)?.permissions ?? [];
  const filteredMembers = availableMembers.filter((candidate) => {
    const needle = memberSearch.trim().toLowerCase();
    return !needle || candidate.user?.name.toLowerCase().includes(needle) || candidate.role?.name.toLowerCase().includes(needle);
  });

  async function submit() {
    setError('');
    const nextFieldErrors: ProjectAssignmentFieldErrors & { memberId?: string } = {};
    if (!selectedMemberId) {
      nextFieldErrors.memberId = t('editor.errors.selectMember');
    }
    if (draft.startsOn && !isValidDateOnly(draft.startsOn)) {
      nextFieldErrors.startsOn = tCommon('validation.date');
    }
    if (draft.endsOn && !isValidDateOnly(draft.endsOn)) {
      nextFieldErrors.endsOn = tCommon('validation.date');
    } else if (draft.startsOn && isValidDateOnly(draft.startsOn) && draft.endsOn && draft.endsOn < draft.startsOn) {
      nextFieldErrors.endsOn = t('editor.errors.dateOrder');
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
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
      setError(getLocalizedErrorMessage(saveError, t('errors.generic')));
    }
  }

  return (
    <>
    <BottomSheet visible={!pickerVisible} scroll showCloseButton={false} title={mode === 'assign' ? t('editor.assignTitle') : member?.user.name ?? t('editor.editFallbackTitle')} description={mode === 'assign' ? t('editor.assignDescription') : t('editor.editDescription')} onClose={onClose} footer={<><Button label={t('editor.cancel')} variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? t('editor.saving') : mode === 'assign' ? t('editor.assign') : t('editor.saveChanges')} variant={mode === 'assign' ? 'primary' : 'brand'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormError message={error} />
      {mode === 'assign' ? (
        <FormField label={t('editor.member')} required error={fieldErrors.memberId} style={styles.memberPicker}>
          {selectedOrganizationMember ? (
            <OperationalEntityCard
              accessibilityLabel={t('editor.selectA11y', { name: selectedOrganizationMember.user?.name ?? t('editor.fallbackMember') })}
              contextLeading={selectedOrganizationMember.role?.name ?? t('editor.organizationMember')}
              contextTrailing={t('editor.selected')}
              footerLeading={selectedOrganizationMember.user?.email ?? t('editor.activeOrganizationMember')}
              footerTrailing={<Badge label={t('editor.change')} tone="info" />}
              onPress={() => setPickerVisible(true)}
              supporting={selectedOrganizationMember.designation ?? t('editor.candidate')}
              title={selectedOrganizationMember.user?.name ?? t('editor.fallbackMember')}
            />
          ) : (
            <Button label={t('editor.chooseMember')} leadingIcon="account-search-outline" variant="info" onPress={() => setPickerVisible(true)} />
          )}
        </FormField>
      ) : null}
      {(mode === 'edit' || selectedMemberId) ? <ProjectAssignmentEditor value={draft} rolePermissions={rolePermissions} errors={fieldErrors} onChange={(value) => { setDraft(value); setFieldErrors((current) => ({ memberId: current.memberId })); }} /> : null}
    </BottomSheet>
    <CollectionPickerModal
      accessibilityLabel={t('picker.searchA11y')}
      data={filteredMembers}
      emptyDescription={memberSearch ? t('picker.tryAnother') : t('picker.allAssigned')}
      emptyTitle={memberSearch ? t('picker.noMatchTitle') : t('picker.noneAvailableTitle')}
      keyExtractor={(candidate) => candidate.id}
      renderItem={({ item: candidate }) => (
        <OperationalEntityCard
          accessibilityLabel={t('editor.chooseA11y', { name: candidate.user?.name ?? t('editor.fallbackMember'), role: candidate.role?.name ?? t('editor.organizationMember') })}
          contextLeading={candidate.role?.name ?? t('editor.organizationMember')}
          contextTrailing={candidate.status === 'ACTIVE' ? t('status.ACTIVE') : candidate.status}
          footerLeading={candidate.user?.email ?? t('screen.noEmail')}
          footerTrailing={candidate.id === selectedMemberId ? <StatusBadge label={t('editor.selected')} /> : <AppIcon name="chevron-right" size={20} color={mobileTheme.color.text.muted} />}
          onPress={() => {
            setSelectedMemberId(candidate.id);
            setFieldErrors((current) => ({ ...current, memberId: undefined }));
            setPickerVisible(false);
          }}
          supporting={candidate.designation ?? t('editor.available')}
          title={candidate.user?.name ?? t('editor.fallbackMember')}
          tone={getStatusTone(candidate.status)}
        />
      )}
      searchPlaceholder={t('picker.searchPlaceholder')}
      searchValue={memberSearch}
      subtitle={t('picker.subtitle')}
      title={t('picker.title')}
      visible={pickerVisible}
      onClose={() => setPickerVisible(false)}
      onSearchChange={setMemberSearch}
    />
    </>
  );
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
  pickerList: { gap: mobileTheme.spacing[2] },
  pickerRow: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 64, padding: mobileTheme.spacing[3] },
  pickerRowSelected: { backgroundColor: mobileTheme.color.surface.mist, borderColor: mobileTheme.color.border.selected },
  footerButton: { flex: 1 },
  disabled: { opacity: 0.5 },
});
