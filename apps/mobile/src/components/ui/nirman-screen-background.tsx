import { memo, type ReactNode } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { mobileTheme } from '../../theme';

const BACKGROUND_SOURCE = require('../../../assets/brand/background.png');
const DASHBOARD_LAYER_SOURCE = require('../../../assets/brand/background1.png');

type NirmanScreenBackgroundProps = Omit<ViewProps, 'style'> & {
  footer?: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'dashboard';
};

const BackgroundImage = memo(function BackgroundImage() {
  return (
    <Image
      accessible={false}
      resizeMode="cover"
      source={BACKGROUND_SOURCE}
      style={styles.background}
    />
  );
});

export function NirmanScreenBackground({
  footer,
  scroll = true,
  children,
  style,
  variant = 'default',
  ...props
}: NirmanScreenBackgroundProps) {
  const insets = useSafeAreaInsets();
  const contentInset = {
    paddingBottom: footer
      ? mobileTheme.layout.bottomNavHeight + insets.bottom + mobileTheme.spacing[10]
      : mobileTheme.spacing[8],
  };

  return (
    <View style={styles.root} {...props}>
      <BackgroundImage />
      {variant === 'dashboard' ? (
        <View accessible={false} pointerEvents="none" style={styles.dashboardLayers}>
          <Image resizeMode="cover" source={DASHBOARD_LAYER_SOURCE} style={styles.dashboardTexture} />
          <LinearGradient colors={[mobileTheme.color.glass.overlay, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 0.65 }} style={styles.dashboardWash} />
          <LinearGradient colors={[mobileTheme.color.status.warning.background, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 1 }} style={styles.dashboardGlow} />
        </View>
      ) : null}
      <SafeAreaView style={styles.safeArea}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentInset, style]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.flexContent, contentInset, style]}>
            {children}
          </View>
        )}
      </SafeAreaView>
      {footer ? (
        <View
          style={[
            styles.footer,
            { bottom: Math.max(insets.bottom, mobileTheme.spacing[3]) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: mobileTheme.color.background.app,
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  dashboardLayers: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  dashboardTexture: { height: '72%', opacity: 0.18, position: 'absolute', right: '-18%', top: 0, width: '118%' },
  dashboardWash: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  dashboardGlow: { height: 340, opacity: 0.58, position: 'absolute', right: -110, top: -80, width: 330 },
  safeArea: {
    flex: 1,
  },
  content: {
    gap: mobileTheme.spacing[5],
    paddingHorizontal: mobileTheme.spacing[5],
    paddingTop: mobileTheme.spacing[5],
  },
  flexContent: {
    flex: 1,
  },
  footer: {
    left: mobileTheme.spacing[5],
    position: 'absolute',
    right: mobileTheme.spacing[5],
  },
});
