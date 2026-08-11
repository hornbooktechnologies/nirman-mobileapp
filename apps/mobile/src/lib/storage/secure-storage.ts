import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function getWebStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export async function getSecureValue(key: string) {
  const webStorage = getWebStorage();

  if (webStorage) {
    return webStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setSecureValue(key: string, value: string) {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(key, value);
    return;
  }

  return SecureStore.setItemAsync(key, value);
}

export async function deleteSecureValue(key: string) {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(key);
    return;
  }

  return SecureStore.deleteItemAsync(key);
}
