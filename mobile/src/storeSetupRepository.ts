import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkPartSetting = { id: string; name: string; start: string; end: string };
export type StoreSetupSettings = {
  workParts: WorkPartSetting[];
  expirationAlertDays: number;
  lowStockThresholdCount: number;
};

export const DEFAULT_STORE_SETUP_SETTINGS: StoreSetupSettings = {
  workParts: [
    { id: 'morning', name: '오전 파트', start: '10:00', end: '14:00' },
    { id: 'afternoon', name: '오후 파트', start: '14:00', end: '20:00' },
    { id: 'closing', name: '마감 파트', start: '18:00', end: '24:00' },
  ],
  expirationAlertDays: 3,
  lowStockThresholdCount: 3,
};

const keyFor = (storeId: number) => `storeSetupSettings:${storeId}`;

export async function getStoreSetupSettings(storeId: number): Promise<StoreSetupSettings | null> {
  const raw = await AsyncStorage.getItem(keyFor(storeId));
  return raw ? JSON.parse(raw) as StoreSetupSettings : null;
}

export async function getStoreSetupSettingsOrDefault(storeId: number): Promise<StoreSetupSettings> {
  const saved = await getStoreSetupSettings(storeId);
  return saved ? {
    ...DEFAULT_STORE_SETUP_SETTINGS,
    ...saved,
    workParts: Array.isArray(saved.workParts) ? saved.workParts : DEFAULT_STORE_SETUP_SETTINGS.workParts,
    lowStockThresholdCount: Number.isInteger((saved as Partial<StoreSetupSettings>).lowStockThresholdCount)
      ? (saved as StoreSetupSettings).lowStockThresholdCount
      : DEFAULT_STORE_SETUP_SETTINGS.lowStockThresholdCount,
  } : { ...DEFAULT_STORE_SETUP_SETTINGS, workParts: DEFAULT_STORE_SETUP_SETTINGS.workParts.map((part) => ({ ...part })) };
}

export const saveStoreSetupSettings = (storeId: number, settings: StoreSetupSettings) =>
  AsyncStorage.setItem(keyFor(storeId), JSON.stringify(settings));
