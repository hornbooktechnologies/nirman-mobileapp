import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_PREFERENCES, type LanguagePreference } from '../../i18n';
import { useLocalization } from '../../providers/localization-provider';
import { mobileText, mobileTheme } from '../../theme';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import { BottomSheet } from './modal';

const languageCodes: Partial<Record<LanguagePreference, string>> = {
  en: 'EN',
  hi: 'हि',
  gu: 'ગુ',
};

type LanguagePickerProps = ViewProps & {
  compact?: boolean;
  showDescription?: boolean;
};

export function LanguagePicker({ compact = false, showDescription = true, style, ...props }: LanguagePickerProps) {
  const { t } = useTranslation('common');
  const { preference, setLanguagePreference } = useLocalization();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [pendingPreference, setPendingPreference] = useState<LanguagePreference | null>(null);
  const [changeFailed, setChangeFailed] = useState(false);

  function getLanguageLabel(option: LanguagePreference) {
    if (option === 'system') return t('language.system');
    if (option === 'hi') return t('language.hindi');
    if (option === 'gu') return t('language.gujarati');
    return t('language.english');
  }

  const currentLabel = getLanguageLabel(preference);

  function openSheet() {
    setChangeFailed(false);
    setSheetVisible(true);
  }

  async function selectLanguage(nextPreference: LanguagePreference) {
    if (pendingPreference) return;
    if (nextPreference === preference) {
      setSheetVisible(false);
      return;
    }

    setChangeFailed(false);
    setPendingPreference(nextPreference);
    try {
      await setLanguagePreference(nextPreference);
      setSheetVisible(false);
    } catch {
      setChangeFailed(true);
    } finally {
      setPendingPreference(null);
    }
  }

  return (
    <View style={style} {...props}>
      <Pressable
        accessibilityLabel={`${t('language.title')}, ${currentLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: sheetVisible }}
        onPress={openSheet}
        style={({ pressed }) => [
          styles.selector,
          compact && styles.compactSelector,
          pressed && styles.pressed,
        ]}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.selectorIcon}>
          <AppIcon color={mobileTheme.color.action.primary} name="translate" size={mobileTheme.icon.md} />
        </View>
        <View style={styles.selectorCopy}>
          <AppText numberOfLines={1} style={styles.title} weight={700}>{t('language.title')}</AppText>
          {showDescription && !compact ? (
            <AppText numberOfLines={1} style={styles.description} weight={500}>{t('language.description')}</AppText>
          ) : null}
        </View>
        <View style={styles.currentChoice}>
          <AppText numberOfLines={1} style={styles.currentLabel} weight={700}>{currentLabel}</AppText>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppIcon color={mobileTheme.color.text.secondary} name="chevron-down" size={mobileTheme.icon.md} />
          </View>
        </View>
      </Pressable>

      <BottomSheet
        visible={sheetVisible}
        title={t('language.title')}
        description={t('language.description')}
        onClose={() => {
          if (!pendingPreference) setSheetVisible(false);
        }}
      >
        {changeFailed ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error} weight={500}>
            {t('language.changeFailed')}
          </AppText>
        ) : null}
        <View accessibilityRole="radiogroup" style={styles.options}>
          {LANGUAGE_PREFERENCES.map((option) => {
            const label = getLanguageLabel(option);
            const selected = option === preference;
            const disabled = pendingPreference !== null;
            const pending = option === pendingPreference;

            return (
              <Pressable
                accessibilityLabel={t('language.changeTo', { language: label })}
                accessibilityRole="radio"
                accessibilityState={{ busy: pending, checked: selected, disabled }}
                disabled={disabled}
                key={option}
                onPress={() => void selectLanguage(option)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.selectedOption,
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[styles.languageMark, selected && styles.selectedLanguageMark]}
                >
                  {option === 'system' ? (
                    <AppIcon
                      color={selected ? mobileTheme.color.action.primary : mobileTheme.color.text.secondary}
                      name="cellphone"
                      size={mobileTheme.icon.md}
                    />
                  ) : (
                    <AppText style={[styles.languageCode, selected && styles.selectedLanguageCode]} weight={700}>
                      {languageCodes[option]}
                    </AppText>
                  )}
                </View>
                <AppText style={[styles.optionLabel, selected && styles.selectedOptionLabel]} weight={selected ? 700 : 600}>
                  {label}
                </AppText>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.trailingIcon}>
                  {pending ? (
                    <AppIcon color={mobileTheme.color.action.primary} name="sync" size={mobileTheme.icon.md} />
                  ) : selected ? (
                    <AppIcon color={mobileTheme.color.action.primary} name="check-circle" size={mobileTheme.icon.md} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.subtle,
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 68,
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[2],
  },
  compactSelector: {
    minHeight: 56,
  },
  selectorIcon: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.brand.secondarySoft,
    borderColor: mobileTheme.color.border.accent,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  selectorCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
    minWidth: 0,
  },
  title: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    fontSize: mobileTheme.typography.size.md,
  },
  description: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  currentChoice: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: mobileTheme.spacing[1],
    maxWidth: '48%',
  },
  currentLabel: {
    ...mobileText.label,
    color: mobileTheme.color.text.brand,
    flexShrink: 1,
  },
  options: {
    gap: mobileTheme.spacing[2],
  },
  option: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 64,
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[2],
  },
  selectedOption: {
    backgroundColor: mobileTheme.color.brand.secondarySoft,
    borderColor: mobileTheme.color.border.accent,
  },
  languageMark: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  selectedLanguageMark: {
    borderColor: mobileTheme.color.border.accent,
  },
  languageCode: {
    ...mobileText.label,
    color: mobileTheme.color.text.secondary,
  },
  selectedLanguageCode: {
    color: mobileTheme.color.action.primary,
  },
  optionLabel: {
    ...mobileText.body,
    color: mobileTheme.color.text.primary,
    flex: 1,
  },
  selectedOptionLabel: {
    color: mobileTheme.color.text.brand,
  },
  trailingIcon: {
    alignItems: 'center',
    height: mobileTheme.icon.md,
    justifyContent: 'center',
    width: mobileTheme.icon.md,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.56,
  },
  error: {
    ...mobileText.caption,
    backgroundColor: mobileTheme.color.status.danger.background,
    borderColor: mobileTheme.color.status.danger.border,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    color: mobileTheme.color.status.danger.foreground,
    padding: mobileTheme.spacing[3],
  },
});
