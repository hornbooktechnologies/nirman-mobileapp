import { StyleSheet, Text, View, type SwitchProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';

type ToggleProps = SwitchProps & {
  label?: string;
};

export function Toggle({ label, ...props }: ToggleProps) {
  return (
    <View style={styles.row}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.track, props.value ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.thumb, props.value ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    justifyContent: 'space-between',
    minHeight: 48,
  },
  label: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    flex: 1,
  },
  track: {
    borderRadius: mobileTheme.radius.full,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 58,
  },
  trackOn: {
    backgroundColor: mobileTheme.color.action.primary,
  },
  trackOff: {
    backgroundColor: mobileTheme.color.border.default,
  },
  thumb: {
    backgroundColor: mobileTheme.color.background.elevated,
    borderRadius: mobileTheme.radius.full,
    height: 28,
    width: 28,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
});
