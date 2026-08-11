import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';

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
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.trailing}>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
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
