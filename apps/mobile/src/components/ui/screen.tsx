import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';

import { mobileTheme } from '../../theme';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
};

export function Screen({ scroll = false, padded = true, style, children, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} {...props}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, padded ? styles.padded : null, style]}>{children}</ScrollView>
      ) : (
        <View style={[styles.content, padded ? styles.padded : null, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: mobileTheme.color.background.app,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    padding: mobileTheme.layout.mobilePadding,
  },
});
