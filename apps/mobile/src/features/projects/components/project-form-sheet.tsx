import {
  PROJECT_STATUS_TRANSITIONS,
  PROJECT_TYPES,
  projectValidationIssues,
  type ProjectValidationField,
  type ProjectStatus,
  type ProjectType,
} from '@nirman-app/shared';
import { useRef, useState } from 'react';
import { Pressable, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, DateInput, FormError, FormField, Input, badgeToneTokens, getStatusTone } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { parseDateOnly } from '../../../lib/validation';
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
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  startDate: string;
  expectedCompletionDate: string;
  description: string;
};

type ProjectFormErrors = Partial<Record<ProjectValidationField, string>>;

function initialForm(project?: Project): ProjectForm {
  return {
    name: project?.name ?? '',
    projectCode: project?.projectCode ?? '',
    type: project?.type ?? 'RESIDENTIAL',
    status: project?.status ?? 'DRAFT',
    line1: project?.address.line1 ?? '',
    line2: project?.address.line2 ?? '',
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
  const [touched, setTouched] = useState<Partial<Record<ProjectValidationField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const fieldPositions = useRef<Partial<Record<ProjectValidationField, number>>>({});
  const issues = projectValidationIssues(form);
  const allErrors: ProjectFormErrors = Object.fromEntries(Object.entries(issues).map(([field, issue]) => [field,
    issue.rule === 'required' ? t('form.errors.nameRequired')
      : issue.rule === 'maxLength' ? tCommon('validation.maxLength', { count: issue.limit })
      : issue.rule === 'date' ? tCommon('validation.date')
      : t('form.errors.completionBeforeStart'),
  ]));
  const fieldErrors: ProjectFormErrors = Object.fromEntries(Object.entries(allErrors).filter(([field]) => submitted || touched[field as ProjectValidationField]));
  const blur = (field: ProjectValidationField) => setTouched((current) => ({ ...current, [field]: true }));
  const allowedStatuses: readonly ProjectStatus[] = project
    ? [project.status, ...PROJECT_STATUS_TRANSITIONS[project.status]].filter((status) => status !== 'ARCHIVED')
    : ['DRAFT', 'ACTIVE'];

  async function submit() {
    if (saving) return;
    setError('');
    setSubmitted(true);
    const firstInvalid = Object.keys(allErrors)[0] as ProjectValidationField | undefined;
    if (firstInvalid) {
      scrollRef.current?.scrollTo({ y: Math.max(0, (fieldPositions.current[firstInvalid] ?? 0) - 12), animated: true });
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
          line2: form.line2.trim() || null,
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
      scrollRef={scrollRef}
      showCloseButton={false}
      title={project ? t('form.editTitle') : t('form.newTitle')}
      description={project ? project.name : t('form.newDescription')}
      onClose={() => { if (!saving) onClose(); }}
      footer={(
        <>
          <Button label={t('form.actions.cancel')} disabled={saving} variant="secondary" style={styles.footerButton} onPress={onClose} />
          <Button validateForm
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
      <FormField label={t('form.fields.name')} required onLayout={(event) => { fieldPositions.current.name = event.nativeEvent.layout.y; }} error={fieldErrors.name}><Input accessibilityLabel={t('form.fields.projectName')} invalid={Boolean(fieldErrors.name)} maxLength={120} value={form.name} onBlur={() => blur('name')} onChangeText={(name) => setForm({ ...form, name })} /></FormField>
      <FormField label={t('form.fields.code')}><Input accessibilityLabel={t('form.fields.projectCode')} maxLength={40} value={form.projectCode} onChangeText={(projectCode) => setForm({ ...form, projectCode })} /></FormField>
      <FormField label={t('form.fields.type')} required><ChoiceRow values={PROJECT_TYPES} selected={form.type} getLabel={(value) => t(projectTypeTranslationKeys[value])} onSelect={(type) => setForm({ ...form, type })} /></FormField>
      <FormField label={t('form.fields.status')}><ChoiceRow values={allowedStatuses} selected={form.status} getLabel={(value) => t(projectStatusTranslationKeys[value])} onSelect={(status) => setForm({ ...form, status })} /></FormField>
      <AppText style={styles.groupTitle} weight={700}>{t('form.groups.location')}</AppText>
      <FormField label={t('form.fields.addressLine')}><Input accessibilityLabel={t('form.fields.addressLine')} maxLength={180} value={form.line1} onChangeText={(line1) => setForm({ ...form, line1 })} /></FormField>
      <FormField label={t('form.fields.addressLine2')}><Input accessibilityLabel={t('form.fields.addressLine2')} maxLength={180} value={form.line2} onChangeText={(line2) => setForm({ ...form, line2 })} /></FormField>
      <View style={styles.row}><FormField label={t('form.fields.city')} style={styles.flex}><Input accessibilityLabel={t('form.fields.city')} maxLength={100} value={form.city} onChangeText={(city) => setForm({ ...form, city })} /></FormField><FormField label={t('form.fields.state')} style={styles.flex}><Input accessibilityLabel={t('form.fields.state')} maxLength={100} value={form.state} onChangeText={(state) => setForm({ ...form, state })} /></FormField></View>
      <FormField label={t('form.fields.postalCode')}><Input accessibilityLabel={t('form.fields.postalCode')} keyboardType="number-pad" maxLength={20} value={form.postalCode} onChangeText={(postalCode) => setForm({ ...form, postalCode })} /></FormField>
      <AppText style={styles.groupTitle} weight={700}>{t('form.groups.timeline')}</AppText>
      <View style={styles.row} onLayout={(event) => { fieldPositions.current.startDate = event.nativeEvent.layout.y; fieldPositions.current.expectedCompletionDate = event.nativeEvent.layout.y; }}><FormField label={t('form.fields.startDate')} error={fieldErrors.startDate} style={styles.flex}><DateInput accessibilityLabel={t('form.fields.startDate')} invalid={Boolean(fieldErrors.startDate)} value={form.startDate} onBlur={() => blur('startDate')} onChangeText={(startDate) => { setForm({ ...form, startDate }); blur('startDate'); }} /></FormField><FormField label={t('form.fields.expectedCompletion')} error={fieldErrors.expectedCompletionDate} style={styles.flex}><DateInput accessibilityLabel={t('form.fields.expectedCompletion')} invalid={Boolean(fieldErrors.expectedCompletionDate)} minimumDate={parseDateOnly(form.startDate) ?? undefined} value={form.expectedCompletionDate} onBlur={() => blur('expectedCompletionDate')} onChangeText={(expectedCompletionDate) => { setForm({ ...form, expectedCompletionDate }); blur('expectedCompletionDate'); }} /></FormField></View>
      <AppText style={styles.groupTitle} weight={700}>{t('form.groups.details')}</AppText>
      <FormField label={t('form.fields.description')}><Input accessibilityLabel={t('form.fields.description')} maxLength={2000} multiline numberOfLines={3} value={form.description} onChangeText={(description) => setForm({ ...form, description })} /></FormField>
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
