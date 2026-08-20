import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';
import { AppText } from './app-text';

type FloatingActionButtonProps = PressableProps & {
  label?: string;
};

export function FloatingActionButton({ label = '+', style, ...props }: FloatingActionButtonProps) {
  return (
    <Pressable accessibilityRole="button" style={(state) => [styles.fab, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]} {...props}>
      <AppText style={styles.label} weight={700}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.action.primary,
    borderRadius: mobileTheme.radius.full,
    height: 60,
    justifyContent: 'center',
    width: 60,
    ...mobileShadows.copperGlow,
  },
  pressed: {
    opacity: 0.84,
  },
  label: {
    color: mobileTheme.color.text.inverse,
    fontSize: mobileTheme.icon.lg,
    fontWeight: '800',
  },
});
