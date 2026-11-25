// 알림 목록·읽음 처리 서버 연동
import { api } from './api';

// 알림은 서버가 매장에서 일어난 일(입고, 출근, 참여 요청, 인수인계)을 보고 만든다 (최근 30일)
export type Notif = { targetId?:number|null; id: number; kind: string; title: string; sub: string; createdAt: Date; read: boolean };

type View = Omit<Notif, 'createdAt' | 'sub'> & { createdAt: string; sub: string | null };

export const listNotifs = (storeId: number) =>
  api<View[]>('GET', `/api/stores/${storeId}/notifications`).then((l) => l.map((v): Notif => ({ ...v, sub: v.sub ?? '', createdAt: new Date(v.createdAt) })));

export const markRead = (storeId: number, ids: number[]) => api('POST', `/api/stores/${storeId}/notifications/read`, { ids });
export const hasUnreadNotifs = (storeId: number) => storeId > 0 ? listNotifs(storeId).then((l) => l.some((n) => !n.read)) : Promise.resolve(false);