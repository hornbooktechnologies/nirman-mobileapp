import type { PropsWithChildren } from 'react';
import { useFonts } from 'expo-font';
import { StyleSheet, Text, View } from 'react-native';

import { SessionProvider } from './session-provider';
import { mobileTheme } from '../theme';

export function AppProvider({ children }: PropsWithChildren) {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular: require('../../assets/fonts/Manrope-Regular.ttf'),
    Manrope_500Medium: require('../../assets/fonts/Manrope-Medium.ttf'),
    Manrope_600SemiBold: require('../../assets/fonts/Manrope-SemiBold.ttf'),
    Manrope_700Bold: require('../../assets/fonts/Manrope-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Preparing NirmanSite</Text>
      </View>
    );
  }

  return <SessionProvider>{children}</SessionProvider>;
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
