import {
  PROJECT_PERMISSION_GROUPS,
  type PermissionKey,
  type ProjectMemberStatus,
  type ProjectPermissionMode,
} from '@nirman-app/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Badge, Button, Card, DateInput, FormField, Input, badgeToneTokens, getStatusTone, type BadgeTone } from '../../components/ui';
import { parseDateOnly } from '../../lib/validation';
import { mobileText, mobileTheme } from '../../theme';

const permissionActionTranslationKeys = {
  read: 'permissionAction.read',
  update: 'permissionAction.update',
  assign: 'permissionAction.assign',
  switch: 'permissionAction.switch',
  unassign: 'permissionAction.unassign',
  create: 'permissionAction.create',
  'assign-project': 'permissionAction.assign-project',
  'update-rate': 'permissionAction.update-rate',
  deactivate: 'permissionAction.deactivate',
  export: 'permissionAction.export',
  mark: 'permissionAction.mark',
  'correct-locked': 'permissionAction.correct-locked',
  generate: 'permissionAction.generate',
  'mark-paid': 'permissionAction.mark-paid',
  'update-organization': 'permissionAction.update-organization',
  'update-project': 'permissionAction.update-project',
} as const;

export type ProjectAssignmentDraft = {
  roleLabel: string;
  permissionMode: ProjectPermissionMode;
  permissions: PermissionKey[];
  status: ProjectMemberStatus;
  startsOn: string;
  endsOn: string;
};

export type ProjectAssignmentFieldErrors = Partial<Record<'startsOn' | 'endsOn', string>>;

export function createAssignmentDraft(
  assignment?: Partial<{
    roleLabel: string | null;
    permissionMode: ProjectPermissionMode;
    grantedPermissions: PermissionKey[];
    status: ProjectMemberStatus;
    startsOn: string | null;
    endsOn: string | null;
  }>,
): ProjectAssignmentDraft {
  return {
    roleLabel: assignment?.roleLabel ?? '',
    permissionMode: assignment?.permissionMode ?? 'ROLE_DEFAULT',
    permissions: assignment?.grantedPermissions ?? [],
    status: assignment?.status ?? 'ACTIVE',
    startsOn: assignment?.startsOn?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    endsOn: assignment?.endsOn?.slice(0, 10) ?? '',
  };
}

export function ProjectAssignmentEditor({
  value,
  rolePermissions,
  errors = {},
  onChange,
}: {
  value: ProjectAssignmentDraft;
  rolePermissions: PermissionKey[];
  errors?: ProjectAssignmentFieldErrors;
  onChange: (value: ProjectAssignmentDraft) => void;
}) {
  const { t } = useTranslation('team');
  const allowedPermissions = PROJECT_PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.filter((permission) => rolePermissions.includes(permission)),
  ).filter((permission, index, permissions) => permissions.indexOf(permission) === index);

  function update(updates: Partial<ProjectAssignmentDraft>) {
    onChange({ ...value, ...updates });
  }

  function applyPreset(preset: 'VIEW' | 'MANAGE') {
    update({
      permissionMode: 'CUSTOM',
      permissions:
        preset === 'MANAGE'
          ? allowedPermissions
          : allowedPermissions.filter(
              (permission) =>
                permission.endsWith(':read') || permission === 'projects:switch',
            ),
    });
  }

  function togglePermission(permission: PermissionKey) {
    update({
      permissions: value.permissions.includes(permission)
        ? value.permissions.filter((candidate) => candidate !== permission)
        : [...value.permissions, permission],
    });
  }

  return (
    <View style={styles.root}>
      <FormField
        label={t('assignment.responsibility')}
        optional
        helperText={t('assignment.responsibilityHelp')}
      >
        <Input
          accessibilityLabel={t('assignment.responsibility')}
          maxLength={120}
          placeholder={t('assignment.responsibilityPlaceholder')}
          value={value.roleLabel}
          onChangeText={(roleLabel) => update({ roleLabel })}
        />
      </FormField>

      <FormField label={t('assignment.status')} required>
        <View style={styles.choiceRow}>
          {(['ACTIVE', 'INACTIVE'] as const).map((status) => (
            <ChoiceChip
              key={status}
              label={status === 'ACTIVE' ? t('assignment.active') : t('assignment.inactive')}
              tone={getStatusTone(status)}
              selected={value.status === status}
              onPress={() => update({ status })}
            />
          ))}
        </View>
      </FormField>

      <View style={styles.dateRow}>
        <FormField label={t('assignment.startDate')} optional error={errors.startsOn} style={styles.dateField}>
          <DateInput
            accessibilityLabel={t('assignment.startDateA11y')}
            invalid={Boolean(errors.startsOn)}
            value={value.startsOn}
            onChangeText={(startsOn) => update({ startsOn })}
          />
        </FormField>
        <FormField label={t('assignment.endDate')} optional error={errors.endsOn} style={styles.dateField}>
          <DateInput
            accessibilityLabel={t('assignment.endDateA11y')}
            invalid={Boolean(errors.endsOn)}
            minimumDate={parseDateOnly(value.startsOn) ?? undefined}
            value={value.endsOn}
            onChangeText={(endsOn) => update({ endsOn })}
          />
        </FormField>
      </View>

      <Card variant="blueprint" style={styles.permissionsCard}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <AppText style={styles.sectionTitle} weight={700}>{t('assignment.permissions')}</AppText>
            <AppText style={styles.helpText} weight={500}>{t('assignment.permissionsHelp')}</AppText>
          </View>
          <Badge
            label={value.permissionMode === 'ROLE_DEFAULT' ? t('assignment.roleDefault') : t('assignment.custom')}
            tone={value.permissionMode === 'ROLE_DEFAULT' ? 'neutral' : 'warning'}
          />
        </View>

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value.permissionMode === 'ROLE_DEFAULT' }}
          style={[styles.modeCard, value.permissionMode === 'ROLE_DEFAULT' && styles.modeCardSelected]}
          onPress={() => update({ permissionMode: 'ROLE_DEFAULT', permissions: [] })}
        >
          <AppText style={styles.modeTitle} weight={600}>{t('assignment.useRoleDefaults')}</AppText>
          <AppText style={styles.helpText} weight={500}>{t('assignment.useRoleDefaultsHelp')}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value.permissionMode === 'CUSTOM' }}
          style={[styles.modeCard, value.permissionMode === 'CUSTOM' && styles.modeCardSelected]}
          onPress={() => {
            const permissions = value.permissions.length
              ? value.permissions
              : allowedPermissions.filter(
                  (permission) => permission.endsWith(':read') || permission === 'projects:switch',
                );
            update({ permissionMode: 'CUSTOM', permissions });
          }}
        >
          <AppText style={styles.modeTitle} weight={600}>{t('assignment.customForProject')}</AppText>
          <AppText style={styles.helpText} weight={500}>{t('assignment.customForProjectHelp')}</AppText>
        </Pressable>

        {value.permissionMode === 'CUSTOM' ? (
          <View style={styles.matrix}>
            <View style={styles.presetRow}>
              <Button label={t('assignment.viewPreset')} size="sm" variant="info" fullWidth={false} onPress={() => applyPreset('VIEW')} />
              <Button label={t('assignment.managePreset')} size="sm" variant="brand" fullWidth={false} onPress={() => applyPreset('MANAGE')} />
            </View>
            {PROJECT_PERMISSION_GROUPS.map((group) => {
              const permissions = group.permissions.filter((permission) =>
                rolePermissions.includes(permission),
              );
              if (!permissions.length) return null;
              return (
                <View key={group.key} style={styles.permissionGroup}>
                  <AppText style={styles.groupLabel} weight={600}>{t(`permissionGroup.${group.key}`)}</AppText>
                  <View style={styles.permissionChips}>
                    {permissions.map((permission) => (
                      <ChoiceChip
                        key={permission}
                        label={t(permissionActionTranslationKeys[permission.split(':')[1] as keyof typeof permissionActionTranslationKeys])}
                        selected={value.permissions.includes(permission)}
                        onPress={() => togglePermission(permission)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
            {!value.permissions.includes('projects:read') ? (
              <AppText style={styles.warning} weight={500}>{t('assignment.projectReadWarning')}</AppText>
            ) : null}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  tone,
  onPress,
}: {
  label: string;
  selected: boolean;
  tone?: BadgeTone;
  onPress: () => void;
}) {
  const toneTokens = tone ? badgeToneTokens[tone] : null;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={[styles.chip, selected && (toneTokens ? { backgroundColor: toneTokens.background, borderColor: toneTokens.foreground } : styles.chipSelected)]}
      onPress={onPress}
    >
      <AppText style={[styles.chipText, selected && (toneTokens ? { color: toneTokens.foreground } : styles.chipTextSelected)]} weight={600}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: mobileTheme.spacing[4],
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[3],
  },
  dateField: {
    flex: 1,
    flexBasis: 140,
    minWidth: 140,
  },
  permissionsCard: {
    gap: mobileTheme.spacing[3],
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  headingCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  sectionTitle: {
    ...mobileText.sectionTitle,
    fontSize: 18,
  },
  helpText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  modeCard: {
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    gap: mobileTheme.spacing[1],
    minHeight: 68,
    padding: mobileTheme.spacing[3],
  },
  modeCardSelected: {
    backgroundColor: mobileTheme.color.surface.selected,
    borderColor: mobileTheme.color.border.selected,
  },
  modeTitle: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
  },
  matrix: {
    gap: mobileTheme.spacing[4],
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  permissionGroup: {
    gap: mobileTheme.spacing[2],
  },
  groupLabel: {
    ...mobileText.label,
    color: mobileTheme.color.text.secondary,
  },
  permissionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  chip: {
    alignItems: 'center',
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.component.chip.radius,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: mobileTheme.spacing[3],
  },
  chipSelected: {
    backgroundColor: mobileTheme.color.navigation.floating,
    borderColor: mobileTheme.color.navigation.floating,
  },
  chipText: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
  },
  chipTextSelected: {
    color: mobileTheme.color.text.inverse,
  },
  warning: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
  },
});
