import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileTheme } from '../../theme';
import { AppText, NirmanScreenBackground } from '../ui';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { t } = useTranslation('common');

  return (
    <NirmanScreenBackground scroll={false} style={styles.screen}>
      <View style={styles.content}>
        <ActivityIndicator color={mobileTheme.color.brand.primary} size="large" />
        <AppText style={styles.message} weight={600}>{message ?? t('loading.default')}</AppText>
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
