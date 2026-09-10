import { PROJECT_PROGRESS_STAGES, type ProjectProgressStage, type ProjectProgressSummary } from '@nirman-app/shared';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, Card, DateInput, FormError, FormField, Input, SearchableSelect } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { formatDateOnly } from '../../lib/validation';
import { mobileText, mobileTheme } from '../../theme';
import { recordProgressUpdate } from './services';

const mutationKey = () => `progress-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const presets = [0, 25, 50, 75, 100] as const;

type Props = {
  visible: boolean;
  organizationId: string;
  projectId: string;
  accessToken: string;
  summary: ProjectProgressSummary;
  onClose: () => void;
  onSaved: (summary: ProjectProgressSummary) => void;
  onConflict: () => Promise<void>;
};

export function ProgressUpdateSheet({
  visible,
  organizationId,
  projectId,
  accessToken,
  summary,
  onClose,
  onSaved,
  onConflict,
}: Props) {
  const { t } = useTranslation('progress');
  const { t: tCommon } = useTranslation('common');
  const initialStage = summary.stages.find((item) => item.percentage < 100)?.stage ?? 'HANDOVER';
  const [stage, setStage] = useState<ProjectProgressStage>(initialStage);
  const [percentage, setPercentage] = useState('');
  const [updateDate, setUpdateDate] = useState(formatDateOnly(new Date()));
  const [notes, setNotes] = useState('');
  const [key, setKey] = useState(mutationKey);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const current = useMemo(
    () => summary.stages.find((item) => item.stage === stage)?.percentage ?? 0,
    [stage, summary.stages],
  );

  useEffect(() => {
    if (!visible) return;
    const nextStage = summary.stages.find((item) => item.percentage < 100)?.stage ?? 'HANDOVER';
    const nextValue = summary.stages.find((item) => item.stage === nextStage)?.percentage ?? 0;
    setStage(nextStage);
    setPercentage(String(nextValue));
    setUpdateDate(formatDateOnly(new Date()));
    setNotes('');
    setKey(mutationKey());
    setWorking(false);
    setError('');
  }, [summary, visible]);

  async function save() {
    const numeric = Number(percentage);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100 || !/^\d+(\.\d{1,2})?$/.test(percentage)) {
      setError(t('validation.percentage'));
      return;
    }
    if (!updateDate) {
      setError(t('validation.date'));
      return;
    }
    if (numeric < current && !notes.trim()) {
      setError(t('validation.regressionNote'));
      return;
    }
    setWorking(true);
    setError('');
    try {
      const next = await recordProgressUpdate(organizationId, projectId, accessToken, {
        stage,
        percentage: numeric,
        updateDate,
        notes: notes.trim() || null,
        expectedPreviousPercentage: summary.stages.find((item) => item.stage === stage)?.lastUpdate
          ? current
          : null,
        idempotencyKey: key,
      });
      onSaved(next);
      onClose();
    } catch (saveError) {
      setError(getLocalizedErrorMessage(saveError, t('errors.saveFailed')));
      if (saveError instanceof ApiRequestError && saveError.code === 'PROGRESS_VERSION_CONFLICT') {
        await onConflict();
        setKey(mutationKey());
      }
    } finally {
      setWorking(false);
    }
  }

  const stageField = t('fields.stage');
  return (
    <BottomSheet
      visible={visible}
      title={t('update.title')}
      description={t('update.description')}
      scroll
      showCloseButton={false}
      onClose={onClose}
      footer={(
        <View style={styles.footer}>
          <Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" disabled={working} onPress={onClose} />
          <Button style={styles.footerButton} label={working ? t('loading.saving') : t('update.save')} disabled={working} onPress={() => void save()} />
        </View>
      )}
    >
      <FormError message={error} />
      <FormField label={stageField} required>
        <SearchableSelect
          value={stage}
          options={PROJECT_PROGRESS_STAGES.map((value) => ({ value, label: t(`stage.${value}`) }))}
          accessibilityLabel={stageField}
          emptyDescription={t('select.emptyDescription')}
          emptyTitle={t('select.emptyTitle')}
          placeholder={t('select.chooseStage')}
          searchAccessibilityLabel={t('select.searchA11y')}
          searchPlaceholder={t('select.search')}
          title={t('select.chooseStage')}
          onChange={(value) => {
            setStage(value);
            const next = summary.stages.find((item) => item.stage === value)?.percentage ?? 0;
            setPercentage(String(next));
            setNotes('');
            setKey(mutationKey());
          }}
        />
      </FormField>

      <Card variant="blueprint" style={styles.currentCard}>
        <AppText style={styles.currentLabel} weight={700}>{t('update.current')}</AppText>
        <AppText style={styles.currentValue} weight={700}>{current}%</AppText>
      </Card>

      <FormField label={t('fields.percentage')} required helperText={t('update.percentageHelp')}>
        <View style={styles.presets} accessibilityRole="radiogroup">
          {presets.map((value) => (
            <Pressable
              key={value}
              accessibilityLabel={t('update.presetA11y', { value })}
              accessibilityRole="radio"
              accessibilityState={{ checked: Number(percentage) === value }}
              onPress={() => { setPercentage(String(value)); setKey(mutationKey()); }}
              style={({ pressed }) => [styles.preset, Number(percentage) === value && styles.presetSelected, pressed && styles.pressed]}
            >
              <AppText style={[styles.presetText, Number(percentage) === value && styles.presetTextSelected]} weight={700}>{value}%</AppText>
            </Pressable>
          ))}
        </View>
        <Input
          accessibilityLabel={t('fields.percentage')}
          keyboardType="decimal-pad"
          maxLength={6}
          value={percentage}
          onChangeText={(value) => { setPercentage(value.replace(/[^0-9.]/g, '')); setKey(mutationKey()); }}
        />
      </FormField>

      <FormField label={t('fields.updateDate')} required>
        <DateInput
          accessibilityLabel={t('fields.updateDate')}
          allowClear={false}
          maximumDate={new Date()}
          value={updateDate}
          onChangeText={(value) => { setUpdateDate(value); setKey(mutationKey()); }}
        />
      </FormField>

      <FormField
        label={t('fields.notes')}
        required={Number(percentage) < current}
        optional={Number(percentage) >= current}
        helperText={Number(percentage) < current ? t('update.regressionHelp') : t('update.notesHelp')}
      >
        <Input
          accessibilityLabel={t('fields.notes')}
          multiline
          numberOfLines={4}
          maxLength={2000}
          style={styles.notes}
          value={notes}
          onChangeText={(value) => { setNotes(value); setKey(mutationKey()); }}
        />
      </FormField>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  currentCard: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  currentLabel: { ...mobileText.label, color: mobileTheme.color.text.secondary },
  currentValue: { ...mobileText.sectionTitle, color: mobileTheme.color.action.primary, fontVariant: ['tabular-nums'] },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2], marginBottom: mobileTheme.spacing[3] },
  preset: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.full, borderWidth: 1, justifyContent: 'center', minHeight: 46, minWidth: 58, paddingHorizontal: mobileTheme.spacing[3] },
  presetSelected: { backgroundColor: mobileTheme.color.status.info.background, borderColor: mobileTheme.color.border.selected },
  presetText: { ...mobileText.label, color: mobileTheme.color.text.secondary },
  presetTextSelected: { color: mobileTheme.color.action.primary },
  pressed: { opacity: 0.78 },
  notes: { minHeight: 104, paddingTop: mobileTheme.spacing[3], textAlignVertical: 'top' },
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
});
