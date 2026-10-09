import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Local LAN development can override the deployed API in .env.development.local
// with http://localhost:4000/api/v1; resolveApiBaseUrl uses the Expo host on devices.
const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

function isLocalDevelopmentHost(hostname: string) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function resolveApiBaseUrl() {
  if (!__DEV__) {
    return configuredApiBaseUrl;
  }

  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!expoHost) {
    return configuredApiBaseUrl;
  }

  try {
    const configuredUrl = new URL(configuredApiBaseUrl);
    if (!isLocalDevelopmentHost(configuredUrl.hostname)) {
      return configuredApiBaseUrl;
    }

    // Give local Expo web its own loopback API address, independent of cached
    // localhost responses from the Next.js development app on another origin.
    configuredUrl.hostname = Platform.OS === 'web' &&
      (expoHost === 'localhost' || expoHost === '127.0.0.1')
      ? '127.0.0.1'
      : expoHost;
    return configuredUrl.toString().replace(/\/$/, '');
  } catch {
    return configuredApiBaseUrl;
  }
}

export const appConfig = {
  name: 'NirmanSite',
  apiBaseUrl: resolveApiBaseUrl(),
} as const;
