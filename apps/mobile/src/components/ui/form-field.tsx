import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileText, mobileTheme } from '../../theme';
import { AppText } from './app-text';

type FormFieldProps = ViewProps & {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
};

export function FormField({
  label,
  helperText,
  error,
  required = false,
  optional = false,
  optionalLabel,
  children,
  style,
  ...props
}: FormFieldProps) {
  const { t } = useTranslation('common');
  const resolvedOptionalLabel = optionalLabel ?? t('form.optional');
  const fieldRequirement = required ? t('form.required') : optional ? resolvedOptionalLabel : undefined;

  return (
    <View style={[styles.field, style]} {...props}>
      <AppText
        accessibilityLabel={fieldRequirement ? `${label}, ${fieldRequirement}` : label}
        style={styles.label}
        weight={600}
      >
        {label}
        {required ? <AppText style={styles.requiredIndicator} weight={700}> *</AppText> : null}
        {!required && optional ? <AppText style={styles.optionalLabel} weight={500}> ({resolvedOptionalLabel})</AppText> : null}
      </AppText>
      {children}
      {error ? (
        <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error} weight={500}>{error}</AppText>
      ) : helperText ? (
        <AppText style={styles.helper} weight={500}>{helperText}</AppText>
      ) : null}
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <AppText accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.formError} weight={500}>
      {message}
    </AppText>
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
  requiredIndicator: {
    color: mobileTheme.color.status.danger.foreground,
  },
  optionalLabel: {
    color: mobileTheme.color.text.secondary,
  },
  helper: {
    ...mobileText.caption,
  },
  error: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
  },
  formError: {
    ...mobileText.caption,
    backgroundColor: mobileTheme.color.status.danger.background,
    borderColor: mobileTheme.color.status.danger.foreground,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    color: mobileTheme.color.status.danger.foreground,
    padding: mobileTheme.spacing[3],
  },
});
