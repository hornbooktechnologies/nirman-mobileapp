import {
  PROJECT_PERMISSION_GROUPS,
  type PermissionKey,
  type ProjectMemberStatus,
  type ProjectPermissionMode,
} from '@nirman-app/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, FormField, Input, badgeToneTokens, getStatusTone, type BadgeTone } from '../../components/ui';
import { mobileText, mobileTheme } from '../../theme';

export type ProjectAssignmentDraft = {
  roleLabel: string;
  permissionMode: ProjectPermissionMode;
  permissions: PermissionKey[];
  status: ProjectMemberStatus;
  startsOn: string;
  endsOn: string;
};

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
  onChange,
}: {
  value: ProjectAssignmentDraft;
  rolePermissions: PermissionKey[];
  onChange: (value: ProjectAssignmentDraft) => void;
}) {
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
        label="Project responsibility"
        helperText="A readable label such as Site Supervisor or Inspection Lead. It does not grant permissions."
      >
        <Input
          accessibilityLabel="Project responsibility"
          placeholder="Optional responsibility"
          value={value.roleLabel}
          onChangeText={(roleLabel) => update({ roleLabel })}
        />
      </FormField>

      <FormField label="Assignment status">
        <View style={styles.choiceRow}>
          {(['ACTIVE', 'INACTIVE'] as const).map((status) => (
            <ChoiceChip
              key={status}
              label={status === 'ACTIVE' ? 'Active' : 'Inactive'}
              tone={getStatusTone(status)}
              selected={value.status === status}
              onPress={() => update({ status })}
            />
          ))}
        </View>
      </FormField>

      <View style={styles.dateRow}>
        <FormField label="Start date" helperText="YYYY-MM-DD" style={styles.dateField}>
          <Input
            accessibilityLabel="Assignment start date"
            autoCapitalize="none"
            placeholder="YYYY-MM-DD"
            value={value.startsOn}
            onChangeText={(startsOn) => update({ startsOn })}
          />
        </FormField>
        <FormField label="End date" helperText="Optional" style={styles.dateField}>
          <Input
            accessibilityLabel="Assignment end date"
            autoCapitalize="none"
            placeholder="YYYY-MM-DD"
            value={value.endsOn}
            onChangeText={(endsOn) => update({ endsOn })}
          />
        </FormField>
      </View>

      <Card variant="blueprint" style={styles.permissionsCard}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.sectionTitle}>Project permissions</Text>
            <Text style={styles.helpText}>
              Choose what this member can do on this project. Their organization role remains the maximum allowed access.
            </Text>
          </View>
          <Badge
            label={value.permissionMode === 'ROLE_DEFAULT' ? 'Role default' : 'Custom'}
            tone={value.permissionMode === 'ROLE_DEFAULT' ? 'neutral' : 'warning'}
          />
        </View>

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value.permissionMode === 'ROLE_DEFAULT' }}
          style={[styles.modeCard, value.permissionMode === 'ROLE_DEFAULT' && styles.modeCardSelected]}
          onPress={() => update({ permissionMode: 'ROLE_DEFAULT', permissions: [] })}
        >
          <Text style={styles.modeTitle}>Use organization role defaults</Text>
          <Text style={styles.helpText}>Use the normal permissions already defined for this role.</Text>
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
          <Text style={styles.modeTitle}>Custom for this project</Text>
          <Text style={styles.helpText}>Narrow access for this project without changing the organization role.</Text>
        </Pressable>

        {value.permissionMode === 'CUSTOM' ? (
          <View style={styles.matrix}>
            <View style={styles.presetRow}>
              <Button label="View preset" size="sm" variant="info" fullWidth={false} onPress={() => applyPreset('VIEW')} />
              <Button label="Manage preset" size="sm" variant="brand" fullWidth={false} onPress={() => applyPreset('MANAGE')} />
            </View>
            {PROJECT_PERMISSION_GROUPS.map((group) => {
              const permissions = group.permissions.filter((permission) =>
                rolePermissions.includes(permission),
              );
              if (!permissions.length) return null;
              return (
                <View key={group.key} style={styles.permissionGroup}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  <View style={styles.permissionChips}>
                    {permissions.map((permission) => (
                      <ChoiceChip
                        key={permission}
                        label={permission.split(':')[1].replaceAll('-', ' ')}
                        selected={value.permissions.includes(permission)}
                        onPress={() => togglePermission(permission)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
            {!value.permissions.includes('projects:read') ? (
              <Text style={styles.warning}>
                Add Project read access if this member should open the project.
              </Text>
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
      <Text style={[styles.chipText, selected && (toneTokens ? { color: toneTokens.foreground } : styles.chipTextSelected)]}>{label}</Text>
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
    gap: mobileTheme.spacing[3],
  },
  dateField: {
    flex: 1,
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
    textTransform: 'uppercase',
  },
  permissionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  chip: {
    alignItems: 'center',
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.full,
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
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: mobileTheme.color.text.inverse,
  },
  warning: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
  },
});
