import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  FormField,
  GradientScreen,
  IconButton,
  Input,
  LoadingState,
  Toggle,
} from '../../components/ui';
import { ApiRequestError } from '../../lib/api';
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

export function MembersScreen() {
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
      setError(loadError instanceof Error ? loadError.message : 'Unable to load members');
    } finally {
      setLoading(false);
    }
  }, [canAssignProjects, canInvite, canReadAssignments, canUpdate, organizationId, refreshSession, session?.accessToken, signOut]);

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
      Alert.alert('Member not activated', errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  }

  function confirmDeactivate(member: OrganizationMember) {
    Alert.alert(
      'Deactivate member?',
      `${member.user?.name ?? 'This member'} will lose organization and project access. Historical assignments remain available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
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
      Alert.alert('Member not deactivated', errorMessage(actionError));
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
    if (member.organizationWideProjectAccess) return 'All projects';
    const count = assignmentCounts.get(member.id) ?? 0;
    return count ? `${count} project${count === 1 ? '' : 's'}` : 'Unassigned';
  }

  return (
    <GradientScreen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" accessibilityLabel="Back" variant="glass" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Members</Text>
          <Text style={styles.caption}>{session?.activeOrganization?.name ?? 'Organization team'}</Text>
        </View>
        {canInvite ? (
          <IconButton icon="account-plus-outline" accessibilityLabel="Invite member" variant="primary" onPress={() => setShowInvite(true)} />
        ) : <View style={styles.headerSpacer} />}
      </View>

      <View style={styles.introRow}>
        <View style={styles.introCopy}>
          <Text style={styles.sectionTitle}>Organization members</Text>
          <Text style={styles.body}>Login users who can be assigned to one or more projects.</Text>
        </View>
        <Badge label={`${members.length} total`} tone="info" />
      </View>

      {subscriptionSummary ? (
        <Card variant="blueprint" style={styles.capacityCard}>
          <View style={styles.capacityCopy}>
            <Text style={styles.capacityLabel}>Subscription capacity</Text>
            <Text style={styles.memberName}>{subscriptionSummary.subscription?.plan.name ?? 'Legacy compatible access'}</Text>
          </View>
          <View style={styles.badges}>
            <Badge label={`Members ${subscriptionSummary.usage.activeMembers}/${subscriptionSummary.subscription?.plan.maxActiveMembers ?? 'Unlimited'}`} tone="info" />
            <Badge label={`Projects ${subscriptionSummary.usage.activeProjects}/${subscriptionSummary.subscription?.plan.maxActiveProjects ?? 'Unlimited'}`} tone="info" />
            {subscriptionSummary.subscription ? <Badge label={subscriptionSummary.subscription.status} tone={subscriptionSummary.subscription.status === 'ACTIVE' ? 'success' : 'warning'} /> : null}
          </View>
        </Card>
      ) : null}

      <Input
        accessibilityLabel="Search members"
        placeholder="Search name, email, role or designation"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? <LoadingState label="Loading organization members" /> : null}
      {error ? <EmptyState title="Members unavailable" description={error} actionLabel="Retry" onAction={() => void load()} /> : null}

      {!loading && !error ? (
        visibleMembers.length ? (
          <View style={styles.list}>
            {visibleMembers.map((member) => {
              const scope = projectScopeLabel(member);
              const unassigned = scope === 'Unassigned';
              return (
                <Card key={member.id} style={styles.memberCard}>
                  <View style={styles.memberHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(member.user?.name)}</Text>
                    </View>
                    <View style={styles.memberCopy}>
                      <Text style={styles.memberName}>{member.user?.name ?? 'Invited member'}</Text>
                      <Text style={styles.caption}>{member.user?.email ?? 'Email pending'}</Text>
                    </View>
                    {(canUpdate || canDeactivate || canAssignProjects) ? (
                      <IconButton
                        icon="dots-horizontal"
                        accessibilityLabel={`Actions for ${member.user?.name ?? 'member'}`}
                        variant="ghost"
                        onPress={() => setActionMember(member)}
                      />
                    ) : null}
                  </View>
                  <View style={styles.badges}>
                    <Badge label={member.role?.name ?? 'No role'} tone="neutral" />
                    <Badge label={member.status} tone={member.status === 'ACTIVE' ? 'active' : member.status === 'INVITED' ? 'warning' : 'danger'} />
                    <Badge label={scope} tone={unassigned ? 'warning' : 'info'} />
                  </View>
                  {member.designation ? <Text style={styles.body}>{member.designation}</Text> : null}
                  {unassigned && canAssignProjects && member.status === 'ACTIVE' ? (
                    <Button label="Assign to projects" variant="outline" onPress={() => setAssigningMember(member)} />
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            title={search ? 'No matching members' : 'No organization members'}
            description={search ? 'Try another search.' : 'Invite a member to build your organization team.'}
            actionLabel={!search && canInvite ? 'Invite Member' : undefined}
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
          title={actionMember.user?.name ?? 'Member actions'}
          description={`${actionMember.role?.name ?? 'Organization member'} · ${projectScopeLabel(actionMember)}`}
          onClose={() => setActionMember(null)}
        >
          {canAssignProjects && actionMember.status === 'ACTIVE' ? (
            <ActionRow
              icon="folder-account-outline"
              label={(assignmentCounts.get(actionMember.id) ?? 0) > 0 ? 'Manage projects' : 'Assign to projects'}
              onPress={() => {
                setActionMember(null);
                setAssigningMember(actionMember);
              }}
            />
          ) : null}
          {canUpdate ? (
            <ActionRow
              icon="account-edit-outline"
              label="Edit role and access"
              onPress={() => {
                setActionMember(null);
                setEditingMember(actionMember);
              }}
            />
          ) : null}
          {canUpdate && ['INACTIVE', 'SUSPENDED'].includes(actionMember.status) ? (
            <ActionRow icon="account-check-outline" label="Activate member" disabled={saving} onPress={() => void activate(actionMember)} />
          ) : null}
          {canDeactivate && actionMember.status === 'ACTIVE' && actionMember.userId !== session?.user.id ? (
            <ActionRow icon="account-cancel-outline" label="Deactivate member" destructive disabled={saving} onPress={() => confirmDeactivate(actionMember)} />
          ) : null}
        </BottomSheet>
      ) : null}

      {invitationResult ? (
        <BottomSheet
          visible
          title="Invitation created"
          description="The member appears as Invited until activation is completed."
          onClose={() => setInvitationResult(null)}
        >
          <Card variant="blueprint" style={styles.resultCard}>
            <Badge label={invitationResult.invitation.deliveryStatus.replaceAll('_', ' ')} tone={invitationResult.invitation.deliveryStatus === 'EMAIL_SENT' ? 'success' : 'warning'} />
            <Text style={styles.body}>Expires {invitationResult.invitation.expiresAt.slice(0, 10)}</Text>
          </Card>
          <Button
            label="Share activation link"
            variant="outline"
            onPress={() => void Share.share({ message: invitationResult.invitation.mobileActivationUrl || invitationResult.invitation.activationUrl })}
          />
        </BottomSheet>
      ) : null}
    </GradientScreen>
  );
}

function InviteMemberSheet({ roles, saving, onClose, onInvite }: {
  roles: OrganizationMemberRole[];
  saving: boolean;
  onClose: () => void;
  onInvite: (input: { name: string; email: string; phone?: string; roleId: string; designation?: string; organizationWideProjectAccess?: boolean }) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', roleId: '', designation: '', organizationWideProjectAccess: false });
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.roleId) {
      setError('Name, email and organization role are required.');
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
      setError(errorMessage(inviteError));
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title="Invite member" description="Invite a login user to this organization. Project assignments can be added after activation." onClose={onClose} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? 'Inviting' : 'Send invitation'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormField label="Full name"><Input accessibilityLabel="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} /></FormField>
      <FormField label="Email address"><Input accessibilityLabel="Email address" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => setForm({ ...form, email })} /></FormField>
      <FormField label="Mobile number" helperText="Optional"><Input accessibilityLabel="Mobile number" keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} /></FormField>
      <FormField label="Organization role" helperText="The role controls the maximum permissions available to this member."><RolePicker roles={roles} selectedRoleId={form.roleId} onSelect={(roleId) => setForm({ ...form, roleId })} /></FormField>
      <FormField label="Designation" helperText="Optional job title; this does not grant permissions."><Input accessibilityLabel="Designation" value={form.designation} onChangeText={(designation) => setForm({ ...form, designation })} /></FormField>
      <Toggle label="Access all organization projects" value={form.organizationWideProjectAccess} onValueChange={(organizationWideProjectAccess) => setForm({ ...form, organizationWideProjectAccess })} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  const [roleId, setRoleId] = useState(member.roleId);
  const [designation, setDesignation] = useState(member.designation ?? '');
  const [organizationWideProjectAccess, setOrganizationWideProjectAccess] = useState(member.organizationWideProjectAccess);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      await onSave({
        ...(isCurrentUser ? {} : { roleId }),
        designation: designation.trim() || null,
        organizationWideProjectAccess,
      });
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title={`Edit ${member.user?.name ?? 'member'}`} description="Update organization role, designation and default project scope." onClose={onClose} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? 'Saving' : 'Save member'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormField label="Organization role" helperText={isCurrentUser ? 'You cannot change your own organization role.' : 'This role remains the ceiling for every project permission.'}>
        <RolePicker roles={roles} selectedRoleId={roleId} disabled={isCurrentUser} onSelect={setRoleId} />
      </FormField>
      <FormField label="Designation" helperText="A job title only; it does not control permissions."><Input accessibilityLabel="Designation" value={designation} onChangeText={setDesignation} /></FormField>
      <Toggle label="Access all organization projects" value={organizationWideProjectAccess} onValueChange={setOrganizationWideProjectAccess} />
      {!organizationWideProjectAccess ? <Text style={styles.helpText}>Selected project access is managed from Assign or Manage Projects.</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
            <View style={styles.roleCopy}><Text style={styles.roleName}>{role.name}</Text>{role.description ? <Text style={styles.caption}>{role.description}</Text> : null}</View>
            {selected ? <AppIcon name="check-circle" size={22} color={mobileTheme.color.action.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function ActionRow({ icon, label, destructive = false, disabled = false, onPress }: { icon: Parameters<typeof AppIcon>[0]['name']; label: string; destructive?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} style={[styles.actionRow, disabled && styles.disabled]} onPress={onPress}>
      <AppIcon name={icon} size={24} color={destructive ? mobileTheme.color.status.danger.foreground : mobileTheme.color.text.primary} />
      <Text style={[styles.actionLabel, destructive && styles.destructive]}>{label}</Text>
      <AppIcon name="chevron-right" size={22} color={mobileTheme.color.text.muted} />
    </Pressable>
  );
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
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
  capacityLabel: { ...mobileText.label, color: mobileTheme.color.text.secondary, textTransform: 'uppercase' },
  memberHeader: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  avatar: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.mist, borderRadius: mobileTheme.radius.full, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { ...mobileText.label, color: mobileTheme.color.text.primary },
  memberCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  memberName: { ...mobileText.sectionTitle, fontSize: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  resultCard: { gap: mobileTheme.spacing[2] },
  footerButton: { flex: 1 },
  errorText: { ...mobileText.caption, color: mobileTheme.color.status.danger.foreground },
  helpText: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  roleList: { gap: mobileTheme.spacing[2] },
  roleCard: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 68, padding: mobileTheme.spacing[3] },
  roleCardSelected: { backgroundColor: mobileTheme.color.surface.mist, borderColor: mobileTheme.color.border.selected },
  roleCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  roleName: { ...mobileText.label, color: mobileTheme.color.text.primary },
  actionRow: { alignItems: 'center', borderBottomColor: mobileTheme.color.border.subtle, borderBottomWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 60, paddingVertical: mobileTheme.spacing[2] },
  actionLabel: { ...mobileText.label, color: mobileTheme.color.text.primary, flex: 1, fontSize: 16 },
  destructive: { color: mobileTheme.color.status.danger.foreground },
  disabled: { opacity: 0.5 },
});
