import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { AppText } from './app-text';

type ListItemProps = PressableProps & {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function ListItem({ title, subtitle, meta, leading, trailing, style, ...props }: ListItemProps) {
  return (
    <Pressable style={(state) => [styles.row, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]} {...props}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.content}>
        <AppText style={styles.title} weight={700}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle} weight={500}>{subtitle}</AppText> : null}
      </View>
      <View style={styles.trailing}>
        {meta ? <AppText style={styles.meta} weight={600}>{meta}</AppText> : null}
        {trailing}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
    minHeight: 72,
    paddingVertical: mobileTheme.spacing[3],
  },
  pressed: {
    opacity: 0.86,
  },
  leading: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  title: {
    ...mobileText.sectionTitle,
    fontSize: mobileTheme.typography.size.lg,
  },
  subtitle: {
    ...mobileText.caption,
  },
  meta: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    flexShrink: 0,
    fontSize: mobileTheme.typography.size.lg,
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: mobileTheme.spacing[2],
  },
});
