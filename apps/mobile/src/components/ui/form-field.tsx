import { AccessibilityInfo, StyleSheet, View, type ViewProps } from 'react-native';
import { Children, cloneElement, isValidElement, useContext, useEffect, useRef, useState, type ReactNode, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';

import { mobileText, mobileTheme } from '../../theme';
import { AppText } from './app-text';
import { FormScrollContext, FormValidationContext } from './form-scope';
import { isValidEmail } from '../../lib/validation';

type ControlProps = {
  value?: unknown;
  disabled?: boolean;
  editable?: boolean;
  invalid?: boolean;
  keyboardType?: string;
  maxLength?: number;
  onBlur?: (...args: unknown[]) => void;
  children?: ReactNode;
};

function controlsIn(children: ReactNode): ControlProps[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<ControlProps>(child)) return [];
    return 'value' in child.props ? [child.props] : controlsIn(child.props.children);
  });
}

type FormFieldProps = ViewProps & {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  validate?: () => string | undefined;
};

export function FormField({
  label,
  helperText,
  error,
  required = false,
  validate,
  children,
  style,
  ...props
}: FormFieldProps) {
  const { t } = useTranslation('common');
  const registry = useContext(FormValidationContext);
  const scrollContext = useContext(FormScrollContext);
  const root = useRef<ComponentRef<typeof View>>(null);
  const [visited, setVisited] = useState(false);
  const controls = controlsIn(children).filter((control) => !control.disabled && control.editable !== false);
  let localError = validate?.();
  for (const control of controls) {
    const value = control.value == null ? '' : String(control.value);
    if (localError) break;
    if (required && !value.trim()) localError = t('validation.required', { field: label });
    else if (value && control.keyboardType === 'email-address' && !isValidEmail(value)) localError = t('validation.email');
    else if (value && control.maxLength && value.length > control.maxLength) localError = t('validation.maxLength', { count: control.maxLength });
    if (localError) break;
  }
  const displayedError = visited && validate ? localError : (visited && localError) || error;
  useEffect(() => {
    const field = {
      validate: () => { setVisited(true); return !localError; },
      reveal: () => {
        if (localError) AccessibilityInfo.announceForAccessibility(localError);
        const scroll = scrollContext?.scroll.current;
        scroll?.measure((_x, _y, _width, _height, _pageX, viewportY) => {
          root.current?.measure((_fx, _fy, _fw, _fh, _px, fieldY) => {
            scroll.scrollTo({ y: Math.max(0, scrollContext!.offset.current + fieldY - viewportY - 12), animated: true });
          });
        });
      },
    };
    registry?.add(field);
    return () => { registry?.delete(field); };
  });
  function connect(children: ReactNode): ReactNode {
    return Children.map(children, (child) => {
      if (!isValidElement<ControlProps>(child)) return child;
      if ('value' in child.props) return cloneElement(child, {
        invalid: Boolean(displayedError) || child.props.invalid,
        onBlur: (...args: unknown[]) => { setVisited(true); child.props.onBlur?.(...args); },
      });
      return child.props.children ? cloneElement(child, { children: connect(child.props.children) }) : child;
    });
  }
  const fieldRequirement = required ? t('form.required') : undefined;

  return (
    <View ref={root} style={[styles.field, style]} {...props}>
      <AppText
        accessibilityLabel={fieldRequirement ? `${label}, ${fieldRequirement}` : label}
        style={styles.label}
        weight={600}
      >
        {label}
        {required ? <AppText style={styles.requiredIndicator} weight={700}> *</AppText> : null}
      </AppText>
      {connect(children)}
      {displayedError ? (
        <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error} weight={500}>{displayedError}</AppText>
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
