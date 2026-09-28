import { LANGUAGE_LOCALES, type SupportedLanguage } from './types';

export const INDIA_TIME_ZONE = 'Asia/Kolkata';

function includesTime(options: Intl.DateTimeFormatOptions) {
  return Boolean(
    options.timeStyle ||
      options.hour ||
      options.minute ||
      options.second,
  );
}

export function formatDate(
  value: Date | number | string,
  language: SupportedLanguage,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    ...options,
    timeZone: INDIA_TIME_ZONE,
    ...(includesTime(options) ? { hour12: true } : {}),
  }).format(date);
}

export function formatIndiaDateKey(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
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
