import {
  PROJECT_STATUS_TRANSITIONS,
  PROJECT_TYPES,
  type ProjectStatus,
  type ProjectType,
} from '@nirman-app/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, DateInput, FormError, FormField, Input, badgeToneTokens, getStatusTone } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { isValidDateOnly, parseDateOnly } from '../../../lib/validation';
import { mobileText, mobileTheme } from '../../../theme';
import type { Project, ProjectInput } from '../types';

const projectTypeTranslationKeys = {
  RESIDENTIAL: 'type.RESIDENTIAL',
  COMMERCIAL: 'type.COMMERCIAL',
  MIXED: 'type.MIXED',
  SHED: 'type.SHED',
  OTHER: 'type.OTHER',
} as const;

const projectStatusTranslationKeys = {
  DRAFT: 'status.DRAFT',
  ACTIVE: 'status.ACTIVE',
  ON_HOLD: 'status.ON_HOLD',
  COMPLETED: 'status.COMPLETED',
  ARCHIVED: 'status.ARCHIVED',
} as const;

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

type ProjectFormErrors = Partial<Record<'name' | 'startDate' | 'expectedCompletionDate', string>>;

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
  const { t } = useTranslation('projects');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState(() => initialForm(project));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ProjectFormErrors>({});
  const allowedStatuses: readonly ProjectStatus[] = project
    ? [project.status, ...PROJECT_STATUS_TRANSITIONS[project.status]].filter((status) => status !== 'ARCHIVED')
    : ['DRAFT', 'ACTIVE'];

  async function submit() {
    setError('');
    const nextFieldErrors: ProjectFormErrors = {};
    if (!form.name.trim()) {
      nextFieldErrors.name = t('form.errors.nameRequired');
    }
    if (form.startDate && !isValidDateOnly(form.startDate)) {
      nextFieldErrors.startDate = tCommon('validation.date');
    }
    if (form.expectedCompletionDate && !isValidDateOnly(form.expectedCompletionDate)) {
      nextFieldErrors.expectedCompletionDate = tCommon('validation.date');
    } else if (
      form.startDate
      && isValidDateOnly(form.startDate)
      && form.expectedCompletionDate
      && form.expectedCompletionDate < form.startDate
    ) {
      nextFieldErrors.expectedCompletionDate = t('form.errors.completionBeforeStart');
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
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
      setError(getLocalizedErrorMessage(saveError, t('form.errors.saveFailed')));
    }
  }

  return (
    <BottomSheet
      visible
      scroll
      showCloseButton={false}
      title={project ? t('form.editTitle') : t('form.newTitle')}
      description={project ? project.name : t('form.newDescription')}
      onClose={onClose}
      footer={(
        <>
          <Button label={t('form.actions.cancel')} variant="secondary" style={styles.footerButton} onPress={onClose} />
          <Button
            label={saving ? t('form.actions.saving') : project ? t('form.actions.saveChanges') : t('form.actions.create')}
            variant={project ? 'brand' : 'primary'}
            disabled={saving}
            style={styles.footerButton}
            onPress={() => void submit()}
          />
        </>
      )}
    >
      <FormError message={error} />
      <AppText style={styles.groupTitle} weight={700}>{t('form.groups.basics')}</AppText>
      <FormField label={t('form.fields.name')} required error={fieldErrors.name}><Input accessibilityLabel={t('form.fields.projectName')} invalid={Boolean(fieldErrors.name)} maxLength={120} value={form.name} onChangeText={(name) => { setForm({ ...form, name }); if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: undefined })); }} /></FormField>
      <FormField label={t('form.fields.code')} optional optionalLabel={t('form.fields.optional')}><Input accessibilityLabel={t('form.fields.projectCode')} maxLength={40} value={form.projectCode} onChangeText={(projectCode) => setForm({ ...form, projectCode })} /></FormField>
      <FormField label={t('form.fields.type')} required><ChoiceRow values={PROJECT_TYPES} selected={form.type} getLabel={(value) => t(projectTypeTranslationKeys[value])} onSelect={(type) => setForm({ ...form, type })} /></FormField>
      <FormField label={t('form.fields.status')} required><ChoiceRow values={allowedStatuses} selected={form.status} getLabel={(value) => t(projectStatusTranslationKeys[value])} onSelect={(status) => setForm({ ...form, status })} /></FormField>
      <AppText style={styles.groupTitle} weight={700}>{t('form.groups.location')}</AppText>
      <FormField label={t('form.fields.addressLine')} optional optionalLabel={t('form.fields.optional')}><Input accessibilityLabel={t('form.fields.addressLine')} maxLength={180} value={form.line1} onChangeText={(line1) => setForm({ ...form, line1 })} /></FormField>
      <View style={styles.row}><FormField label={t('form.fields.city')} optional optionalLabel={t('form.fields.optional')} style={styles.flex}><Input accessibilityLabel={t('form.fields.city')} maxLength={100} value={form.city} onChangeText={(city) => setForm({ ...form, city })} /></FormField><FormField label={t('form.fields.state')} optional optionalLabel={t('form.fields.optional')} style={styles.flex}><Input accessibilityLabel={t('form.fields.state')} maxLength={100} value={form.state} onChangeText={(state) => setForm({ ...form, state })} /></FormField></View>
      <FormField label={t('form.fields.postalCode')} optional optionalLabel={t('form.fields.optional')}><Input accessibilityLabel={t('form.fields.postalCode')} keyboardType="number-pad" maxLength={20} value={form.postalCode} onChangeText={(postalCode) => setForm({ ...form, postalCode })} /></FormField>
      <AppText style={styles.groupTitle} weight={700}>{t('form.groups.timeline')}</AppText>
      <View style={styles.row}><FormField label={t('form.fields.startDate')} optional optionalLabel={t('form.fields.optional')} error={fieldErrors.startDate} style={styles.flex}><DateInput accessibilityLabel={t('form.fields.startDate')} invalid={Boolean(fieldErrors.startDate)} value={form.startDate} onChangeText={(startDate) => { setForm({ ...form, startDate }); setFieldErrors((current) => ({ ...current, startDate: undefined, expectedCompletionDate: undefined })); }} /></FormField><FormField label={t('form.fields.expectedCompletion')} optional optionalLabel={t('form.fields.optional')} error={fieldErrors.expectedCompletionDate} style={styles.flex}><DateInput accessibilityLabel={t('form.fields.expectedCompletion')} invalid={Boolean(fieldErrors.expectedCompletionDate)} minimumDate={parseDateOnly(form.startDate) ?? undefined} value={form.expectedCompletionDate} onChangeText={(expectedCompletionDate) => { setForm({ ...form, expectedCompletionDate }); if (fieldErrors.expectedCompletionDate) setFieldErrors((current) => ({ ...current, expectedCompletionDate: undefined })); }} /></FormField></View>
      <AppText style={styles.groupTitle} weight={700}>{t('form.groups.details')}</AppText>
      <FormField label={t('form.fields.description')} optional optionalLabel={t('form.fields.optional')}><Input accessibilityLabel={t('form.fields.description')} maxLength={2000} multiline numberOfLines={3} value={form.description} onChangeText={(description) => setForm({ ...form, description })} /></FormField>
    </BottomSheet>
  );
}

function ChoiceRow<TValue extends string>({ values, selected, getLabel, onSelect }: { values: readonly TValue[]; selected: TValue; getLabel: (value: TValue) => string; onSelect: (value: TValue) => void }) {
  return <View style={styles.choices}>{values.map((value) => {
    const isSelected = value === selected;
    const tone = getStatusTone(value);
    const isStatus = tone !== 'neutral' || value === 'DRAFT';
    const tokens = badgeToneTokens[tone];
    const label = getLabel(value);
    return <Pressable key={value} accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: isSelected }} style={[styles.choice, isSelected && (isStatus ? { backgroundColor: tokens.background, borderColor: tokens.foreground } : styles.choiceSelected)]} onPress={() => onSelect(value)}><AppText style={[styles.choiceText, isSelected && (isStatus ? { color: tokens.foreground } : styles.choiceTextSelected)]} weight={600}>{label}</AppText></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  groupTitle: { ...mobileText.label, color: mobileTheme.color.text.brand, marginTop: mobileTheme.spacing[2] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3] },
  flex: { flex: 1, flexBasis: 140, minWidth: 140 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  choice: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.component.chip.radius, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: mobileTheme.spacing[3] },
  choiceSelected: { backgroundColor: mobileTheme.color.navigation.floating, borderColor: mobileTheme.color.navigation.floating },
  choiceText: { ...mobileText.label, color: mobileTheme.color.text.primary },
  choiceTextSelected: { color: mobileTheme.color.text.inverse },
  footerButton: { flex: 1 },
});
