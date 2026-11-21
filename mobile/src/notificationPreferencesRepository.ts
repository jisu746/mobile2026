import AsyncStorage from '@react-native-async-storage/async-storage';

// Account-scoped local preferences; a server implementation can replace this boundary later.
export type NotificationPreferences = Record<'push' | 'task' | 'expiry' | 'stock' | 'memo' | 'pay' | 'quiet', boolean> & {
  quietStart: string;
  quietEnd: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push: true, task: true, expiry: true, stock: true, memo: true, pay: true, quiet: false,
  quietStart: '23:00', quietEnd: '08:00',
};

const keyFor = (userId: string) => `notificationSettings:${userId}`;
const LEGACY_KEY = 'notificationSettings';

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const key = keyFor(userId);
  let raw = await AsyncStorage.getItem(key);
  if (!raw) {
    raw = await AsyncStorage.getItem(LEGACY_KEY);
    if (raw) {
      const migrated = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) as Partial<NotificationPreferences> };
      await AsyncStorage.setItem(key, JSON.stringify(migrated));
      await AsyncStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  }
  return raw
    ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) as Partial<NotificationPreferences> }
    : { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export const saveNotificationPreferences = (userId: string, value: NotificationPreferences) =>
  AsyncStorage.setItem(keyFor(userId), JSON.stringify(value));
