import AsyncStorage from '@react-native-async-storage/async-storage';

// 테스트용: 계정과 로그인 상태를 기기 저장소에만 보관한다 (비밀번호 평문 저장).
// TODO: 서버 API 연동 시 이 파일의 함수들을 API 호출로 교체
export type Role = 'owner' | 'staff';
export type Store = { name: string; type: string };
export type Account = { pw: string; role: Role; name: string; birth: string; stores: Store[]; current: number };

const ACCOUNTS = 'accounts';
const SESSION = 'session';

// 예전 형식(store 단일 필드)으로 저장된 계정도 읽을 수 있게 맞춘다
const norm = (a: any): Account => ({ ...a, stores: a.stores ?? (a.store ? [a.store] : []), current: a.current ?? 0 });

const load = async (): Promise<Record<string, Account>> => {
  const raw = JSON.parse((await AsyncStorage.getItem(ACCOUNTS)) ?? '{}');
  return Object.fromEntries(Object.entries(raw).map(([id, a]) => [id, norm(a)]));
};
const save = (a: Record<string, Account>) => AsyncStorage.setItem(ACCOUNTS, JSON.stringify(a));

const update = async (id: string, fn: (a: Account) => Account) => {
  const all = await load();
  const next = fn(all[id]);
  await save({ ...all, [id]: next });
  return next;
};

export const exists = async (id: string) => id in (await load());

export async function signup(id: string, acc: Pick<Account, 'pw' | 'role' | 'name' | 'birth'>) {
  const all = await load();
  if (id in all) return false;
  await save({ ...all, [id]: { ...acc, stores: [], current: 0 } });
  return true;
}

export async function login(id: string, pw: string, role: Role) {
  const acc = (await load())[id];
  if (!acc || acc.pw !== pw || acc.role !== role) return null;
  await AsyncStorage.setItem(SESSION, id);
  return acc;
}

export async function session() {
  const id = await AsyncStorage.getItem(SESSION);
  const acc = id ? (await load())[id] : undefined;
  return id && acc ? { id, acc } : null;
}

// 매장을 추가하고 현재 매장으로 선택한다
export const addStore = (id: string, store: Store) =>
  update(id, (a) => ({ ...a, stores: [...a.stores, store], current: a.stores.length }));

export const selectStore = (id: string, i: number) => update(id, (a) => ({ ...a, current: i }));

export const logout = () => AsyncStorage.removeItem(SESSION);
