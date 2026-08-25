import 'i18next';

import type { namespaces, resources } from './resources';

export type MobileI18nNamespace = (typeof namespaces)[number];

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
