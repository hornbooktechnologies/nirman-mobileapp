import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  i18n,
  i18nInitialization,
  LANGUAGE_LOCALES,
  readLanguagePreference,
  resolveLanguage,
  writeLanguagePreference,
  type LanguagePreference,
  type SupportedLanguage,
} from '../i18n';

type LocalizationContextValue = {
  language: SupportedLanguage;
  locale: string;
  preference: LanguagePreference;
  setLanguagePreference: (preference: LanguagePreference) => Promise<void>;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<LanguagePreference>('system');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeLocalization() {
      try {
        await i18nInitialization;
        const storedPreference = await readLanguagePreference();
        const resolvedLanguage = resolveLanguage(storedPreference);
        await i18n.changeLanguage(resolvedLanguage);

        if (mounted) {
          setPreference(storedPreference);
          setLanguage(resolvedLanguage);
        }
      } catch {
        if (mounted) {
          setPreference('system');
          setLanguage('en');
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    void initializeLocalization();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguagePreference = useCallback(async (nextPreference: LanguagePreference) => {
    const resolvedLanguage = resolveLanguage(nextPreference);
    await i18n.changeLanguage(resolvedLanguage);
    setPreference(nextPreference);
    setLanguage(resolvedLanguage);

    try {
      await writeLanguagePreference(nextPreference);
    } catch {
      // The active language still changes for this session if device storage is unavailable.
    }
  }, []);

  const value = useMemo<LocalizationContextValue>(() => ({
    language,
    locale: LANGUAGE_LOCALES[language],
    preference,
    setLanguagePreference,
  }), [language, preference, setLanguagePreference]);

  if (!isReady) return null;

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error('useLocalization must be used within LocalizationProvider');
  return context;
}
