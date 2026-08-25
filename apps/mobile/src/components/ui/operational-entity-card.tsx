import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import { badgeToneTokens, type BadgeTone } from './badge';
import { AppText } from './app-text';

type OperationalEntityCardProps = AccessibilityProps & {
  contextLeading: string;
  contextTrailing?: string;
  title: string;
  supporting?: string;
  value?: string;
  valueLabel?: string;
  footerLeading?: string;
  footerTrailing?: ReactNode;
  details?: ReactNode;
  tone?: BadgeTone;
  compact?: boolean;
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
  details,
  tone = 'neutral',
  compact = false,
  onPress,
  style,
  ...accessibilityProps
}: OperationalEntityCardProps) {
  const toneTokens = badgeToneTokens[tone];
  const content = (
    <>
      <View style={[styles.contextStrip, compact && styles.contextStripCompact, { backgroundColor: toneTokens.background, borderLeftColor: toneTokens.foreground }]}>
        <AppText numberOfLines={1} style={[styles.contextLeading, { color: toneTokens.foreground }]} weight={700}>{contextLeading}</AppText>
        {contextTrailing ? <AppText numberOfLines={1} style={[styles.contextTrailing, { color: toneTokens.foreground }]} weight={700}>{contextTrailing}</AppText> : null}
      </View>
      <View style={[styles.primaryRow, compact && styles.primaryRowCompact]}>
        <View style={styles.identity}>
          <AppText numberOfLines={2} style={styles.title} weight={700}>{title}</AppText>
          {supporting ? <AppText numberOfLines={1} style={styles.supporting} weight={500}>{supporting}</AppText> : null}
        </View>
        {value ? (
          <View style={styles.valueWrap}>
            <AppText numberOfLines={1} style={styles.value} weight={700}>{value}</AppText>
            {valueLabel ? <AppText style={styles.valueLabel} weight={700}>{valueLabel}</AppText> : null}
          </View>
        ) : null}
      </View>
      {details ? <View style={styles.details}>{details}</View> : null}
      {(footerLeading || footerTrailing) ? (
        <View style={[styles.footer, compact && styles.footerCompact]}>
          {footerLeading ? <AppText numberOfLines={1} style={styles.footerLeading} weight={500}>{footerLeading}</AppText> : <View style={styles.footerSpacer} />}
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
    borderRadius: mobileTheme.component.card.radius,
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
  },
  contextStripCompact: {
    minHeight: 30,
    paddingVertical: mobileTheme.spacing[1],
  },
  contextTrailing: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    flexShrink: 1,
    textAlign: 'right',
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
  primaryRowCompact: {
    minHeight: 52,
    paddingVertical: mobileTheme.spacing[2],
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
  },
  details: {
    borderTopColor: mobileTheme.color.border.subtle,
    borderTopWidth: 1,
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
  footerCompact: {
    minHeight: 34,
    paddingVertical: mobileTheme.spacing[1],
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
