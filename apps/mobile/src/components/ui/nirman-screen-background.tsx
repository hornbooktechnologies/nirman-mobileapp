import { FormScope } from './form-scope';
import { memo, useState, type ReactNode, type Ref } from 'react';
import {
  Image,
  Animated,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { mobileTheme } from '../../theme';

const BACKGROUND_SOURCE = require('../../../assets/brand/background.png');
const DASHBOARD_LAYER_SOURCE = require('../../../assets/brand/background1.png');

type NirmanScreenBackgroundProps = Omit<ViewProps, 'style'> & {
  footer?: ReactNode;
  scrollY?: Animated.Value;
  scrollRef?: Ref<ScrollViewInstance>;
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
  scrollY,
  scrollRef,
  scroll = true,
  children,
  style,
  variant = 'default',
  ...props
}: NirmanScreenBackgroundProps) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState<number>(mobileTheme.layout.bottomNavHeight);
  const footerBottom = Math.max(insets.bottom, mobileTheme.spacing[3]);
  // Reserve the footer outside the scroll viewport so content cannot slide
  // underneath the tabs. SafeAreaView adds the system inset itself.
  const footerInset = footer
    ? Math.max(0, footerHeight + footerBottom - insets.bottom)
    : 0;
  const contentInset = {
    paddingBottom: footer ? mobileTheme.spacing[2] : mobileTheme.spacing[8],
  };
  return (<FormScope>
    <View style={styles.root} {...props}>
      <BackgroundImage />
      {variant === 'dashboard' ? (
        <View accessible={false} pointerEvents="none" style={styles.dashboardLayers}>
          <Image resizeMode="cover" source={DASHBOARD_LAYER_SOURCE} style={styles.dashboardTexture} />
          <LinearGradient colors={[mobileTheme.color.glass.overlay, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 0.65 }} style={styles.dashboardWash} />
          <LinearGradient colors={[mobileTheme.color.status.warning.background, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 1 }} style={styles.dashboardGlow} />
        </View>
      ) : null}
      <SafeAreaView style={[styles.safeArea, { paddingBottom: footerInset }]}>
        {scroll ? (
          <Animated.ScrollView style={styles.viewport}
            ref={scrollRef}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScroll={scrollY ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }) : undefined}
            scrollEventThrottle={scrollY ? 16 : undefined}
            contentContainerStyle={[styles.content, style, contentInset]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </Animated.ScrollView>
        ) : (
          <View style={[styles.content, styles.flexContent, style, contentInset]}>
            {children}
          </View>
        )}
      </SafeAreaView>
      {footer ? (
        <View
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          style={[styles.footer, { bottom: footerBottom }]}
        >
          {footer}
        </View>
      ) : null}
    </View>
    </FormScope>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: mobileTheme.color.background.app,
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
    height: '100%',
    width: '100%',
  },
  dashboardLayers: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  dashboardTexture: { height: '72%', opacity: 0.18, position: 'absolute', right: '-18%', top: 0, width: '118%' },
  dashboardWash: { ...StyleSheet.absoluteFill, opacity: 0.7 },
  dashboardGlow: { height: 340, opacity: 0.58, position: 'absolute', right: -110, top: -80, width: 330 },
  safeArea: {
    flex: 1,
  },
  content: {
    gap: mobileTheme.spacing[5],
    paddingHorizontal: mobileTheme.spacing[5],
    paddingTop: mobileTheme.spacing[5],
  },
  viewport: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  flexContent: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  footer: {
    left: mobileTheme.spacing[5],
    position: 'absolute',
    right: mobileTheme.spacing[5],
  },
});
