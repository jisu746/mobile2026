// 재고로 오늘의 업무를 만들고 완료 표시를 서버와 맞추는 모듈 (useTasks)
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from './api';
import { daysLeft, isLowStock, listProducts, Product, productLowStockThreshold } from './inventory';
import { DEFAULT_STORE_SETUP_SETTINGS, getStoreSetupSettingsOrDefault } from './storeSetupRepository';
import type { StoreSetupSettings } from './storeSetupRepository';
import { CustomTask, customTasks, taskStatus } from './customTasks';

// 오늘의 업무는 재고에서 만든다: 유통기한 지남 → 폐기, 임박 → 확인, 재고 부족 → 발주.
// 서버에는 어떤 업무를 마쳤는지(id)만 저장한다.
export type Task = {
  id: string;
  kind: 'expired' | 'soon' | 'low' | 'custom';
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  tag: string;
  tone: 'action' | 'urgent' | 'normal';
  custom?: CustomTask;
};

export function buildTasks(
  products: Product[],
  settings: Pick<
    StoreSetupSettings,
    'expirationAlertDays' | 'lowStockThresholdCount' | 'expiryEnabled'
  > = DEFAULT_STORE_SETUP_SETTINGS,
): Task[] {
  const out: Task[] = [];
  for (const p of products) {
    const d = settings.expiryEnabled === false ? null : daysLeft(p.expiry);
    if (d !== null && d < 0) {
      out.push({
        id: `expired:${p.barcode}`,
        kind: 'expired',
        title: `${p.name} 폐기 처리`,
        sub: '유통기한이 지났어요',
        icon: 'time-outline',
        tag: '폐기',
        tone: 'urgent',
      });
    } else if (d !== null && d <= settings.expirationAlertDays) {
      out.push({
        id: `soon:${p.barcode}`,
        kind: 'soon',
        title: `${p.name} 유통기한 확인`,
        sub: d === 0 ? '유통기한 오늘' : d === 1 ? '유통기한 내일' : `유통기한 D-${d}`,
        icon: 'time-outline',
        tag: d === 0 ? 'D-day' : `D-${d}`,
        tone: 'urgent',
      });
    }
    const stockThreshold = productLowStockThreshold(p.min, settings.lowStockThresholdCount);
    if (isLowStock(p.stock, stockThreshold)) {
      out.push({
        id: `low:${p.barcode}`,
        kind: 'low',
        title: `${p.name} 발주 필요`,
        sub: `현재 ${p.stock}개 · 발주 기준 ${stockThreshold}개`,
        icon: 'cube-outline',
        tag: '발주',
        tone: 'action',
      });
    }
  }
  const order = { expired: 0, soon: 1, low: 2, custom: 3 };
  return out.sort((a, b) => order[a.kind] - order[b.kind]);
}

const doneKeys = (storeId: number) => api<string[]>('GET', `/api/stores/${storeId}/tasks/done`);
const mark = (storeId: number, key: string, done: boolean) =>
  api<string[]>('POST', `/api/stores/${storeId}/tasks/done`, { key, done });

// 업무 목록과 완료 표시. reload 로 다시 불러온다 (재고가 바뀐 뒤 화면에 돌아올 때)
export function useTasks(storeId: number) {
  const request = useRef(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [alertSettings, setAlertSettings] = useState(DEFAULT_STORE_SETUP_SETTINGS);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '요청을 처리하지 못했어요');

  useEffect(() => {
    let active = true;
    getStoreSetupSettingsOrDefault(storeId)
      .then((settings) => {
        if (active) setAlertSettings(settings);
      })
      .catch(fail);
    return () => {
      active = false;
    };
  }, [storeId]);

  const reload = useCallback(() => {
    const current = ++request.current;
    Promise.all([listProducts(storeId), doneKeys(storeId), customTasks.list(storeId)]).then(
      ([p, d, shared]) => {
        if (current !== request.current) return;
        setTasks([
          ...buildTasks(p, alertSettings),
          ...shared.map(
            (t): Task => ({
              id: `custom:${t.id}`,
              kind: 'custom',
              title: t.title,
              sub: t.description,
              icon: 'checkbox-outline',
              tag: taskStatus(t),
              tone: t.urgent ? 'urgent' : 'normal',
              custom: t,
            }),
          ),
        ]);
        setDone([
          ...d.filter((id) => !id.startsWith('custom:')),
          ...shared.filter((t) => t.status === 'APPROVED').map((t) => `custom:${t.id}`),
        ]);
        setError('');
      },
      (e) => {
        if (current === request.current) fail(e);
      },
    );
  }, [storeId, alertSettings]);
  useEffect(() => {
    reload();
    return () => {
      request.current++;
    };
  }, [reload]);

  const toggle = (id: string) => {
    if (id.startsWith('custom:')) return;
    const on = !done.includes(id);
    setDone((c) => (on ? [...c, id] : c.filter((x) => x !== id)));
    mark(storeId, id, on).then(
      (keys) =>
        setDone((current) => [
          ...keys.filter((key) => !key.startsWith('custom:')),
          ...current.filter((key) => key.startsWith('custom:')),
        ]),
      (e) => {
        fail(e);
        reload();
      },
    );
  };

  return { tasks, done, toggle, reload, error };
}
