import type { PropsWithChildren } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, GlassCard, LanguagePicker } from '../../../components/ui';
import { mobileShadows, mobileText, mobileTheme } from '../../../theme';

type AuthScreenShellProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function AuthScreenShell({ title, description, children }: AuthScreenShellProps) {
  return (
    <View style={styles.root}>
      <Image accessible={false} source={require('../../../../assets/brand/background.png')} resizeMode="cover" style={styles.background} />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Image accessibilityLabel="NirmanSite" accessible source={require('../../../../assets/brand/horizontal-logo.png')} resizeMode="contain" style={styles.logo} />
              <GlassCard variant="strong" style={styles.card}>
                <View style={styles.heading}>
                  <AppText accessibilityRole="header" style={styles.title} weight={700}>{title}</AppText>
                  <AppText style={styles.description}>{description}</AppText>
                </View>
                {children}
              </GlassCard>
              <LanguagePicker compact showDescription={false} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: mobileTheme.color.background.app },
  flex: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  screen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: mobileTheme.spacing[5], paddingVertical: mobileTheme.spacing[8] },
  content: { alignSelf: 'center', gap: mobileTheme.spacing[5], maxWidth: 440, width: '100%' },
  logo: { alignSelf: 'center', height: 100, maxWidth: 280, width: '100%' },
  card: { gap: mobileTheme.spacing[4], ...mobileShadows.soft },
  heading: { gap: mobileTheme.spacing[2] },
  title: { ...mobileText.display, fontSize: 28, lineHeight: 36 },
  description: { ...mobileText.body, color: mobileTheme.color.text.secondary, fontSize: 14, lineHeight: 22 },
});
