import {
  PROJECT_STATUS_TRANSITIONS,
  PROJECT_TYPES,
  type ProjectStatus,
  type ProjectType,
} from '@nirman-app/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, FormField, Input } from '../../../components/ui';
import { mobileText, mobileTheme } from '../../../theme';
import type { Project, ProjectInput } from '../types';

type ProjectForm = {
  name: string;
  projectCode: string;
  type: ProjectType;
  status: ProjectStatus;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  startDate: string;
  expectedCompletionDate: string;
  description: string;
};

function initialForm(project?: Project): ProjectForm {
  return {
    name: project?.name ?? '',
    projectCode: project?.projectCode ?? '',
    type: project?.type ?? 'RESIDENTIAL',
    status: project?.status ?? 'DRAFT',
    line1: project?.address.line1 ?? '',
    city: project?.address.city ?? '',
    state: project?.address.state ?? '',
    postalCode: project?.address.postalCode ?? '',
    startDate: project?.startDate?.slice(0, 10) ?? '',
    expectedCompletionDate: project?.expectedCompletionDate?.slice(0, 10) ?? '',
    description: project?.description ?? '',
  };
}

export function ProjectFormSheet({ project, saving, onClose, onSave }: {
  project?: Project;
  saving: boolean;
  onClose: () => void;
  onSave: (input: ProjectInput) => Promise<void>;
}) {
  const [form, setForm] = useState(() => initialForm(project));
  const [error, setError] = useState('');
  const allowedStatuses: readonly ProjectStatus[] = project
    ? [project.status, ...PROJECT_STATUS_TRANSITIONS[project.status]].filter((status) => status !== 'ARCHIVED')
    : ['DRAFT', 'ACTIVE'];

  async function submit() {
    setError('');
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (form.startDate && form.expectedCompletionDate && form.expectedCompletionDate < form.startDate) {
      setError('Expected completion cannot be before the start date.');
      return;
    }
    try {
      await onSave({
        name: form.name.trim(),
        projectCode: form.projectCode.trim() || null,
        type: form.type,
        status: form.status,
        address: {
          line1: form.line1.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          postalCode: form.postalCode.trim() || null,
        },
        startDate: form.startDate || null,
        expectedCompletionDate: form.expectedCompletionDate || null,
        description: form.description.trim() || null,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save project');
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title={project ? `Edit ${project.name}` : 'Create project'} description="Create the project workspace first, then assign its members and workers." onClose={onClose} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? 'Saving' : project ? 'Save project' : 'Create project'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormField label="Project name"><Input accessibilityLabel="Project name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} /></FormField>
      <FormField label="Project code" helperText="Optional"><Input accessibilityLabel="Project code" value={form.projectCode} onChangeText={(projectCode) => setForm({ ...form, projectCode })} /></FormField>
      <FormField label="Project type"><ChoiceRow values={PROJECT_TYPES} selected={form.type} onSelect={(type) => setForm({ ...form, type })} /></FormField>
      <FormField label="Project status"><ChoiceRow values={allowedStatuses} selected={form.status} onSelect={(status) => setForm({ ...form, status })} /></FormField>
      <FormField label="Address line" helperText="Optional"><Input accessibilityLabel="Address line" value={form.line1} onChangeText={(line1) => setForm({ ...form, line1 })} /></FormField>
      <View style={styles.row}><FormField label="City" style={styles.flex}><Input accessibilityLabel="City" value={form.city} onChangeText={(city) => setForm({ ...form, city })} /></FormField><FormField label="State" style={styles.flex}><Input accessibilityLabel="State" value={form.state} onChangeText={(state) => setForm({ ...form, state })} /></FormField></View>
      <FormField label="Postal code" helperText="Optional"><Input accessibilityLabel="Postal code" keyboardType="number-pad" value={form.postalCode} onChangeText={(postalCode) => setForm({ ...form, postalCode })} /></FormField>
      <View style={styles.row}><FormField label="Start date" helperText="YYYY-MM-DD" style={styles.flex}><Input accessibilityLabel="Start date" value={form.startDate} onChangeText={(startDate) => setForm({ ...form, startDate })} /></FormField><FormField label="Expected completion" helperText="YYYY-MM-DD" style={styles.flex}><Input accessibilityLabel="Expected completion" value={form.expectedCompletionDate} onChangeText={(expectedCompletionDate) => setForm({ ...form, expectedCompletionDate })} /></FormField></View>
      <FormField label="Description" helperText="Optional"><Input accessibilityLabel="Description" multiline numberOfLines={3} value={form.description} onChangeText={(description) => setForm({ ...form, description })} /></FormField>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  );
}

function ChoiceRow<TValue extends string>({ values, selected, onSelect }: { values: readonly TValue[]; selected: TValue; onSelect: (value: TValue) => void }) {
  return <View style={styles.choices}>{values.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: value === selected }} style={[styles.choice, value === selected && styles.choiceSelected]} onPress={() => onSelect(value)}><Text style={[styles.choiceText, value === selected && styles.choiceTextSelected]}>{value.replaceAll('_', ' ')}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  flex: { flex: 1 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  choice: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.full, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: mobileTheme.spacing[3] },
  choiceSelected: { backgroundColor: mobileTheme.color.navigation.floating, borderColor: mobileTheme.color.navigation.floating },
  choiceText: { ...mobileText.label, color: mobileTheme.color.text.primary, textTransform: 'capitalize' },
  choiceTextSelected: { color: mobileTheme.color.text.inverse },
  footerButton: { flex: 1 },
  error: { ...mobileText.caption, color: mobileTheme.color.status.danger.foreground },
});
