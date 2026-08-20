import { getLocales, type Locale } from 'expo-localization';

import { isSupportedLanguage, type LanguagePreference, type SupportedLanguage } from './types';

export function resolveLanguage(
  preference: LanguagePreference,
  deviceLocales: readonly Locale[] = getLocales(),
): SupportedLanguage {
  if (preference !== 'system') return preference;

  for (const locale of deviceLocales) {
    if (isSupportedLanguage(locale.languageCode)) return locale.languageCode;

    const shortCode = locale.languageTag.split('-')[0]?.toLowerCase();
    if (isSupportedLanguage(shortCode)) return shortCode;
  }

  return 'en';
}
