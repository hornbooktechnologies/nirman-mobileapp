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

import { mobileTheme } from '../../theme';

const BACKGROUND_SOURCE = require('../../../assets/brand/background.png');

type NirmanScreenBackgroundProps = Omit<ViewProps, 'style'> & {
  footer?: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
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
