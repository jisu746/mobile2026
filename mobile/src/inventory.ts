// 상품·재고·입고 서버 연동과 유통기한 계산
import { api, ApiError } from './api';

// 상품·재고는 서버(Spring)에 저장한다. storeId 는 서버가 준 매장 번호.
// expiry 는 앱에서 YYYY.MM.DD, 서버와는 YYYY-MM-DD 로 주고받는다.
export type Product = { barcode: string; name: string; category: string; stock: number; min: number; expiry?: string };
export type Receipt = { barcode: string; name: string; category: string; qty: number; expiry?: string };
export type ReceiptResult = { barcode: string; name: string; before: number; after: number; min: number };

type ProductView = { barcode: string; name: string; category: string | null; stock: number; min: number; expiry: string | null };

const toDot = (d: string | null) => (d ? d.replace(/-/g, '.') : undefined);
const toDash = (d?: string) => (d ? d.replace(/\./g, '-') : null);
const toProduct = (v: ProductView): Product => ({ ...v, category: v.category ?? '', expiry: toDot(v.expiry) });

const base = (storeId: number) => `/api/stores/${storeId}`;

export const listProducts = (storeId: number) => api<ProductView[]>('GET', `${base(storeId)}/products`).then((l) => l.map(toProduct));

// 등록되지 않은 바코드는 null
export async function getProduct(storeId: number, barcode: string) {
  try {
    return toProduct(await api<ProductView>('GET', `${base(storeId)}/products/${encodeURIComponent(barcode)}`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// 입고: 재고를 더하고, 등록되지 않은 상품은 새로 등록한다. 상품별 입고 전후 수량을 돌려준다.
export const receive = (storeId: number, items: Receipt[]) =>
  api<ReceiptResult[]>('POST', `${base(storeId)}/receipts`, {
    items: items.map((i) => ({ barcode: i.barcode, name: i.name, category: i.category, qty: i.qty, expiry: toDash(i.expiry) })),
  });

// 상품명·재고 수량·적정 재고 수정
export const updateProduct = (storeId: number, barcode: string, patch: { name?: string; stock?: number; min?: number }) =>
  api('PUT', `${base(storeId)}/products/${encodeURIComponent(barcode)}`, patch);

// 유통기한이 지난 상품을 재고에서 제외
export const discardExpired = (storeId: number, barcode: string) =>
  api('POST', `${base(storeId)}/products/${encodeURIComponent(barcode)}/discard`);

export const isLowStock = (stock: number, thresholdCount: number) => stock <= thresholdCount;

// 오늘 기준 남은 일수 (오늘 = 0, 지났으면 음수). 유통기한이 없으면 null
export function daysLeft(expiry?: string) {
  const m = expiry && /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(expiry);
  if (!m) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(+m[1], +m[2] - 1, +m[3]).getTime() - today.getTime()) / 86400000);
}
