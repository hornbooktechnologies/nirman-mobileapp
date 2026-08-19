import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { mobileTheme } from '../../theme';
import { NirmanScreenBackground } from '../ui';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = 'Loading' }: LoadingScreenProps) {
  return (
    <NirmanScreenBackground scroll={false} style={styles.screen}>
      <View style={styles.content}>
        <ActivityIndicator color={mobileTheme.color.brand.primary} size="large" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  message: {
    color: mobileTheme.color.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
