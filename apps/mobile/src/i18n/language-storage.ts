import AsyncStorage from '@react-native-async-storage/async-storage';

import { isLanguagePreference, type LanguagePreference } from './types';

const LANGUAGE_PREFERENCE_KEY = 'nirmansite.language-preference.v1';

export async function readLanguagePreference(): Promise<LanguagePreference> {
  try {
    const storedPreference = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    return isLanguagePreference(storedPreference) ? storedPreference : 'system';
  } catch {
    return 'system';
  }
}

export async function writeLanguagePreference(preference: LanguagePreference): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, preference);
}
