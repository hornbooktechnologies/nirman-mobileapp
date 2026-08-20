import { LANGUAGE_LOCALES, type SupportedLanguage } from './types';

export function formatDate(
  value: Date | number | string,
  language: SupportedLanguage,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], options).format(date);
}

export function formatNumber(
  value: number,
  language: SupportedLanguage,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(LANGUAGE_LOCALES[language], options).format(value);
}

export function formatInr(
  value: number,
  language: SupportedLanguage,
  options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>,
) {
  return new Intl.NumberFormat(LANGUAGE_LOCALES[language], {
    ...options,
    currency: 'INR',
    style: 'currency',
  }).format(value);
}

export function formatList(
  values: readonly string[],
  language: SupportedLanguage,
  options?: Intl.ListFormatOptions,
) {
  return new Intl.ListFormat(LANGUAGE_LOCALES[language], options).format(values);
}
