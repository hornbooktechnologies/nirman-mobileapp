import { Input } from './input';

type DateInputProps = {
  accessibilityLabel: string;
  value: string;
  onChangeText: (value: string) => void;
  invalid?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  showPickerIndicator?: boolean;
};

export function DateInput({ accessibilityLabel, value, onChangeText, invalid = false }: DateInputProps) {
  return (
    <Input
      accessibilityLabel={accessibilityLabel}
      autoCapitalize="none"
      invalid={invalid}
      placeholder="YYYY-MM-DD"
      value={value}
      onChangeText={onChangeText}
    />
  );
}
