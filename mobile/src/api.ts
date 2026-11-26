// 서버 호출 공통 통로 (서버 주소, 토큰 첨부, 오류 변환)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { withRequestTimeout, RequestTimeoutError } from './requestTimeout';

// 서버 주소. 폰(Expo Go)에서는 PC의 내부 IP를 써야 하므로 mobile/.env 의 EXPO_PUBLIC_API_URL 로 지정한다.
// 예) EXPO_PUBLIC_API_URL=http://192.168.0.10:8080
// 안드로이드 에뮬레이터는 PC를 10.0.2.2 로 부르고, 웹과 iOS 시뮬레이터는 localhost 를 쓴다.
const BASE =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080');

const TOKEN = 'token';

// 화면에 보여줄 오류 문구. Error 가 아니면 fallback 을 쓴다
export const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Native credentials are stored in the OS credential store. Migrate the previous local token once.
export const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem(TOKEN);
  const current = await SecureStore.getItemAsync(TOKEN);
  if (current) return current;
  const legacy = await AsyncStorage.getItem(TOKEN);
  if (legacy) {
    await SecureStore.setItemAsync(TOKEN, legacy);
    await AsyncStorage.removeItem(TOKEN);
  }
  return legacy;
};
export const setToken = async (token: string) => {
  if (Platform.OS === 'web') await AsyncStorage.setItem(TOKEN, token);
  else {
    await SecureStore.setItemAsync(TOKEN, token);
    await AsyncStorage.removeItem(TOKEN);
  }
};
export const clearToken = async () => {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN);
  await AsyncStorage.removeItem(TOKEN);
};

export async function api<T = void>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  let stage = '로그인 정보 확인';
  try {
    return await withRequestTimeout(async (signal) => {
      const token = path.startsWith('/api/auth/') ? null : await getToken();
      if (signal.aborted) throw new RequestTimeoutError();
      stage = '서버 연결';
      const res = await fetch(BASE + path, {
        method,
        signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      stage = '응답 읽기';
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        throw new ApiError(res.status, '서버 응답을 확인할 수 없어요.');
      }
      if (!res.ok)
        throw new ApiError(
          res.status,
          (data as { message?: string } | undefined)?.message ?? '요청을 처리하지 못했어요',
        );
      return data as T;
    });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof RequestTimeoutError) throw new ApiError(0, `${stage} 단계가 지연되고 있어요. 다시 시도해 주세요.`);
    throw new ApiError(0, '서버에 연결할 수 없어요');
  }
}
