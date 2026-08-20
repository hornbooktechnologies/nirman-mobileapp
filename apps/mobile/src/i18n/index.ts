import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

export const i18nInitialization = i18n.use(initReactI18next).init({
  defaultNS: 'common',
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
  lng: 'en',
  nonExplicitSupportedLngs: true,
  resources,
  returnEmptyString: false,
  returnNull: false,
  supportedLngs: ['en', 'hi', 'gu'],
});

export { i18n };
export * from './errors';
export * from './formatters';
export * from './language-resolver';
export * from './language-storage';
export * from './types';
