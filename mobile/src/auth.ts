// 계정·매장 서버 연동 (가입, 로그인, 매장 등록·참여, 현재 매장 선택)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { unregisterPushDevice } from './pushRegistration';
import { api, ApiError, clearToken, getToken, setToken } from './api';

// 계정·매장은 서버(Spring)에 저장한다. 앱에는 로그인 토큰과 "현재 매장" 선택만 남긴다.
export type Role = 'owner' | 'staff';
export type Store = {
  id?: number;
  name: string;
  type: string;
  inviteCode?: string;
  baseName?: string;
  branch?: string;
};
export type Account = { role: Role; name: string; birth: string; stores: Store[]; current: number; pending?: Store };

type StoreView = { id: number; name: string; type: string | null; branch: string | null; inviteCode: string | null };
type AccountView = {
  username: string;
  role: Role;
  name: string;
  birth: string | null;
  stores: StoreView[];
  pending: StoreView | null;
};

// 서버의 매장 이름(상호)과 지점명을 화면에서 쓰는 한 이름으로 합친다 (예: "민수네 카페 강남점")
const toStore = (v: StoreView): Store => ({
  id: v.id,
  name: [v.name, v.branch].filter(Boolean).join(' '),
  baseName: v.name,
  branch: v.branch ?? '',
  type: v.type ?? '',
  inviteCode: v.inviteCode ?? undefined,
});

const currentKey = (id: string) => `currentStore:${id}`;

async function toAccount(v: AccountView): Promise<Account> {
  const stores = v.stores.map(toStore);
  const saved = Number(await AsyncStorage.getItem(currentKey(v.username)));
  return {
    role: v.role,
    name: v.name,
    birth: v.birth ?? '',
    stores,
    current: saved >= 0 && saved < stores.length ? saved : 0,
    pending: v.pending ? toStore(v.pending) : undefined,
  };
}

export { ApiError };

export const exists = async (id: string) =>
  (await api<{ exists: boolean }>('GET', `/api/auth/exists?username=${encodeURIComponent(id)}`)).exists;

export async function signup(id: string, acc: { pw: string; role: Role; name: string; birth: string }) {
  await api('POST', '/api/auth/signup', {
    username: id,
    password: acc.pw,
    role: acc.role,
    name: acc.name,
    birth: acc.birth,
  });
}

// 아이디·비밀번호·유형이 맞지 않으면 null, 서버에 연결하지 못하면 ApiError
export async function login(id: string, pw: string, role: Role) {
  try {
    const r = await api<{ token: string; account: AccountView }>('POST', '/api/auth/login', {
      username: id,
      password: pw,
      role,
    });
    await setToken(r.token);
    return await toAccount(r.account);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export async function refresh() {
  const v = await api<AccountView>('GET', '/api/me');
  return { id: v.username, acc: await toAccount(v) };
}

export async function updateProfile(input: {
  username: string;
  name: string;
  birth: string;
  expectedName: string;
  expectedBirth: string;
  storeId?: number;
  storeName?: string;
  expectedStoreName?: string;
}) {
  const updated = await api<AccountView>('PUT', '/api/me', input);
  return toAccount(updated);
}

export const updateStoreName = (storeId: number, name: string) =>
  api<StoreView>('PUT', `/api/stores/${storeId}/name`, { name }).then(toStore);

// 저장된 토큰으로 로그인 상태를 되살린다. 토큰이 만료됐으면 지우고, 서버가 꺼져 있으면 로그인 화면으로 보낸다.
export async function session() {
  if (!(await getToken())) return null;
  try {
    return await refresh();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) await clearToken();
    return null;
  }
}

export const setCurrent = (id: string, i: number) => AsyncStorage.setItem(currentKey(id), String(i));

// 매장 등록(사장님): 초대 코드가 들어 있는 매장을 돌려준다
export const createStore = (data: {
  name: string;
  type: string;
  branch: string;
  address: string;
  addressDetail: string;
  openTime: string;
  closeTime: string;
}) => api<StoreView>('POST', '/api/stores', data).then(toStore);

// 초대 코드로 매장 조회 / 참여 요청(직원)
export const lookupStore = (code: string) =>
  api<{ name: string; type: string | null; branch: string | null; ownerName: string }>(
    'GET',
    `/api/stores/lookup?code=${encodeURIComponent(code)}`,
  ).then((s) => ({
    name: [s.name, s.branch].filter(Boolean).join(' '),
    type: s.type ?? '',
    ownerName: s.ownerName,
  }));

export const joinStore = (code: string) => api<{ status: string }>('POST', '/api/stores/join', { code });

export async function logout() {
  try {
    await unregisterPushDevice();
  } catch {}
  try {
    await api('POST', '/api/auth/logout');
  } catch {
    // 서버에 닿지 않아도 이 기기의 로그인 상태는 지운다
  }
  await clearToken();
}
