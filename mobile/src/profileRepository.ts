import AsyncStorage from '@react-native-async-storage/async-storage';

// Profile storage boundary: local now, replaceable with an API repository later.
export type ProfileDraft = { name: string; birth: string; storeName?: string };

const keyFor = (userId: string) => `localProfileDraft:${userId}`;

export async function getLocalProfile(userId: string): Promise<ProfileDraft | null> {
  const value = await AsyncStorage.getItem(keyFor(userId));
  return value ? (JSON.parse(value) as ProfileDraft) : null;
}

export async function saveLocalProfile(userId: string, profile: ProfileDraft): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(profile));
}
