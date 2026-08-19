import { createContext, useContext, type PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import type { SupportedLanguage } from '../../i18n';
import { useLocalization } from '../../providers/localization-provider';

export type AppFontWeight = 400 | 500 | 600 | 700;

const localizedFontFamilies: Record<SupportedLanguage, Record<AppFontWeight, string>> = {
  en: {
    400: 'Manrope_400Regular',
    500: 'Manrope_500Medium',
    600: 'Manrope_600SemiBold',
    700: 'Manrope_700Bold',
  },
  hi: {
    400: 'NotoSansDevanagari_400Regular',
    500: 'NotoSansDevanagari_500Medium',
    600: 'NotoSansDevanagari_600SemiBold',
    700: 'NotoSansDevanagari_700Bold',
  },
  gu: {
    400: 'NotoSansGujarati_400Regular',
    500: 'NotoSansGujarati_500Medium',
    600: 'NotoSansGujarati_600SemiBold',
    700: 'NotoSansGujarati_700Bold',
  },
};

const AppFontContext = createContext(false);

export function AppFontProvider({ children, fontsAvailable }: PropsWithChildren<{ fontsAvailable: boolean }>) {
  return <AppFontContext.Provider value={fontsAvailable}>{children}</AppFontContext.Provider>;
}

export function getLocalizedFontFamily(language: SupportedLanguage, weight: AppFontWeight = 400) {
  return localizedFontFamilies[language][weight];
}

export function useLocalizedFontFamily(weight: AppFontWeight = 400) {
  const { language } = useLocalization();
  const fontsAvailable = useContext(AppFontContext);
  return fontsAvailable ? getLocalizedFontFamily(language, weight) : undefined;
}

export function AppText({ style, ...props }: TextProps & { weight?: AppFontWeight }) {
  const { weight = 400, ...textProps } = props;
  const { language } = useLocalization();
  const fontFamily = useLocalizedFontFamily(weight);
  const configuredLineHeight = StyleSheet.flatten(style)?.lineHeight;
  const lineHeight = language === 'en' || typeof configuredLineHeight !== 'number'
    ? undefined
    : Math.ceil(configuredLineHeight * 1.08);

  return (
    <Text
      style={[style, fontFamily ? { fontFamily } : undefined, lineHeight ? { lineHeight } : undefined]}
      {...textProps}
    />
  );
}
