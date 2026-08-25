import type { AttendanceDuration, AttendanceSummaryRow } from '@nirman-app/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet, Button, Chip, FormError, FormField, Input } from '../../components/ui';
import { mobileTheme } from '../../theme';

export type AttendanceExceptionDraft = {
  duration: AttendanceDuration;
  reasonCode: string;
  notes: string;
};

export const emptyAttendanceExceptionDraft: AttendanceExceptionDraft = {
  duration: 'FULL_DAY',
  reasonCode: '',
  notes: '',
};

export function AttendanceExceptionSheet({
  canSave,
  date,
  draft,
  error,
  locale,
  projectName,
  row,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  canSave: boolean;
  date: string;
  draft: AttendanceExceptionDraft;
  error: string;
  locale: string;
  projectName: string;
  row: AttendanceSummaryRow;
  saving: boolean;
  onChange: (draft: AttendanceExceptionDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation('attendance');
  const { t: tCommon } = useTranslation('common');
  const isEditing = Boolean(row.selectedDate?.exception);

  return (
    <BottomSheet
      visible
      scroll
      showCloseButton={false}
      title={t(isEditing ? 'sheet.editTitle' : 'sheet.createTitle')}
      description={t('sheet.description')}
      onClose={onClose}
      footer={(
        <View style={styles.footer}>
          <Button disabled={saving} label={tCommon('actions.cancel')} variant="secondary" style={styles.footerButton} onPress={onClose} />
          <Button
            disabled={saving || !canSave}
            label={saving ? t('actions.saving') : t(isEditing ? 'actions.updateAttendance' : 'actions.saveAbsence')}
            style={styles.footerButton}
            onPress={onSave}
          />
        </View>
      )}
    >
      <FormError message={error} />
      <FormField label={t('form.worker')}>
        <Input editable={false} value={`${row.worker.name} · ${row.worker.workerCode} · ${row.worker.trade}`} />
      </FormField>
      <FormField label={t('form.selectedProject')}>
        <Input editable={false} value={projectName} />
      </FormField>
      <FormField label={t('form.date')} required>
        <Input editable={false} value={new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00`))} />
      </FormField>
      <FormField label={t('form.duration')} required>
        <View accessibilityRole="radiogroup" style={styles.durationRow}>
          {(['FULL_DAY', 'HALF_DAY'] as const).map((duration) => (
            <Chip
              key={duration}
              accessibilityRole="radio"
              accessibilityState={{ selected: draft.duration === duration }}
              label={t(`durations.${duration}`)}
              selected={draft.duration === duration}
              style={styles.durationChip}
              onPress={() => onChange({ ...draft, duration })}
            />
          ))}
        </View>
      </FormField>
      <FormField label={t('form.reason')} optional>
        <Input accessibilityLabel={t('form.reason')} maxLength={80} value={draft.reasonCode} onChangeText={(reasonCode) => onChange({ ...draft, reasonCode })} />
      </FormField>
      <FormField label={t('form.notes')} optional>
        <Input
          accessibilityLabel={t('form.notes')}
          maxLength={2000}
          multiline
          numberOfLines={4}
          style={styles.notesInput}
          textAlignVertical="top"
          value={draft.notes}
          onChangeText={(notes) => onChange({ ...draft, notes })}
        />
      </FormField>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[2] },
  footerButton: { flex: 1 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  durationChip: { flexGrow: 1, minHeight: 48 },
  notesInput: { minHeight: 104, paddingTop: mobileTheme.spacing[3] },
});
