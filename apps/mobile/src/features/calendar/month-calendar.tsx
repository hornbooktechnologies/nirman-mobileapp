import type { EffectiveProjectWorkCalendarResponse, EffectiveWorkCalendarDay, Weekday } from '@nirman-app/shared';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon, AppText, Card } from '../../components/ui';
import { useLocalization } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { calendarDays, todayDateOnly } from '../attendance/date-utils';

const weekdayOrder: Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const dayColors = {
  WORKING: mobileTheme.color.status.success,
  SPECIAL_WORKING: mobileTheme.color.status.info,
  NON_WORKING: mobileTheme.color.status.warning,
  UNCONFIGURED: mobileTheme.color.status.neutral,
} as const;

const CalendarDay = memo(function CalendarDay({ day, selected, onSelect }: {
  day: EffectiveWorkCalendarDay;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const { t } = useTranslation('calendar');
  const { locale } = useLocalization();
  const isToday = day.date === todayDateOnly();
  const tokens = dayColors[day.dayType];
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(`${day.date}T12:00:00`));
  return (
    <Pressable
      accessibilityLabel={t('month.dayA11y', { date: dateLabel, state: t(`dayTypes.${day.dayType}`) })}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect(day.date)}
      style={({ pressed }) => [
        styles.day,
        { backgroundColor: selected ? mobileTheme.color.action.primaryHover : tokens.background },
        selected && styles.selectedDay,
        isToday && styles.today,
        pressed && styles.pressed,
      ]}
    >
      <AppText style={[styles.dayNumber, { color: selected ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary }]} weight={700}>
        {new Intl.NumberFormat(locale).format(Number(day.date.slice(-2)))}
      </AppText>
      <AppText numberOfLines={1} style={[styles.dayState, { color: selected ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary }]} weight={700}>
        {t(`dayShort.${day.dayType}`)}
      </AppText>
      {selected ? <AppIcon color={mobileTheme.color.text.inverse} name="check" size={14} /> : isToday ? <View style={styles.todayDot} /> : null}
    </Pressable>
  );
});

export function MonthCalendar({ calendar, month, selectedDate, onSelectDate }: {
  calendar: EffectiveProjectWorkCalendarResponse;
  month: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const { t } = useTranslation('calendar');
  const gridDates = useMemo(() => calendarDays(month), [month]);
  const daysByDate = useMemo(() => new Map(calendar.days.map((day) => [day.date, day])), [calendar.days]);

  return (
    <Card padding="none" style={styles.calendarCard}>
      <View style={styles.weekdayRow}>
        {weekdayOrder.map((weekday) => (
          <View key={weekday} style={styles.weekdayCell}>
            <AppText style={styles.weekday} weight={700}>{t(`weekdaysShort.${weekday}`)}</AppText>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {gridDates.map((date, index) => {
          const day = date ? daysByDate.get(date) : null;
          return day ? (
            <CalendarDay key={day.date} day={day} selected={day.date === selectedDate} onSelect={onSelectDate} />
          ) : <View key={`empty-${index}`} style={styles.emptyDay} />;
        })}
      </View>
      <View style={styles.legend}>
        {(['WORKING', 'NON_WORKING', 'SPECIAL_WORKING'] as const).map((type) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: dayColors[type].background, borderColor: dayColors[type].border }]} />
            <AppText style={styles.legendLabel} weight={500}>{t(`dayTypes.${type}`)}</AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  calendarCard: { overflow: 'hidden' },
  weekdayRow: { backgroundColor: mobileTheme.color.background.mist, flexDirection: 'row' },
  weekdayCell: { alignItems: 'center', flexBasis: `${100 / 7}%`, justifyContent: 'center', minHeight: 40 },
  weekday: { ...mobileText.caption, color: mobileTheme.color.text.secondary, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { alignItems: 'center', borderColor: mobileTheme.color.border.subtle, borderRightWidth: 1, borderTopWidth: 1, flexBasis: `${100 / 7}%`, gap: 1, justifyContent: 'center', minHeight: 58, paddingVertical: mobileTheme.spacing[1] },
  emptyDay: { borderColor: mobileTheme.color.border.subtle, borderRightWidth: 1, borderTopWidth: 1, flexBasis: `${100 / 7}%`, minHeight: 58 },
  selectedDay: { borderColor: mobileTheme.color.border.selected, borderWidth: 2 },
  today: { borderBottomColor: mobileTheme.color.action.primary, borderBottomWidth: 3 },
  pressed: { opacity: 0.76 },
  dayNumber: { fontSize: 15, fontVariant: ['tabular-nums'], lineHeight: 20 },
  dayState: { fontSize: 9, lineHeight: 12 },
  todayDot: { backgroundColor: mobileTheme.color.action.primary, borderRadius: mobileTheme.radius.full, height: 5, width: 5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3], padding: mobileTheme.spacing[3] },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  legendSwatch: { borderRadius: mobileTheme.radius.sm, borderWidth: 1, height: 14, width: 14 },
  legendLabel: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
});
