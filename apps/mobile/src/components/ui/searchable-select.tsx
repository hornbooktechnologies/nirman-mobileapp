import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import { CollectionPickerModal } from './collection-picker-modal';

export type SearchableSelectOption<TValue extends string = string> = {
  value: TValue;
  label: string;
  description?: string;
  disabled?: boolean;
  searchTerms?: readonly string[];
};

export type SearchableSelectProps<TValue extends string> = {
  value?: TValue | null;
  options: readonly SearchableSelectOption<TValue>[];
  placeholder: string;
  title: string;
  searchPlaceholder: string;
  searchAccessibilityLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  subtitle?: string;
  disabled?: boolean;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onChange: (value: TValue, option: SearchableSelectOption<TValue>) => void;
};

export function SearchableSelect<TValue extends string>({
  value,
  options,
  placeholder,
  title,
  searchPlaceholder,
  searchAccessibilityLabel,
  emptyTitle,
  emptyDescription,
  accessibilityLabel,
  accessibilityHint,
  subtitle,
  disabled = false,
  invalid = false,
  style,
  testID,
  onChange,
}: SearchableSelectProps<TValue>) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const selectedOption = options.find((option) => option.value === value);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options;

    return options.filter((option) =>
      [option.label, option.description, ...(option.searchTerms ?? [])]
        .filter((term): term is string => Boolean(term))
        .some((term) => term.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch, options]);

  function close() {
    setVisible(false);
    setSearch('');
  }

  return (
    <>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={`${accessibilityLabel}: ${selectedOption?.label ?? placeholder}`}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: visible }}
        disabled={disabled}
        style={({ pressed }) => [
          styles.trigger,
          invalid && styles.triggerInvalid,
          disabled && styles.disabled,
          pressed && styles.pressed,
          style,
        ]}
        testID={testID}
        onPress={() => setVisible(true)}
      >
        <AppText
          numberOfLines={1}
          style={[styles.triggerLabel, !selectedOption && styles.placeholder]}
          weight={500}
        >
          {selectedOption?.label ?? placeholder}
        </AppText>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <AppIcon color={mobileTheme.color.text.muted} name="chevron-down" size={mobileTheme.icon.md} />
        </View>
      </Pressable>

      <CollectionPickerModal
        accessibilityLabel={searchAccessibilityLabel}
        data={filteredOptions}
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        keyExtractor={(option) => option.value}
        renderItem={({ item }) => {
          const selected = item.value === value;
          return (
            <Pressable
              accessibilityLabel={item.description ? `${item.label}. ${item.description}` : item.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: item.disabled, selected }}
              disabled={item.disabled}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                item.disabled && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                onChange(item.value, item);
                close();
              }}
            >
              <View style={styles.optionCopy}>
                <AppText style={[styles.optionLabel, selected && styles.optionLabelSelected]} weight={600}>
                  {item.label}
                </AppText>
                {item.description ? <AppText style={styles.optionDescription}>{item.description}</AppText> : null}
              </View>
              {selected ? (
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <AppIcon color={mobileTheme.color.action.primary} name="check-circle" size={mobileTheme.icon.md} />
                </View>
              ) : null}
            </Pressable>
          );
        }}
        searchPlaceholder={searchPlaceholder}
        searchValue={search}
        subtitle={subtitle}
        title={title}
        visible={visible}
        onClose={close}
        onSearchChange={setSearch}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: mobileTheme.component.field.background,
    borderColor: mobileTheme.component.field.border,
    borderRadius: mobileTheme.component.field.radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: mobileTheme.component.field.height,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  triggerInvalid: {
    borderColor: mobileTheme.color.status.danger.foreground,
  },
  triggerLabel: {
    ...mobileText.body,
    color: mobileTheme.color.text.primary,
    flex: 1,
  },
  placeholder: {
    color: mobileTheme.color.text.muted,
  },
  option: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 52,
    paddingHorizontal: mobileTheme.spacing[4],
    paddingVertical: mobileTheme.spacing[3],
  },
  optionSelected: {
    backgroundColor: mobileTheme.color.status.info.background,
    borderColor: mobileTheme.color.border.selected,
  },
  optionCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
    minWidth: 0,
  },
  optionLabel: {
    ...mobileText.body,
    color: mobileTheme.color.text.primary,
  },
  optionLabelSelected: {
    color: mobileTheme.color.action.primary,
  },
  optionDescription: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
