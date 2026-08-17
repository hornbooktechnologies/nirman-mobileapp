import { StyleSheet, Switch, Text, View, type SwitchProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';

type ToggleProps = SwitchProps & {
  label?: string;
};

export function Toggle({ label, ...props }: ToggleProps) {
  return (
    <View style={styles.row}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Switch
        accessibilityLabel={props.accessibilityLabel ?? label}
        ios_backgroundColor={mobileTheme.color.border.default}
        thumbColor={mobileTheme.color.background.elevated}
        trackColor={{
          false: mobileTheme.color.border.default,
          true: mobileTheme.color.action.primary,
        }}
        {...props}
      />
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
});
