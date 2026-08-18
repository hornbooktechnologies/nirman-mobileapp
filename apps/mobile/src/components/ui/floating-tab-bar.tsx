import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';

type FloatingTab = {
  key: string;
  icon: AppIconName;
  label: string;
};

type FloatingTabBarProps = ViewProps & {
  tabs: readonly FloatingTab[];
  activeKey: string;
  onChange?: (key: string) => void;
};

export function FloatingTabBar({ tabs, activeKey, onChange, style, ...props }: FloatingTabBarProps) {
  return (
    <View accessibilityLabel="Main navigation" style={[styles.bar, style]} {...props}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const Icon = tab.icon;

        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityHint={`Open ${tab.label}`}
            key={tab.key}
            onPress={() => onChange?.(tab.key)}
            style={({ pressed }) => [styles.item, active && styles.activeItem, pressed && styles.pressedItem]}
          >
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.iconShell, active && styles.activeIconShell]}>
              <AppIcon
                color={active ? mobileTheme.color.action.primary : mobileTheme.color.navigation.icon}
                name={Icon}
                size={mobileTheme.icon.md}
              />
            </View>
            {tab.key !== 'create' ? (
              <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: mobileTheme.color.navigation.floating,
    borderColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.xxl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[1],
    minHeight: 76,
    justifyContent: 'space-between',
    padding: mobileTheme.spacing[2],
    width: '100%',
    ...mobileShadows.navigation,
  },
  item: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.xl,
    flex: 1,
    gap: mobileTheme.spacing[1],
    minHeight: 58,
    justifyContent: 'center',
  },
  activeItem: {
    backgroundColor: mobileTheme.color.background.elevated,
    ...mobileShadows.soft,
  },
  pressedItem: {
    opacity: 0.72,
  },
  iconShell: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.full,
    height: 28,
    justifyContent: 'center',
    width: 34,
  },
  activeIconShell: {
    backgroundColor: mobileTheme.color.brand.secondarySoft,
  },
  label: {
    color: mobileTheme.color.navigation.icon,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
  },
  activeLabel: {
    color: mobileTheme.color.text.primary,
    fontFamily: 'Manrope_700Bold',
  },
});
