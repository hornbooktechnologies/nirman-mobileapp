import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { mobileTheme } from '../../theme';

type GradientScreenProps = ViewProps & {
  footer?: ReactNode;
  scroll?: boolean;
};

export function GradientScreen({ footer, scroll = true, children, style, ...props }: GradientScreenProps) {
  const insets = useSafeAreaInsets();
  const contentInset = {
    paddingBottom: footer ? mobileTheme.layout.bottomNavHeight + insets.bottom + mobileTheme.spacing[10] : mobileTheme.spacing[8],
  };

  return (
    <View style={styles.root} {...props}>
      <LinearGradient
        colors={[
          mobileTheme.color.background.canvasStart,
          mobileTheme.color.background.canvasMiddle,
          mobileTheme.color.background.canvasEnd,
        ]}
        locations={[0, 0.46, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <SafeAreaView style={styles.safeArea}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.content, contentInset, style]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.flexContent, contentInset, style]}>{children}</View>
        )}
      </SafeAreaView>
      {footer ? <View style={[styles.footer, { bottom: Math.max(insets.bottom, mobileTheme.spacing[3]) }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
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
    bottom: mobileTheme.spacing[5],
    left: mobileTheme.spacing[5],
    position: 'absolute',
    right: mobileTheme.spacing[5],
  },
});
