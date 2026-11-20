// 인수인계 메모 서버 연동 (목록, 작성, 긴급 확인 완료)
import { api } from './api';

// 인수인계 메모는 서버에 저장한다 (매장별 최근 20개)
export type Handover = { id: number; author: string; mine: boolean; content: string; urgent: boolean; resolved: boolean; createdAt: Date };

type View = Omit<Handover, 'createdAt'> & { createdAt: string };
const toHandover = (v: View): Handover => ({ ...v, createdAt: new Date(v.createdAt) });
const base = (storeId: number) => `/api/stores/${storeId}/handovers`;

export const listHandovers = (storeId: number) => api<View[]>('GET', base(storeId)).then((l) => l.map(toHandover));

export const writeHandover = (storeId: number, content: string, urgent: boolean) =>
  api<View>('POST', base(storeId), { content, urgent }).then(toHandover);

// 긴급 인수인계 확인 완료 표시 (done=false 로 되돌릴 수 있다)
export const resolveHandover = (storeId: number, id: number, done: boolean) =>
  api<View>('POST', `${base(storeId)}/${id}/resolve`, { done }).then(toHandover);
