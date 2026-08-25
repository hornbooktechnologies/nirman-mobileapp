import type { ReactNode, Ref } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { AppText } from './app-text';

type CompactScreenHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  action?: ReactNode;
  copyRef?: Ref<View>;
};

export function CompactScreenHeader({ title, subtitle, leading, action, copyRef, style, ...props }: CompactScreenHeaderProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <View ref={copyRef} accessible accessibilityRole="header" style={styles.copy}>
        <AppText numberOfLines={2} style={styles.title} weight={700}>{title}</AppText>
        {subtitle ? <AppText numberOfLines={2} style={styles.subtitle} weight={500}>{subtitle}</AppText> : null}
      </View>
      {action ? <View style={styles.slot}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 56,
  },
  slot: {
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
    minWidth: 0,
  },
  title: {
    ...mobileText.sectionTitle,
    fontSize: 22,
    lineHeight: 27,
  },
  subtitle: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
});
