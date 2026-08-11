import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';

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
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function SectionHeader({ title, subtitle, action, style, ...props }: HeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]} {...props}>
      <View style={styles.textWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
