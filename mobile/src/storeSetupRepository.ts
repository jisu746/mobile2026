import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';

export type WorkPartSetting = { id: string; name: string; start: string; end: string };
export type StoreSetupSettings = {
  workParts: WorkPartSetting[];
  revision?:number;
  expirationAlertDays: number;
  lowStockThresholdCount: number;
  expiryEnabled?:boolean;
  categories?:string[];
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

export async function getStoreSetupSettings(storeId:number):Promise<StoreSetupSettings|null>{const [settings,template]=await Promise.all([api<StoreSetupSettings>('GET',`/api/stores/${storeId}/operation-settings`),api<{expiryEnabled:boolean;categories:string[]}>('GET',`/api/stores/${storeId}/template`)]);return {...settings,expiryEnabled:template.expiryEnabled,categories:template.categories};}
export async function getStoreSetupSettingsOrDefault(storeId:number):Promise<StoreSetupSettings>{return (await getStoreSetupSettings(storeId))??DEFAULT_STORE_SETUP_SETTINGS;}
export async function saveStoreSetupSettings(storeId:number,settings:StoreSetupSettings){const saved=await api<StoreSetupSettings>('PUT',`/api/stores/${storeId}/operation-settings`,{...settings,revision:settings.revision??0});await AsyncStorage.setItem(keyFor(storeId),JSON.stringify(saved));return saved;}
