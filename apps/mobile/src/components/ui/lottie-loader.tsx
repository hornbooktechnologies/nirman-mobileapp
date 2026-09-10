import LottieView from 'lottie-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type LottieLoaderProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function LottieLoader({ size = 32, style }: LottieLoaderProps) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={style}>
      <LottieView
        autoPlay
        loop
        source={require('../../../assets/animations/NirmanSite_Theme_Real_Estate_Loader.json')}
        style={{ height: size, width: size }}
      />
    </View>
  );
}
