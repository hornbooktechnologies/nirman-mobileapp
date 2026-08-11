import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';

type FormFieldProps = ViewProps & {
  label: string;
  helperText?: string;
  error?: string;
};

export function FormField({ label, helperText, error, children, style, ...props }: FormFieldProps) {
  return (
    <View style={[styles.field, style]} {...props}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: mobileTheme.spacing[2],
  },
  label: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
  },
  helper: {
    ...mobileText.caption,
  },
  error: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
  },
});
