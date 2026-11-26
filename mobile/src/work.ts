import { clockInLocation } from './location';
// 출근·퇴근·근무 기록 서버 연동과 시간·금액 표기 도우미
import { useEffect, useState } from 'react';
import { api } from './api';

// 출퇴근과 근무 기록은 서버에 저장한다. 시각은 서버가 준 yyyy-MM-ddTHH:mm:ss 문자열을 Date 로 바꿔 쓴다.
export type Session = {
  breakSeconds?: number;
  breakRevision?: number;
  breaks?: string | null;
  sessionId?: number;
  clockIn: Date;
  clockOut: Date | null;
  hourlyWage?: number | null;
  wageSource?: string | null;
  correctedBy?: string | null;
  correctedAt?: string | null;
  correctionReason?: string | null;
};

// 시급과 근무 일정은 사장님이 정한다. 사장님이 시급을 정하기 전에는 최저시급(2026년)으로 계산한다.
export const MIN_WAGE = 10320;
type Me = { wage: number; wageSet: boolean; joinedAt: Date | null };
export type Shift = { date: string; start: string; end: string }; // date: yyyy-MM-dd, 시각: HH:mm

const dateOnly = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getMe = (storeId: number): Promise<Me> =>
  api<{ hourlyWage: number | null; joinedAt: string }>('GET', `/api/stores/${storeId}/me`).then((r) => ({
    wage: r.hourlyWage ?? MIN_WAGE,
    wageSet: r.hourlyWage != null,
    joinedAt: dateOnly(r.joinedAt),
  }));

// 내 시급과 입사일. 불러오기 전이나 실패했을 때는 기본 시급을 쓴다
export function useMe(storeId: number) {
  const [me, setMe] = useState<Me>({ wage: MIN_WAGE, wageSet: false, joinedAt: null });
  useEffect(() => {
    getMe(storeId).then(setMe, () => {});
  }, [storeId]);
  return me;
}

// 내 근무 일정 (year/month: month 는 1~12)
export const listShifts = (storeId: number, year: number, month: number) =>
  api<Shift[]>('GET', `/api/stores/${storeId}/schedule?month=${year}-${String(month).padStart(2, '0')}`);

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 오늘 일정 기준 지금 상태: none(일정 없음) / before(시작 전) / during(근무 시간) / after(끝남)
// ponytail: 어제 시작해 오늘 새벽에 끝나는 일정은 보지 않는다 (필요하면 어제 일정도 함께 확인)
export function shiftState(shift: Shift | undefined, now = new Date()) {
  if (!shift) return 'none';
  const at = (t: string, plusDay = 0) => {
    const [h, m] = t.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + plusDay, h, m);
  };
  const start = at(shift.start);
  const end = at(shift.end, shift.end <= shift.start ? 1 : 0); // 종료가 시작보다 이르면 다음 날 새벽까지
  return now < start ? 'before' : now < end ? 'during' : 'after';
}

const base = (storeId: number) => `/api/stores/${storeId}/work`;
const at = (s: string | null) => (s ? new Date(s) : null);

// 이 매장의 출근 시각(출근 중이 아니면 null)과, 다른 매장에서 근무 중이면 그 매장 이름
export const currentShift = (storeId: number) =>
  api<{ clockedAt: string | null; elsewhere: string | null }>('GET', `${base(storeId)}/current`).then((r) => ({
    clockedAt: at(r.clockedAt),
    elsewhere: r.elsewhere,
  }));

// 매장 QR 값으로 출근. 다른 매장의 QR 이면 서버가 거절한다
export const clockIn = async (storeId: number, code: string) => {
  const location = await clockInLocation(storeId);
  const r = await api<{ clockedAt: string | null }>('POST', `${base(storeId)}/clock-in`, { code, ...location });
  return at(r.clockedAt);
};

// 지금 근무 중인 사람들 (사장님 홈의 근무 현황)
export const activeStaff = (storeId: number) =>
  api<{ name: string; clockIn: string }[]>('GET', `${base(storeId)}/active`).then((l) =>
    l.map((r) => ({ name: r.name, clockIn: new Date(r.clockIn) })),
  );

export const clockOut = (storeId: number) => api('POST', `${base(storeId)}/clock-out`);

// month(1~12)달에 출근한 기록
export const listSessions = (storeId: number, year: number, month: number): Promise<Session[]> =>
  api<
    {
      sessionId: number;
      clockIn: string;
      clockOut: string | null;
      hourlyWage: number | null;
      wageSource: string | null;
    }[]
  >('GET', `${base(storeId)}/records?month=${year}-${String(month).padStart(2, '0')}`).then((l) =>
    l.map((r) => ({ ...r, clockIn: new Date(r.clockIn), clockOut: at(r.clockOut) })),
  );

// 날짜별 묶음에 쓰는 키 (연-월-일, 월은 0부터)
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// 날짜(연-월-일)별 근무 시간. 아직 퇴근 전이면 지금까지로 센다
export function hoursByDay(list: Session[]) {
  const out: Record<string, number> = {};
  for (const s of list) {
    const d = s.clockIn;
    const k = dayKey(d);
    out[k] =
      (out[k] ?? 0) +
      Math.max(0, ((s.clockOut ?? new Date()).getTime() - d.getTime()) / 3600000 - (s.breakSeconds ?? 0) / 3600);
  }
  return out;
}

export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const won = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// 시간 표기: 소수 첫째 자리까지, 정수면 소수점 없이
export const hr = (n: number) => String(Math.round(n * 10) / 10);
