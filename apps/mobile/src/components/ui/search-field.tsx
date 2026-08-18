import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { mobileTheme } from '../../theme';
import { AppIcon } from './app-icon';

export function SearchField({ style, ...props }: TextInputProps) {
  return (
    <View style={styles.shell}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppIcon color={mobileTheme.color.text.muted} name="magnify" size={mobileTheme.icon.md} />
      </View>
      <TextInput
        autoCapitalize="none"
        clearButtonMode="while-editing"
        placeholderTextColor={mobileTheme.color.text.muted}
        returnKeyType="search"
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: mobileTheme.component.field.background,
    borderColor: mobileTheme.component.field.border,
    borderRadius: mobileTheme.component.field.radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 50,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  input: {
    color: mobileTheme.color.text.primary,
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: mobileTheme.typography.size.md,
    minHeight: 48,
    paddingVertical: 0,
  },
});
