import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_PREFERENCES, type LanguagePreference } from '../../i18n';
import { useLocalization } from '../../providers/localization-provider';
import { mobileTheme } from '../../theme';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';

const nativeLanguageNames: Partial<Record<LanguagePreference, string>> = {
  en: 'English',
  hi: 'हिन्दी',
  gu: 'ગુજરાતી',
};

type LanguagePickerProps = ViewProps & {
  compact?: boolean;
  showDescription?: boolean;
};

export function LanguagePicker({ compact = false, showDescription = true, style, ...props }: LanguagePickerProps) {
  const { t } = useTranslation('common');
  const { preference, setLanguagePreference } = useLocalization();
  const [pendingPreference, setPendingPreference] = useState<LanguagePreference | null>(null);
  const [changeFailed, setChangeFailed] = useState(false);

  async function selectLanguage(nextPreference: LanguagePreference) {
    if (nextPreference === preference || pendingPreference) return;
    setChangeFailed(false);
    setPendingPreference(nextPreference);
    try {
      await setLanguagePreference(nextPreference);
    } catch {
      setChangeFailed(true);
    } finally {
      setPendingPreference(null);
    }
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer, style]} {...props}>
      <View style={styles.copy}>
        <AppText style={styles.title} weight={700}>{t('language.title')}</AppText>
        {showDescription ? (
          <AppText style={styles.description} weight={500}>{t('language.description')}</AppText>
        ) : null}
      </View>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {LANGUAGE_PREFERENCES.map((option) => {
          const label = option === 'system' ? t('language.system') : nativeLanguageNames[option]!;
          const selected = option === preference;
          const disabled = pendingPreference !== null;

          return (
            <Pressable
              accessibilityLabel={t('language.changeTo', { language: label })}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              key={option}
              onPress={() => void selectLanguage(option)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.selectedOption,
                pressed && styles.pressedOption,
                disabled && styles.disabledOption,
              ]}
            >
              {selected ? (
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <AppIcon color={mobileTheme.color.text.primary} name="check" size={mobileTheme.icon.sm} />
                </View>
              ) : null}
              <AppText
                style={[styles.optionLabel, selected && styles.selectedOptionLabel]}
                weight={selected ? 700 : 600}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {changeFailed ? (
        <AppText accessibilityLiveRegion="polite" style={styles.error} weight={500}>
          {t('language.changeFailed')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: mobileTheme.spacing[3],
  },
  compactContainer: {
    gap: mobileTheme.spacing[2],
  },
  copy: {
    gap: mobileTheme.spacing[1],
  },
  title: {
    color: mobileTheme.color.text.primary,
    fontSize: mobileTheme.typography.size.md,
    lineHeight: 24,
  },
  description: {
    color: mobileTheme.color.text.secondary,
    fontSize: mobileTheme.typography.size.sm,
    lineHeight: 21,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  option: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: mobileTheme.spacing[4],
  },
  selectedOption: {
    backgroundColor: mobileTheme.color.brand.secondarySoft,
    borderColor: mobileTheme.color.border.accent,
  },
  pressedOption: {
    opacity: 0.78,
  },
  disabledOption: {
    opacity: 0.58,
  },
  optionLabel: {
    color: mobileTheme.color.text.secondary,
    fontSize: mobileTheme.typography.size.sm,
    lineHeight: 22,
  },
  selectedOptionLabel: {
    color: mobileTheme.color.text.primary,
  },
  error: {
    color: mobileTheme.color.status.danger.foreground,
    fontSize: mobileTheme.typography.size.sm,
    lineHeight: 21,
  },
});
