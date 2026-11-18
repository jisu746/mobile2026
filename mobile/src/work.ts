// 출근·퇴근·근무 기록 서버 연동과 시간·금액 표기 도우미
import { api } from './api';

// 출퇴근과 근무 기록은 서버에 저장한다. 시각은 서버가 준 yyyy-MM-ddTHH:mm:ss 문자열을 Date 로 바꿔 쓴다.
export type Session = { clockIn: Date; clockOut: Date | null };

export const WAGE = 10030; // TODO: 시급은 직원 정보에서 가져온다

const base = (storeId: number) => `/api/stores/${storeId}/work`;
const at = (s: string | null) => (s ? new Date(s) : null);

// 출근 중이면 출근 시각, 아니면 null
export const currentShift = (storeId: number) => api<{ clockedAt: string | null }>('GET', `${base(storeId)}/current`).then((r) => at(r.clockedAt));

// 매장 QR 값으로 출근. 다른 매장의 QR 이면 서버가 거절한다
export const clockIn = (storeId: number, code: string) => api<{ clockedAt: string | null }>('POST', `${base(storeId)}/clock-in`, { code }).then((r) => at(r.clockedAt));

// 지금 근무 중인 사람들 (사장님 홈의 근무 현황)
export const activeStaff = (storeId: number) =>
  api<{ name: string; clockIn: string }[]>('GET', `${base(storeId)}/active`).then((l) => l.map((r) => ({ name: r.name, clockIn: new Date(r.clockIn) })));

export const clockOut =(storeId: number) => api('POST', `${base(storeId)}/clock-out`);

// month(1~12)달에 출근한 기록
export const listSessions = (storeId: number, year: number, month: number): Promise<Session[]> =>
  api<{ clockIn: string; clockOut: string | null }[]>('GET', `${base(storeId)}/records?month=${year}-${String(month).padStart(2, '0')}`)
    .then((l) => l.map((r) => ({ clockIn: new Date(r.clockIn), clockOut: at(r.clockOut) })));

// 날짜(연-월-일)별 근무 시간. 아직 퇴근 전이면 지금까지로 센다
export function hoursByDay(list: Session[]) {
  const out: Record<string, number> = {};
  for (const s of list) {
    const d = s.clockIn;
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    out[k] = (out[k] ?? 0) + Math.max(0, ((s.clockOut ?? new Date()).getTime() - d.getTime()) / 3600000);
  }
  return out;
}

export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const won =(n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// 시간 표기: 소수 첫째 자리까지, 정수면 소수점 없이
export const hr = (n: number) => String(Math.round(n * 10) / 10);
