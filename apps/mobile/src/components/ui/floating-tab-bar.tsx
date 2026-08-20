import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileShadows, mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';
import { AppText } from './app-text';

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
  const { t } = useTranslation('navigation');

  return (
    <View accessibilityLabel={t('a11y.main')} accessibilityRole="tablist" style={[styles.bar, style]} {...props}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;

        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityHint={t('a11y.open', { screen: tab.label })}
            key={tab.key}
            onPress={() => onChange?.(tab.key)}
            style={({ pressed }) => [
              styles.item,
              active && styles.activeItem,
              pressed && (active ? styles.activePressedItem : styles.pressedItem),
            ]}
          >
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.iconSlot}>
              <AppIcon
                color={active ? mobileTheme.component.nav.activeForeground : mobileTheme.component.nav.inactiveForeground}
                name={tab.icon}
                size={mobileTheme.icon.md}
              />
            </View>
            {tab.key !== 'create' ? (
              <AppText style={[styles.label, active && styles.activeLabel]} weight={active ? 700 : 600}>
                {tab.label}
              </AppText>
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
    backgroundColor: mobileTheme.component.nav.background,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.component.nav.radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[1],
    minHeight: mobileTheme.layout.bottomNavHeight,
    justifyContent: 'space-between',
    padding: mobileTheme.spacing[2],
    width: '86%',
    ...mobileShadows.navigation,
  },
  item: {
    alignItems: 'center',
    borderRadius: mobileTheme.component.nav.itemRadius,
    flex: 1,
    gap: 2,
    minHeight: 48,
    justifyContent: 'center',
  },
  activeItem: {
    backgroundColor: mobileTheme.component.nav.activeBackground,
  },
  pressedItem: {
    backgroundColor: mobileTheme.color.surface.mist,
  },
  activePressedItem: {
    opacity: 0.82,
  },
  iconSlot: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 28,
  },
  label: {
    color: mobileTheme.component.nav.inactiveForeground,
    fontSize: 12,
    lineHeight: 15,
  },
  activeLabel: {
    color: mobileTheme.component.nav.activeForeground,
  },
});
