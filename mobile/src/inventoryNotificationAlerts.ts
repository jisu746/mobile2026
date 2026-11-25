import {daysLeft,Product} from './inventory';
import {Notif} from './notifs';
type InventoryAlert=Notif & {localKey:string;order:number;targetBarcode:string};
export function buildInventoryAlerts(products: Product[], expirationAlertDays: number, lowStockThresholdCount: number, expiryOn: boolean, stockOn: boolean, readKeys: Set<string>): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];
  const now = new Date();

  for (const product of products) {
    const days = daysLeft(product.expiry);
    if (expiryOn && days !== null && days >= 0 && days <= expirationAlertDays) {
      const localKey = `expiry:${product.barcode}:${product.expiry}`;
      alerts.push({
        id: 0,
        kind: 'expiry',
        title: `${product.name} 유통기한 임박`,
        sub: `${days === 0 ? '오늘 만료' : `D-${days}`} · 유통기한 ${product.expiry} · 재고 ${product.stock}개`,
        createdAt: now,
        read: readKeys.has(localKey),
        localKey,
        targetBarcode: product.barcode,
        order: days,
      });
    }

    const threshold = product.min > 0 ? product.min : lowStockThresholdCount;
    if (stockOn && product.stock <= threshold) {
      const localKey = `stock:${product.barcode}`;
      alerts.push({
        id: 0,
        kind: 'stock',
        title: `${product.name} 발주 필요`,
        sub: `재고 ${product.stock}개 · 발주 기준 ${threshold}개 이하`,
        createdAt: now,
        read: readKeys.has(localKey),
        localKey,
        targetBarcode: product.barcode,
        order: product.stock,
      });
    }
  }

  return alerts.sort((a, b) => (a.kind === b.kind ? a.order - b.order : a.kind === 'expiry' ? -1 : 1));
}
