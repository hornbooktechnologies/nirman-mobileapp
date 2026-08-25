import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  AppText,
  ActionListItem,
  Badge,
  BottomSheet,
  Button,
  Card,
  CompactScreenHeader,
  EmptyState,
  FormError,
  FormField,
  NirmanScreenBackground,
  IconButton,
  Input,
  LoadingState,
  OperationalEntityCard,
  SearchField,
  StatusBadge,
  Toggle,
  getStatusTone,
} from '../../components/ui';
import { ApiRequestError } from '../../lib/api';
import { getLocalizedErrorMessage } from '../../i18n';
import { isValidEmail, isValidPhone } from '../../lib/validation';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { MemberProjectAssignmentsSheet } from './member-project-assignments-sheet';
import {
  deactivateOrganizationMember,
  fetchOrganizationMemberRoles,
  fetchOrganizationMembers,
  fetchOrganizationProjectAssignments,
  fetchOrganizationSubscriptionSummary,
  inviteOrganizationMember,
  saveMemberProjectAssignments,
  updateOrganizationMember,
} from './services';
import type {
  OrganizationMember,
  OrganizationMemberInvitationResponse,
  OrganizationMemberRole,
  OrganizationProjectAssignmentsOverview,
  SaveMemberProjectAssignmentsInput,
  SubscriptionSummary,
} from './types';

const emptyOverview: OrganizationProjectAssignmentsOverview = { projects: [], assignments: [] };

const memberStatusTranslationKeys = {
  INVITED: 'memberStatus.INVITED',
  ACTIVE: 'memberStatus.ACTIVE',
  INACTIVE: 'memberStatus.INACTIVE',
  SUSPENDED: 'memberStatus.SUSPENDED',
  LEFT: 'memberStatus.LEFT',
} as const;

const subscriptionStatusTranslationKeys = {
  PENDING: 'subscriptionStatus.PENDING',
  ACTIVE: 'subscriptionStatus.ACTIVE',
  SUSPENDED: 'subscriptionStatus.SUSPENDED',
  EXPIRED: 'subscriptionStatus.EXPIRED',
  CANCELLED: 'subscriptionStatus.CANCELLED',
} as const;

const deliveryStatusTranslationKeys = {
  EMAIL_SENT: 'deliveryStatus.EMAIL_SENT',
  EMAIL_FAILED: 'deliveryStatus.EMAIL_FAILED',
  MANUAL: 'deliveryStatus.MANUAL',
} as const;

export function MembersScreen() {
  const { t } = useTranslation('members');
  const { t: tCommon } = useTranslation('common');
  const { refreshSession, session, signOut } = useSession();
  const organizationId = session?.activeOrganization?.id ?? null;
  const canInvite = session?.permissions.includes('members:invite') ?? false;
  const canUpdate = session?.permissions.includes('members:update') ?? false;
  const canDeactivate = session?.permissions.includes('members:deactivate') ?? false;
  const canReadAssignments = session?.permissions.includes('project-members:read') ?? false;
  const canAssignProjects = session?.permissions.includes('project-members:assign') ?? false;
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [roles, setRoles] = useState<OrganizationMemberRole[]>([]);
  const [overview, setOverview] = useState(emptyOverview);
  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [assigningMember, setAssigningMember] = useState<OrganizationMember | null>(null);
  const [actionMember, setActionMember] = useState<OrganizationMember | null>(null);
  const [invitationResult, setInvitationResult] =
    useState<OrganizationMemberInvitationResponse | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken || !organizationId) return;
    setLoading(true);
    setError('');
    try {
      const [memberRows, roleRows, assignmentOverview, capacitySummary] = await Promise.all([
        fetchOrganizationMembers(organizationId, session.accessToken),
        canInvite || canUpdate || canAssignProjects
          ? fetchOrganizationMemberRoles(organizationId, session.accessToken)
          : Promise.resolve([]),
        canReadAssignments
          ? fetchOrganizationProjectAssignments(organizationId, session.accessToken)
          : Promise.resolve(emptyOverview),
        fetchOrganizationSubscriptionSummary(organizationId, session.accessToken).catch(() => null),
      ]);
      setMembers(memberRows);
      setRoles(roleRows);
      setOverview(assignmentOverview);
      setSubscriptionSummary(capacitySummary);
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
  }, [canAssignProjects, canInvite, canReadAssignments, canUpdate, organizationId, refreshSession, session?.accessToken, signOut, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    overview.assignments.forEach((assignment) => {
      if (assignment.status === 'ACTIVE') {
        counts.set(assignment.memberId, (counts.get(assignment.memberId) ?? 0) + 1);
      }
    });
    return counts;
  }, [overview.assignments]);

  const visibleMembers = members.filter((member) => {
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      member.user?.name.toLowerCase().includes(needle) ||
      member.user?.email?.toLowerCase().includes(needle) ||
      member.role?.name.toLowerCase().includes(needle) ||
      member.designation?.toLowerCase().includes(needle)
    );
  });

  async function activate(member: OrganizationMember) {
    if (!session?.accessToken || !organizationId) return;
    setSaving(true);
    try {
      await updateOrganizationMember(organizationId, member.id, session.accessToken, {
        status: 'ACTIVE',
      });
      setActionMember(null);
      await load();
    } catch (actionError) {
      Alert.alert(t('confirm.activateFailed'), getLocalizedErrorMessage(actionError, t('errors.generic')));
    } finally {
      setSaving(false);
    }
  }

  function confirmDeactivate(member: OrganizationMember) {
    Alert.alert(
      t('confirm.deactivateTitle'),
      t('confirm.deactivateDescription', { name: member.user?.name ?? t('confirm.thisMember') }),
      [
        { text: t('confirm.cancel'), style: 'cancel' },
        {
          text: t('confirm.deactivate'),
          style: 'destructive',
          onPress: () => void deactivate(member),
        },
      ],
    );
  }

  async function deactivate(member: OrganizationMember) {
    if (!session?.accessToken || !organizationId) return;
    setSaving(true);
    try {
      await deactivateOrganizationMember(organizationId, member.id, session.accessToken);
      setActionMember(null);
      await load();
    } catch (actionError) {
      Alert.alert(t('confirm.deactivateFailed'), getLocalizedErrorMessage(actionError, t('errors.generic')));
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignments(input: SaveMemberProjectAssignmentsInput) {
    if (!session?.accessToken || !organizationId || !assigningMember) return;
    setSaving(true);
    try {
      await saveMemberProjectAssignments(
        organizationId,
        assigningMember.id,
        session.accessToken,
        input,
      );
      setAssigningMember(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function projectScopeLabel(member: OrganizationMember) {
    if (member.organizationWideProjectAccess) return t('screen.allProjects');
    const count = assignmentCounts.get(member.id) ?? 0;
    return count ? t('screen.projectCount', { count }) : t('screen.unassigned');
  }

  return (
    <NirmanScreenBackground>
      <CompactScreenHeader
        action={canInvite ? <IconButton icon="account-plus-outline" accessibilityLabel={t('screen.inviteA11y')} variant="primary" onPress={() => setShowInvite(true)} /> : undefined}
        leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />}
        subtitle={session?.activeOrganization?.name ?? t('screen.organizationTeam')}
        title={t('screen.title')}
      />

      <View style={styles.introRow}>
        <View style={styles.introCopy}>
          <AppText style={styles.sectionTitle} weight={700}>{t('screen.introTitle')}</AppText>
          <AppText style={styles.body}>{t('screen.introDescription')}</AppText>
        </View>
        <Badge label={t('screen.total', { count: members.length })} tone="info" />
      </View>

      {subscriptionSummary ? (
        <Card variant="blueprint" style={styles.capacityCard}>
          <View style={styles.capacityCopy}>
            <AppText style={styles.capacityLabel} weight={600}>{t('screen.subscriptionCapacity')}</AppText>
            <AppText style={styles.memberName} weight={700}>{subscriptionSummary.subscription?.plan.name ?? t('screen.legacyAccess')}</AppText>
          </View>
          <View style={styles.badges}>
            <Badge label={t('screen.membersCapacity', { used: subscriptionSummary.usage.activeMembers, limit: subscriptionSummary.subscription?.plan.maxActiveMembers ?? t('screen.unlimited') })} tone="info" />
            <Badge label={t('screen.projectsCapacity', { used: subscriptionSummary.usage.activeProjects, limit: subscriptionSummary.subscription?.plan.maxActiveProjects ?? t('screen.unlimited') })} tone="info" />
            {subscriptionSummary.subscription ? <StatusBadge label={t(subscriptionStatusTranslationKeys[subscriptionSummary.subscription.status])} /> : null}
          </View>
        </Card>
      ) : null}

      <SearchField
        accessibilityLabel={t('screen.searchA11y')}
        placeholder={t('screen.searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
      />

      {loading ? <LoadingState label={t('screen.loading')} /> : null}
      {error ? <EmptyState title={t('screen.unavailable')} description={error} actionLabel={t('screen.retry')} onAction={() => void load()} /> : null}

      {!loading && !error ? (
        visibleMembers.length ? (
          <View style={styles.list}>
            {visibleMembers.map((member) => {
              const scope = projectScopeLabel(member);
              const hasActions = canUpdate || canDeactivate || (canAssignProjects && member.status === 'ACTIVE');
              const memberName = member.user?.name ?? t('screen.invitedMember');
              const roleName = member.role?.name ?? t('screen.noRole');
              const statusLabel = t(memberStatusTranslationKeys[member.status]);
              return (
                <OperationalEntityCard
                  accessibilityLabel={t('screen.summaryA11y', { name: memberName, role: roleName, status: statusLabel, scope, actions: hasActions ? `, ${t('screen.openActions')}` : '' })}
                  contextLeading={roleName}
                  contextTrailing={scope}
                  footerLeading={member.designation ?? (member.status === 'INVITED' ? t('screen.activationPending') : t('screen.organizationAccess'))}
                  footerTrailing={<StatusBadge label={statusLabel} />}
                  key={member.id}
                  onPress={hasActions ? () => setActionMember(member) : undefined}
                  supporting={member.user?.email ?? t('screen.emailPending')}
                  title={memberName}
                  tone={getStatusTone(member.status)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            title={search ? t('screen.noMatchTitle') : t('screen.noneTitle')}
            description={search ? t('screen.tryAnother') : t('screen.noneDescription')}
            actionLabel={!search && canInvite ? t('screen.inviteMember') : undefined}
            onAction={!search && canInvite ? () => setShowInvite(true) : undefined}
          />
        )
      ) : null}

      {showInvite ? (
        <InviteMemberSheet
          roles={roles}
          saving={saving}
          onClose={() => setShowInvite(false)}
          onInvite={async (input) => {
            if (!session?.accessToken || !organizationId) return;
            setSaving(true);
            try {
              const result = await inviteOrganizationMember(
                organizationId,
                session.accessToken,
                input,
              );
              setShowInvite(false);
              setInvitationResult(result);
              await load();
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {editingMember ? (
        <EditMemberSheet
          member={editingMember}
          roles={roles}
          saving={saving}
          isCurrentUser={editingMember.userId === session?.user.id}
          onClose={() => setEditingMember(null)}
          onSave={async (input) => {
            if (!session?.accessToken || !organizationId) return;
            setSaving(true);
            try {
              await updateOrganizationMember(
                organizationId,
                editingMember.id,
                session.accessToken,
                input,
              );
              setEditingMember(null);
              await load();
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {assigningMember ? (
        <MemberProjectAssignmentsSheet
          member={assigningMember}
          overview={overview}
          rolePermissions={roles.find((role) => role.id === assigningMember.roleId)?.permissions ?? []}
          saving={saving}
          onClose={() => setAssigningMember(null)}
          onSave={saveAssignments}
        />
      ) : null}

      {actionMember ? (
        <BottomSheet
          visible
          title={actionMember.user?.name ?? t('actions.memberActions')}
          description={`${actionMember.role?.name ?? t('actions.organizationMember')} · ${projectScopeLabel(actionMember)}`}
          onClose={() => setActionMember(null)}
        >
          {canAssignProjects && actionMember.status === 'ACTIVE' ? (
            <ActionListItem
              icon="folder-account-outline"
              label={(assignmentCounts.get(actionMember.id) ?? 0) > 0 ? t('actions.manageProjects') : t('actions.assignProjects')}
              tone="info"
              onPress={() => {
                setActionMember(null);
                setAssigningMember(actionMember);
              }}
            />
          ) : null}
          {canUpdate ? (
            <ActionListItem
              icon="account-edit-outline"
              label={t('actions.editAccess')}
              tone="brand"
              onPress={() => {
                setActionMember(null);
                setEditingMember(actionMember);
              }}
            />
          ) : null}
          {canUpdate && ['INACTIVE', 'SUSPENDED'].includes(actionMember.status) ? (
            <ActionListItem icon="account-check-outline" label={t('actions.activate')} tone="brand" disabled={saving} onPress={() => void activate(actionMember)} />
          ) : null}
          {canDeactivate && actionMember.status === 'ACTIVE' && actionMember.userId !== session?.user.id ? (
            <ActionListItem icon="account-cancel-outline" label={t('actions.deactivate')} tone="danger" disabled={saving} onPress={() => confirmDeactivate(actionMember)} />
          ) : null}
        </BottomSheet>
      ) : null}

      {invitationResult ? (
        <BottomSheet
          visible
          title={t('invitation.createdTitle')}
          description={t('invitation.createdDescription')}
          onClose={() => setInvitationResult(null)}
        >
          <Card variant="blueprint" style={styles.resultCard}>
            <StatusBadge label={t(deliveryStatusTranslationKeys[invitationResult.invitation.deliveryStatus])} />
            <AppText style={styles.body}>{t('invitation.expires', { date: invitationResult.invitation.expiresAt.slice(0, 10) })}</AppText>
          </Card>
          <Button
            label={t('invitation.share')}
            variant="info"
            onPress={() => void Share.share({ message: invitationResult.invitation.mobileActivationUrl || invitationResult.invitation.activationUrl })}
          />
        </BottomSheet>
      ) : null}
    </NirmanScreenBackground>
  );
}

function InviteMemberSheet({ roles, saving, onClose, onInvite }: {
  roles: OrganizationMemberRole[];
  saving: boolean;
  onClose: () => void;
  onInvite: (input: { name: string; email: string; phone?: string; roleId: string; designation?: string; organizationWideProjectAccess?: boolean }) => Promise<void>;
}) {
  const { t } = useTranslation('members');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState({ name: '', email: '', phone: '', roleId: '', designation: '', organizationWideProjectAccess: false });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'email' | 'phone' | 'roleId', string>>>({});

  async function submit() {
    setError('');
    const nextFieldErrors: Partial<Record<'name' | 'email' | 'phone' | 'roleId', string>> = {};
    if (!form.name.trim()) nextFieldErrors.name = t('invite.nameRequired');
    if (!form.email.trim()) nextFieldErrors.email = t('invite.emailRequired');
    else if (!isValidEmail(form.email)) nextFieldErrors.email = tCommon('validation.email');
    if (form.phone.trim() && !isValidPhone(form.phone)) nextFieldErrors.phone = tCommon('validation.phone');
    if (!form.roleId) nextFieldErrors.roleId = t('invite.roleRequired');
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }
    try {
      await onInvite({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        roleId: form.roleId,
        designation: form.designation.trim() || undefined,
        organizationWideProjectAccess: form.organizationWideProjectAccess,
      });
    } catch (inviteError) {
      setError(getLocalizedErrorMessage(inviteError, t('errors.generic')));
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title={t('invite.title')} description={t('invite.description')} onClose={onClose} footer={<><Button label={t('invite.cancel')} variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? t('invite.sending') : t('invite.send')} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormError message={error} />
      <FormField label={t('invite.name')} required error={fieldErrors.name}><Input accessibilityLabel={t('invite.nameA11y')} invalid={Boolean(fieldErrors.name)} maxLength={100} value={form.name} onChangeText={(name) => { setForm({ ...form, name }); if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: undefined })); }} /></FormField>
      <FormField label={t('invite.email')} required error={fieldErrors.email}><Input accessibilityLabel={t('invite.emailA11y')} invalid={Boolean(fieldErrors.email)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={form.email} onChangeText={(email) => { setForm({ ...form, email }); if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined })); }} /></FormField>
      <FormField label={t('invite.mobile')} optional error={fieldErrors.phone}><Input accessibilityLabel={t('invite.mobileA11y')} invalid={Boolean(fieldErrors.phone)} keyboardType="phone-pad" maxLength={20} value={form.phone} onChangeText={(phone) => { setForm({ ...form, phone }); if (fieldErrors.phone) setFieldErrors((current) => ({ ...current, phone: undefined })); }} /></FormField>
      <FormField label={t('invite.role')} required error={fieldErrors.roleId} helperText={t('invite.roleHelp')}><RolePicker roles={roles} selectedRoleId={form.roleId} onSelect={(roleId) => { setForm({ ...form, roleId }); if (fieldErrors.roleId) setFieldErrors((current) => ({ ...current, roleId: undefined })); }} /></FormField>
      <FormField label={t('invite.designation')} optional helperText={t('invite.designationHelp')}><Input accessibilityLabel={t('invite.designation')} maxLength={120} value={form.designation} onChangeText={(designation) => setForm({ ...form, designation })} /></FormField>
      <Toggle label={t('invite.allProjects')} value={form.organizationWideProjectAccess} onValueChange={(organizationWideProjectAccess) => setForm({ ...form, organizationWideProjectAccess })} />
    </BottomSheet>
  );
}

function EditMemberSheet({ member, roles, saving, isCurrentUser, onClose, onSave }: {
  member: OrganizationMember;
  roles: OrganizationMemberRole[];
  saving: boolean;
  isCurrentUser: boolean;
  onClose: () => void;
  onSave: (input: { roleId?: string; designation?: string | null; organizationWideProjectAccess?: boolean }) => Promise<void>;
}) {
  const { t } = useTranslation('members');
  const [roleId, setRoleId] = useState(member.roleId);
  const [designation, setDesignation] = useState(member.designation ?? '');
  const [organizationWideProjectAccess, setOrganizationWideProjectAccess] = useState(member.organizationWideProjectAccess);
  const [error, setError] = useState('');
  const [roleError, setRoleError] = useState('');

  async function submit() {
    setError('');
    if (!roleId) {
      setRoleError(t('invite.roleRequired'));
      return;
    }
    setRoleError('');
    try {
      await onSave({
        ...(isCurrentUser ? {} : { roleId }),
        designation: designation.trim() || null,
        organizationWideProjectAccess,
      });
    } catch (saveError) {
      setError(getLocalizedErrorMessage(saveError, t('errors.generic')));
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title={t('edit.title')} description={member.user?.name ?? t('edit.organizationMember')} onClose={onClose} footer={<><Button label={t('edit.cancel')} variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? t('edit.saving') : t('edit.save')} variant="brand" disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormError message={error} />
      <FormField label={t('edit.role')} required error={roleError} helperText={isCurrentUser ? t('edit.ownRoleHelp') : t('edit.roleHelp')}>
        <RolePicker roles={roles} selectedRoleId={roleId} disabled={isCurrentUser} onSelect={(value) => { setRoleId(value); setRoleError(''); }} />
      </FormField>
      <FormField label={t('edit.designation')} optional helperText={t('edit.designationHelp')}><Input accessibilityLabel={t('edit.designation')} maxLength={120} value={designation} onChangeText={setDesignation} /></FormField>
      <Toggle label={t('edit.allProjects')} value={organizationWideProjectAccess} onValueChange={setOrganizationWideProjectAccess} />
      {!organizationWideProjectAccess ? <AppText style={styles.helpText} weight={500}>{t('edit.selectedHelp')}</AppText> : null}
    </BottomSheet>
  );
}

function RolePicker({ roles, selectedRoleId, disabled = false, onSelect }: { roles: OrganizationMemberRole[]; selectedRoleId: string; disabled?: boolean; onSelect: (roleId: string) => void }) {
  return (
    <View style={styles.roleList}>
      {roles.map((role) => {
        const selected = role.id === selectedRoleId;
        return (
          <Pressable key={role.id} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} style={[styles.roleCard, selected && styles.roleCardSelected, disabled && styles.disabled]} onPress={() => onSelect(role.id)}>
            <View style={styles.roleCopy}><AppText style={styles.roleName} weight={600}>{role.name}</AppText>{role.description ? <AppText style={styles.caption} weight={500}>{role.description}</AppText> : null}</View>
            {selected ? <AppIcon name="check-circle" size={22} color={mobileTheme.color.action.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  headerCopy: { alignItems: 'center', flex: 1 },
  headerSpacer: { width: 50 },
  title: { ...mobileText.sectionTitle, fontSize: 22 },
  caption: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  introRow: { alignItems: 'flex-start', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  introCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle, fontSize: 20 },
  body: { ...mobileText.body },
  list: { gap: mobileTheme.spacing[3] },
  memberCard: { gap: mobileTheme.spacing[3] },
  capacityCard: { gap: mobileTheme.spacing[3] },
  capacityCopy: { gap: mobileTheme.spacing[1] },
  capacityLabel: { ...mobileText.label, color: mobileTheme.color.text.secondary },
  memberHeader: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  avatar: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.mist, borderRadius: mobileTheme.radius.full, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { ...mobileText.label, color: mobileTheme.color.text.primary },
  memberCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  memberName: { ...mobileText.sectionTitle, fontSize: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  resultCard: { gap: mobileTheme.spacing[2] },
  footerButton: { flex: 1 },
  helpText: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  roleList: { gap: mobileTheme.spacing[2] },
  roleCard: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 68, padding: mobileTheme.spacing[3] },
  roleCardSelected: { backgroundColor: mobileTheme.color.surface.mist, borderColor: mobileTheme.color.border.selected },
  roleCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  roleName: { ...mobileText.label, color: mobileTheme.color.text.primary },
  disabled: { opacity: 0.5 },
});
