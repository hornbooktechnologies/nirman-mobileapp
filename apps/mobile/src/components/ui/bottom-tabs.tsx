import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';

export type BottomTabItem = {
  key: string;
  label: string;
  icon?: string;
};

type BottomTabsProps = ViewProps & {
  items: BottomTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function BottomTabs({ items, activeKey, onChange, style, ...props }: BottomTabsProps) {
  return (
    <View style={[styles.nav, style]} {...props}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.item, active && styles.activeItem]}
          >
            {item.icon ? <Text style={[styles.icon, active && styles.activeText]}>{item.icon}</Text> : null}
            <Text style={[styles.label, active && styles.activeText]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    alignItems: 'center',
    backgroundColor: mobileTheme.component.nav.background,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.component.nav.radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[1],
    minHeight: mobileTheme.layout.bottomNavHeight,
    padding: mobileTheme.spacing[2],
    ...mobileShadows.navigation,
  },
  item: {
    alignItems: 'center',
    borderRadius: mobileTheme.component.nav.itemRadius,
    flex: 1,
    gap: mobileTheme.spacing[1],
    justifyContent: 'center',
    minHeight: 58,
  },
  activeItem: {
    backgroundColor: mobileTheme.component.nav.activeBackground,
  },
  icon: {
    color: mobileTheme.color.text.secondary,
    fontSize: mobileTheme.icon.md,
    fontWeight: '800',
  },
  label: {
    color: mobileTheme.color.text.secondary,
    fontSize: mobileTheme.typography.size.xs,
    fontWeight: '800',
  },
  activeText: {
    color: mobileTheme.component.nav.activeForeground,
  },
});
