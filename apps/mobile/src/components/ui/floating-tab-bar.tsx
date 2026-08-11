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
    <View style={[styles.bar, style]} {...props}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const Icon = tab.icon;

        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={tab.key}
            onPress={() => onChange?.(tab.key)}
            style={[styles.item, active && styles.activeItem]}
          >
            <AppIcon
              color={active ? mobileTheme.color.navigation.iconActive : mobileTheme.color.navigation.icon}
              name={Icon}
              size={active ? mobileTheme.icon.lg : mobileTheme.icon.md}
            />
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
    borderRadius: mobileTheme.radius.full,
    flexDirection: 'row',
    gap: mobileTheme.spacing[1],
    height: 74,
    justifyContent: 'space-between',
    padding: mobileTheme.spacing[2],
    width: '100%',
    ...mobileShadows.navigation,
  },
  item: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.full,
    flex: 1,
    gap: mobileTheme.spacing[1],
    height: 58,
    justifyContent: 'center',
  },
  activeItem: {
    backgroundColor: mobileTheme.color.action.primary,
  },
  label: {
    color: mobileTheme.color.navigation.iconActive,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    lineHeight: 13,
  },
  activeLabel: {
    color: mobileTheme.color.navigation.iconActive,
  },
});
