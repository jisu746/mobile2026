import AsyncStorage from '@react-native-async-storage/async-storage';

// 테스트용: 매장별 상품·재고를 기기 저장소에만 보관한다.
// TODO: 서버 API 연동 시 이 파일의 함수들을 API 호출로 교체
// expiry: 가장 빠른 유통기한 (YYYY.MM.DD, 모르면 없음)
export type Product = { barcode: string; name: string; category: string; stock: number; min: number; expiry?: string };
export type Receipt = { barcode: string; name: string; category: string; qty: number; expiry?: string };

const key = (store: string) => `inventory:${store}`;

const p2 = (n: number) => String(n).padStart(2, '0');
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}`;
};

// 매장에 없으면 넣어 두는 샘플 상품
const seed = (): Product[] => [
  { barcode: '8801115114154', name: '서울우유 1L', category: '냉장', stock: 2, min: 6 },
  { barcode: '8801043015653', name: '농심 신라면 컵', category: '상온', stock: 4, min: 10 },
  { barcode: '8809000000011', name: '아이스컵 16oz', category: '소모품', stock: 1, min: 3 },
  { barcode: '8801104000011', name: '빙그레 바나나맛우유 240ml', category: '냉장', stock: 2, min: 6, expiry: inDays(2) },
  { barcode: '8801104000028', name: '빙그레 바닐라라떼', category: '냉장', stock: 18, min: 6, expiry: inDays(20) },
  { barcode: '8801104000035', name: '빙그레 샌드위치 햄치즈', category: '냉장', stock: 18, min: 6, expiry: inDays(-1) },
];

const load = async (store: string): Promise<Record<string, Product>> => {
  const raw = await AsyncStorage.getItem(key(store));
  const all: Record<string, Product> = raw ? JSON.parse(raw) : {};
  let changed = !raw;
  for (const p of seed()) {
    if (!(p.barcode in all)) {
      all[p.barcode] = p;
      changed = true;
    }
  }
  if (changed) await AsyncStorage.setItem(key(store), JSON.stringify(all));
  return all;
};

export const getProduct = async (store: string, barcode: string) => (await load(store))[barcode] ?? null;

export const listProducts = async (store: string) => Object.values(await load(store));

// 오늘 기준 남은 일수 (오늘 = 0, 지났으면 음수). 유통기한이 없으면 null
export function daysLeft(expiry?: string) {
  const m = expiry && /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(expiry);
  if (!m) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(+m[1], +m[2] - 1, +m[3]).getTime() - today.getTime()) / 86400000);
}

const write = (store: string, all: Record<string, Product>) => AsyncStorage.setItem(key(store), JSON.stringify(all));

// 상품명·재고 수량 수정
export async function updateProduct(store: string, barcode: string, patch: Partial<Pick<Product, 'name' | 'stock'>>) {
  const all = await load(store);
  if (all[barcode]) all[barcode] = { ...all[barcode], ...patch };
  await write(store, all);
}

// 유통기한이 지난 상품을 재고에서 제외한다 (지금은 해당 상품 재고 전체를 폐기로 처리)
export async function discardExpired(store: string, barcode: string) {
  const all = await load(store);
  if (all[barcode]) all[barcode] = { ...all[barcode], stock: 0, expiry: undefined };
  await write(store, all);
}

// 입고 수량을 재고에 더한다. 등록되지 않은 상품은 새로 등록한다.
export async function receive(store: string, items: Receipt[]) {
  const all = await load(store);
  for (const i of items) {
    const p = all[i.barcode] ?? { barcode: i.barcode, name: i.name, category: i.category, stock: 0, min: 0 };
    // 유통기한은 가장 빠른 날짜만 남긴다 (YYYY.MM.DD 는 문자열 비교로 날짜 순서가 맞는다)
    const expiry = i.expiry && (!p.expiry || i.expiry < p.expiry) ? i.expiry : p.expiry;
    all[i.barcode] = { ...p, stock: p.stock + i.qty, expiry };
  }
  await AsyncStorage.setItem(key(store), JSON.stringify(all));
}
