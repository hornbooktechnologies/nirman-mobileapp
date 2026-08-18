import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';
import { actionToneTokens, type ActionTone } from './action-list-item';

export type QuickActionItem = {
  key: string;
  label: string;
  accessibilityLabel: string;
  icon: AppIconName;
  tone?: Exclude<ActionTone, 'danger' | 'neutral'>;
  onPress: () => void;
};

export function QuickActionGrid({ items }: { items: QuickActionItem[] }) {
  if (!items.length) return null;

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable
          accessibilityLabel={item.accessibilityLabel}
          accessibilityRole="button"
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => {
            const tokens = actionToneTokens[item.tone ?? 'brand'];
            return [styles.item, { backgroundColor: tokens.background, borderColor: tokens.border }, items.length === 1 && styles.singleItem, pressed && styles.pressed];
          }}
        >
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.iconShell, { borderColor: actionToneTokens[item.tone ?? 'brand'].border }]}>
            <AppIcon color={actionToneTokens[item.tone ?? 'brand'].foreground} name={item.icon} size={mobileTheme.icon.md} />
          </View>
          <Text style={[styles.label, { color: actionToneTokens[item.tone ?? 'brand'].foreground }]}>{item.label}</Text>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppIcon color={actionToneTokens[item.tone ?? 'brand'].foreground} name="chevron-right" size={mobileTheme.icon.sm} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  item: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    minHeight: 56,
    paddingHorizontal: mobileTheme.spacing[3],
    ...mobileShadows.soft,
  },
  singleItem: {
    maxWidth: '100%',
  },
  pressed: {
    opacity: 0.78,
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderRadius: mobileTheme.component.iconContainer.radius,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  label: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    flex: 1,
    fontSize: 14,
  },
});
