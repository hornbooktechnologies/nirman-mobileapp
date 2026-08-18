import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { mobileTheme } from '../../theme';

type ChipProps = PressableProps & {
  label: string;
  selected?: boolean;
};

export function Chip({ label, selected = false, hitSlop = 4, style, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={hitSlop}
      style={(state) => [
        styles.base,
        selected ? styles.selected : styles.default,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : styles.defaultLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  default: {
    backgroundColor: mobileTheme.color.glass.overlay,
    borderColor: mobileTheme.color.border.subtle,
  },
  selected: {
    backgroundColor: mobileTheme.color.action.active,
    borderColor: mobileTheme.color.border.selected,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: mobileTheme.typography.size.sm,
    fontWeight: '700',
  },
  defaultLabel: {
    color: mobileTheme.color.text.secondary,
  },
  selectedLabel: {
    color: mobileTheme.color.text.inverse,
  },
});
