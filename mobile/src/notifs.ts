// 알림 목록·읽음 처리 서버 연동
import { api } from './api';

// 알림은 서버가 매장에서 일어난 일(입고, 출근, 참여 요청, 인수인계)을 보고 만든다 (최근 30일)
export type Notif = {
  targetId?: number | null;
  targetBarcode?: string; // 누르면 이 상품의 재고 화면으로 이동한다
  id: number;
  kind: string;
  title: string;
  sub: string;
  createdAt: Date;
  read: boolean;
};

type View = Omit<Notif, 'createdAt' | 'sub' | 'targetBarcode'> & {
  createdAt: string;
  sub: string | null;
  targetBarcode: string | null;
};

export const listNotifs = (storeId: number) =>
  api<View[]>('GET', `/api/stores/${storeId}/notifications`).then((l) =>
    l.map(
      (v): Notif => ({
        ...v,
        sub: v.sub ?? '',
        targetBarcode: v.targetBarcode ?? undefined,
        createdAt: new Date(v.createdAt),
      }),
    ),
  );

export const markRead = (storeId: number, ids: number[]) =>
  api('POST', `/api/stores/${storeId}/notifications/read`, { ids });
