import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDateOnly, parseDateOnly } from '../../lib/validation';
import { mobileText, mobileTheme } from '../../theme';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import { Button } from './button';
import { BottomSheet } from './modal';

type DateInputProps = {
  accessibilityLabel: string;
  value: string;
  onChangeText: (value: string) => void;
  invalid?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DateInput({
  accessibilityLabel,
  value,
  onChangeText,
  invalid = false,
  minimumDate,
  maximumDate,
}: DateInputProps) {
  const { t, i18n } = useTranslation('common');
  const selectedDate = parseDateOnly(value) ?? new Date();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);
  const displayValue = value && parseDateOnly(value)
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(selectedDate)
    : '';

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChangeText(formatDateOnly(date));
        },
      });
      return;
    }
    setDraftDate(selectedDate);
    setPickerVisible(true);
  }

  return (
    <>
      <View style={[styles.input, invalid && styles.invalid]}>
        {value ? (
          <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ expanded: pickerVisible }}
            style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
            onPress={openPicker}
          >
            <AppIcon name="calendar-month-outline" size={22} color={mobileTheme.color.action.primary} />
            <AppText style={styles.value} weight={500}>{displayValue}</AppText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ expanded: pickerVisible }}
            style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
            onPress={openPicker}
          >
            <AppIcon name="calendar-month-outline" size={22} color={mobileTheme.color.action.primary} />
            <AppText style={[styles.value, styles.placeholder]} weight={500}>{t('date.select')}</AppText>
            <AppIcon name="chevron-down" size={20} color={mobileTheme.color.text.muted} />
          </Pressable>
        )}
        {value ? (
          <Pressable
            accessibilityLabel={t('date.clear')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
            onPress={() => onChangeText('')}
          >
            <AppIcon name="close-circle" size={22} color={mobileTheme.color.text.muted} />
          </Pressable>
        ) : null}
      </View>

      {pickerVisible ? (
        <BottomSheet
          visible
          title={accessibilityLabel}
          showCloseButton={false}
          onClose={() => setPickerVisible(false)}
          footer={(
            <View style={styles.footer}>
              <Button label={t('date.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setPickerVisible(false)} />
              <Button
                label={t('date.selectAction')}
                style={styles.footerButton}
                onPress={() => {
                  onChangeText(formatDateOnly(draftDate));
                  setPickerVisible(false);
                }}
              />
            </View>
          )}
        >
          <DateTimePicker
            display="spinner"
            mode="date"
            value={draftDate}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_, date) => {
              if (date) setDraftDate(date);
            }}
          />
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    alignItems: 'center',
    backgroundColor: mobileTheme.component.field.background,
    borderColor: mobileTheme.component.field.border,
    borderRadius: mobileTheme.component.field.radius,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: mobileTheme.component.field.height,
    overflow: 'hidden',
  },
  openButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: mobileTheme.component.field.height,
    paddingLeft: mobileTheme.spacing[4],
    paddingRight: mobileTheme.spacing[3],
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    width: 48,
  },
  invalid: {
    borderColor: mobileTheme.color.status.danger.foreground,
  },
  pressed: {
    opacity: 0.78,
  },
  value: {
    ...mobileText.body,
    color: mobileTheme.color.text.primary,
    flex: 1,
  },
  placeholder: {
    color: mobileTheme.color.text.muted,
  },
  footer: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  footerButton: {
    flex: 1,
  },
});
