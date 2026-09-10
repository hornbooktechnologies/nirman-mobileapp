import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';
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
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <LottieView
            autoPlay
            loop
            source={require('../../../assets/animations/NirmanSite_Theme_Real_Estate_Loader.json')}
            style={styles.animation}
          />
        </View>
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
    gap: mobileTheme.spacing[3],
  },
  animation: {
    height: 176,
    width: 176,
  },
  message: {
    color: mobileTheme.color.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
