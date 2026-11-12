import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 서버 주소. 폰(Expo Go)에서는 PC의 내부 IP를 써야 하므로 mobile/.env 의 EXPO_PUBLIC_API_URL 로 지정한다.
// 예) EXPO_PUBLIC_API_URL=http://192.168.0.10:8080
// 안드로이드 에뮬레이터는 PC를 10.0.2.2 로 부르고, 웹과 iOS 시뮬레이터는 localhost 를 쓴다.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080');

const TOKEN = 'token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// TODO: 폰에서는 토큰을 expo-secure-store 에 보관한다 (지금은 웹과 같은 AsyncStorage)
export const getToken = () => AsyncStorage.getItem(TOKEN);
export const setToken = (t: string) => AsyncStorage.setItem(TOKEN, t);
export const clearToken = () => AsyncStorage.removeItem(TOKEN);

export async function api<T = void>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없어요');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.message ?? '요청을 처리하지 못했어요');
  return data as T;
}
