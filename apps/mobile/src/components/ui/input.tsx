import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { mobileTheme } from '../../theme';

type InputProps = TextInputProps & {
  invalid?: boolean;
};

export function Input({ invalid = false, style, placeholderTextColor = mobileTheme.color.text.muted, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, invalid && styles.invalid, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: mobileTheme.component.field.background,
    borderColor: mobileTheme.component.field.border,
    borderRadius: mobileTheme.component.field.radius,
    borderWidth: 1,
    color: mobileTheme.color.text.primary,
    fontSize: mobileTheme.typography.size.md,
    minHeight: mobileTheme.component.field.height,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  invalid: {
    borderColor: mobileTheme.color.status.danger.foreground,
  },
});
