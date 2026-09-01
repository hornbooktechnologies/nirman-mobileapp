import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileText, mobileTheme } from '../../theme';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import { Button } from './button';
import { BottomSheet } from './modal';

type TimeInputProps = {
  accessibilityLabel: string;
  value: string;
  onChangeText: (value: string) => void;
  invalid?: boolean;
};

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return new Date();
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function formatTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TimeInput({ accessibilityLabel, value, onChangeText, invalid = false }: TimeInputProps) {
  const { t, i18n } = useTranslation('common');
  const selectedTime = parseTime(value);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftTime, setDraftTime] = useState(selectedTime);
  const displayValue = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(selectedTime);

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedTime,
        mode: 'time',
        display: 'clock',
        is24Hour: false,
        onChange: (event, time) => {
          if (event.type === 'set' && time) onChangeText(formatTimeValue(time));
        },
      });
      return;
    }
    setDraftTime(selectedTime);
    setPickerVisible(true);
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`${accessibilityLabel}: ${displayValue}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: pickerVisible }}
        style={({ pressed }) => [styles.input, invalid && styles.invalid, pressed && styles.pressed]}
        onPress={openPicker}
      >
        <AppIcon name="clock-outline" size={22} color={mobileTheme.color.action.primary} />
        <AppText style={styles.value} weight={500}>{displayValue}</AppText>
        <AppIcon name="chevron-down" size={20} color={mobileTheme.color.text.muted} />
      </Pressable>

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
                  onChangeText(formatTimeValue(draftTime));
                  setPickerVisible(false);
                }}
              />
            </View>
          )}
        >
          <DateTimePicker
            display="spinner"
            mode="time"
            is24Hour={false}
            value={draftTime}
            onChange={(_, time) => {
              if (time) setDraftTime(time);
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
    gap: mobileTheme.spacing[3],
    minHeight: mobileTheme.component.field.height,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  invalid: { borderColor: mobileTheme.color.status.danger.foreground },
  pressed: { opacity: 0.78 },
  value: { ...mobileText.body, color: mobileTheme.color.text.primary, flex: 1 },
  footer: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
});
