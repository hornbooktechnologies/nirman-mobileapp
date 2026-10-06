import { useState } from 'react';
import LottieView from 'lottie-react-native';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { mobileTheme } from '../../theme';

type LottieLoaderProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function LottieLoader({ size = 32, style }: LottieLoaderProps) {
  const [failed, setFailed] = useState(false);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={style}>
      {failed ? (
        <ActivityIndicator color={mobileTheme.color.action.primary} size="large" style={{ height: size, width: size }} />
      ) : (
        <LottieView
          autoPlay
          loop
          onAnimationFailure={() => setFailed(true)}
          source={require('../../../assets/animations/NirmanSite_Theme_Real_Estate_Loader.json')}
          style={{ height: size, width: size }}
        />
      )}
    </View>
  );
}
