import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type NativeNotifications = typeof import('expo-notifications');
let cached: NativeNotifications | null | undefined;

/** The notifications barrel eagerly imports native modules unavailable in Expo Go. */
export function getNativeNotifications(): NativeNotifications | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS === 'web' || isRunningInExpoGo()) return cached;
  // SDK 58 requires this module even if our app never subscribes to FCM topics.
  if (Platform.OS === 'android' && !requireOptionalNativeModule('ExpoTopicSubscriptionModule')) {
    console.warn('[notifications] This Android client needs a native rebuild for push notifications. The in-app inbox remains available.');
    return cached;
  }
  try {
    // Static path keeps Metro bundling intact; evaluation happens only on compatible clients.
    cached = require('expo-notifications') as NativeNotifications;
  } catch {
    console.warn('[notifications] Native notification support is unavailable in this client. The in-app inbox remains available.');
  }
  return cached;
}
