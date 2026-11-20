// 재고로 오늘의 업무를 만들고 완료 표시를 서버와 맞추는 모듈 (useTasks)
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from './api';
import { IMMINENT, daysLeft, listProducts, Product } from './inventory';

// 오늘의 업무는 재고에서 만든다: 유통기한 지남 → 폐기, 임박 → 확인, 재고 부족 → 발주.
// 서버에는 어떤 업무를 마쳤는지(id)만 저장한다.
export type Task = {
  id: string;
  kind: 'expired' | 'soon' | 'low';
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  tag: string;
  tone: 'action' | 'urgent';
};

export function buildTasks(products: Product[]): Task[] {
  const out: Task[] = [];
  for (const p of products) {
    const d = daysLeft(p.expiry);
    if (d !== null && d < 0) {
      out.push({ id: `expired:${p.barcode}`, kind: 'expired', title: `${p.name} 폐기 처리`, sub: '유통기한이 지났어요', icon: 'time-outline', tag: '폐기', tone: 'urgent' });
    } else if (d !== null && d <= IMMINENT) {
      out.push({
        id: `soon:${p.barcode}`, kind: 'soon', title: `${p.name} 유통기한 확인`,
        sub: d === 0 ? '유통기한 오늘' : d === 1 ? '유통기한 내일' : `유통기한 D-${d}`,
        icon: 'time-outline', tag: d === 0 ? 'D-day' : `D-${d}`, tone: 'urgent',
      });
    }
    if (p.stock < p.min) {
      out.push({ id: `low:${p.barcode}`, kind: 'low', title: `${p.name} 발주 필요`, sub: `현재 ${p.stock}개 · 적정 ${p.min}개`, icon: 'cube-outline', tag: '발주', tone: 'action' });
    }
  }
  const order = { expired: 0, soon: 1, low: 2 };
  return out.sort((a, b) => order[a.kind] - order[b.kind]);
}

const doneKeys = (storeId: number) => api<string[]>('GET', `/api/stores/${storeId}/tasks/done`);
const mark = (storeId: number, key: string, done: boolean) => api<string[]>('POST', `/api/stores/${storeId}/tasks/done`, { key, done });

// 업무 목록과 완료 표시. reload 로 다시 불러온다 (재고가 바뀐 뒤 화면에 돌아올 때)
export function useTasks(storeId: number) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '요청을 처리하지 못했어요');

  const reload = useCallback(() => {
    Promise.all([listProducts(storeId), doneKeys(storeId)]).then(([p, d]) => {
      setTasks(buildTasks(p));
      setDone(d);
      setError('');
    }, fail);
  }, [storeId]);
  useEffect(reload, [reload]);

  const toggle = (id: string) => {
    const on = !done.includes(id);
    setDone((c) => (on ? [...c, id] : c.filter((x) => x !== id)));
    mark(storeId, id, on).then(setDone, (e) => {
      fail(e);
      reload();
    });
  };

  return { tasks, done, toggle, reload, error };
}
