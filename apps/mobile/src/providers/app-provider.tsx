import type { PropsWithChildren } from 'react';
import { useFonts } from 'expo-font';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppFontProvider } from '../components/ui/app-text';
import { LocalizationProvider } from './localization-provider';
import { SessionProvider } from './session-provider';
import { mobileTheme } from '../theme';
import { NotificationsProvider } from '../features/notifications/notifications-provider';

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <LocalizationProvider>
      <FontAndSessionProvider>{children}</FontAndSessionProvider>
    </LocalizationProvider>
  );
}

function FontAndSessionProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation('common');
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular: require('../../assets/fonts/Manrope-Regular.ttf'),
    Manrope_500Medium: require('../../assets/fonts/Manrope-Medium.ttf'),
    Manrope_600SemiBold: require('../../assets/fonts/Manrope-SemiBold.ttf'),
    Manrope_700Bold: require('../../assets/fonts/Manrope-Bold.ttf'),
    NotoSansDevanagari_400Regular: require('../../assets/fonts/NotoSansDevanagari-Regular.ttf'),
    NotoSansDevanagari_500Medium: require('../../assets/fonts/NotoSansDevanagari-Medium.ttf'),
    NotoSansDevanagari_600SemiBold: require('../../assets/fonts/NotoSansDevanagari-SemiBold.ttf'),
    NotoSansDevanagari_700Bold: require('../../assets/fonts/NotoSansDevanagari-Bold.ttf'),
    NotoSansGujarati_400Regular: require('../../assets/fonts/NotoSansGujarati-Regular.ttf'),
    NotoSansGujarati_500Medium: require('../../assets/fonts/NotoSansGujarati-Medium.ttf'),
    NotoSansGujarati_600SemiBold: require('../../assets/fonts/NotoSansGujarati-SemiBold.ttf'),
    NotoSansGujarati_700Bold: require('../../assets/fonts/NotoSansGujarati-Bold.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t('app.preparing')}</Text>
      </View>
    );
  }

  return (
    <AppFontProvider fontsAvailable={fontsLoaded}>
      <SessionProvider><NotificationsProvider>{children}</NotificationsProvider></SessionProvider>
    </AppFontProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.background.app,
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: mobileTheme.color.text.primary,
    fontSize: mobileTheme.typography.size.md,
    fontWeight: '600',
  },
});
