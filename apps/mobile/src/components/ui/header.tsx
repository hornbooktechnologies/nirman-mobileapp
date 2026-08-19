import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { AppText } from './app-text';

type HeaderProps = ViewProps & {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
};

export function Header({ title, eyebrow, subtitle, action, style, ...props }: HeaderProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      <View style={styles.textWrap}>
        {eyebrow ? <AppText style={styles.eyebrow} weight={700}>{eyebrow}</AppText> : null}
        <AppText style={styles.title} weight={700}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function SectionHeader({ title, subtitle, action, style, ...props }: HeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]} {...props}>
      <View style={styles.textWrap}>
        <AppText style={styles.sectionTitle} weight={700}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: mobileTheme.spacing[4],
    justifyContent: 'space-between',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    justifyContent: 'space-between',
  },
  textWrap: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  eyebrow: {
    ...mobileText.caption,
    color: mobileTheme.color.action.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    ...mobileText.title,
  },
  sectionTitle: {
    ...mobileText.sectionTitle,
  },
  subtitle: {
    ...mobileText.body,
  },
  action: {
    flexShrink: 0,
  },
});
