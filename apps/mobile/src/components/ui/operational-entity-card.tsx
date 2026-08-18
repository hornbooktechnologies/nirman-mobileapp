import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import { badgeToneTokens, type BadgeTone } from './badge';

type OperationalEntityCardProps = AccessibilityProps & {
  contextLeading: string;
  contextTrailing?: string;
  title: string;
  supporting?: string;
  value?: string;
  valueLabel?: string;
  footerLeading?: string;
  footerTrailing?: ReactNode;
  tone?: BadgeTone;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function OperationalEntityCard({
  contextLeading,
  contextTrailing,
  title,
  supporting,
  value,
  valueLabel,
  footerLeading,
  footerTrailing,
  tone = 'neutral',
  onPress,
  style,
  ...accessibilityProps
}: OperationalEntityCardProps) {
  const toneTokens = badgeToneTokens[tone];
  const content = (
    <>
      <View style={[styles.contextStrip, { backgroundColor: toneTokens.background, borderLeftColor: toneTokens.foreground }]}>
        <Text numberOfLines={1} style={[styles.contextLeading, { color: toneTokens.foreground }]}>{contextLeading}</Text>
        {contextTrailing ? <Text numberOfLines={1} style={[styles.contextTrailing, { color: toneTokens.foreground }]}>{contextTrailing}</Text> : null}
      </View>
      <View style={styles.primaryRow}>
        <View style={styles.identity}>
          <Text numberOfLines={2} style={styles.title}>{title}</Text>
          {supporting ? <Text numberOfLines={1} style={styles.supporting}>{supporting}</Text> : null}
        </View>
        {value ? (
          <View style={styles.valueWrap}>
            <Text numberOfLines={1} style={styles.value}>{value}</Text>
            {valueLabel ? <Text style={styles.valueLabel}>{valueLabel}</Text> : null}
          </View>
        ) : null}
      </View>
      {(footerLeading || footerTrailing) ? (
        <View style={styles.footer}>
          {footerLeading ? <Text numberOfLines={1} style={styles.footerLeading}>{footerLeading}</Text> : <View style={styles.footerSpacer} />}
          {footerTrailing}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        {...accessibilityProps}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]} {...accessibilityProps}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...mobileShadows.soft,
  },
  pressed: {
    opacity: 0.78,
  },
  contextStrip: {
    alignItems: 'center',
    borderLeftWidth: 4,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    justifyContent: 'space-between',
    minHeight: 34,
    paddingHorizontal: mobileTheme.spacing[4],
    paddingVertical: mobileTheme.spacing[2],
  },
  contextLeading: {
    ...mobileText.caption,
    color: mobileTheme.color.text.brand,
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: mobileTheme.typography.letterSpacing.caps,
  },
  contextTrailing: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    flexShrink: 1,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  primaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    justifyContent: 'space-between',
    minHeight: 66,
    paddingHorizontal: mobileTheme.spacing[4],
    paddingVertical: mobileTheme.spacing[3],
  },
  identity: {
    flex: 1,
    gap: mobileTheme.spacing[1],
    minWidth: 0,
  },
  title: {
    ...mobileText.sectionTitle,
    fontSize: 17,
    lineHeight: 22,
  },
  supporting: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  valueWrap: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '42%',
  },
  value: {
    ...mobileText.sectionTitle,
    color: mobileTheme.color.action.primary,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
    textAlign: 'right',
  },
  valueLabel: {
    ...mobileText.caption,
    color: mobileTheme.color.text.muted,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: mobileTheme.color.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    justifyContent: 'space-between',
    minHeight: 38,
    paddingHorizontal: mobileTheme.spacing[4],
    paddingVertical: mobileTheme.spacing[2],
  },
  footerLeading: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    flex: 1,
  },
  footerSpacer: {
    flex: 1,
  },
});
