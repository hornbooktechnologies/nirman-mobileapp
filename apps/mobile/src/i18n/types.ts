export const LANGUAGE_PREFERENCES = ['system', 'en', 'hi', 'gu'] as const;
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'gu'] as const;

export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number];
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LOCALES: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  gu: 'gu-IN',
};

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return typeof value === 'string' && LANGUAGE_PREFERENCES.includes(value as LanguagePreference);
}

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}
