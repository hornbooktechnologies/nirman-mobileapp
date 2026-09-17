import { useState } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';

import { mobileTheme } from '../../theme';
import { IconButton } from './icon-button';
import { Input } from './input';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & {
  invalid?: boolean;
  showPasswordLabel: string;
  hidePasswordLabel: string;
};

export function PasswordInput({
  invalid = false,
  showPasswordLabel,
  hidePasswordLabel,
  style,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? hidePasswordLabel : showPasswordLabel;

  return (
    <View style={styles.container}>
      <Input
        {...props}
        invalid={invalid}
        secureTextEntry={!visible}
        style={[style, styles.input]}
      />
      <IconButton
        accessibilityLabel={toggleLabel}
        accessibilityState={{ selected: visible }}
        icon={visible ? 'eye-off-outline' : 'eye-outline'}
        style={styles.toggle}
        variant="ghost"
        onPress={() => setVisible((current) => !current)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    paddingRight: mobileTheme.spacing[12],
  },
  toggle: {
    position: 'absolute',
    right: 1,
    top: 1,
  },
});
