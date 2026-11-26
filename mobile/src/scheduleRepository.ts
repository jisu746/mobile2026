import { api } from './api';

export type StaffShift = { date: string; start: string; end: string };
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function validShiftDate(value: string): boolean {
  const match = DAY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return y >= 1900 && y <= 9999 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function base(storeId: number, memberId: string) {
  if (!Number.isSafeInteger(storeId) || storeId <= 0 || !/^[1-9]\d*$/.test(memberId))
    throw new Error('매장 또는 직원 정보가 올바르지 않아요. 다시 들어와 주세요.');
  return `/api/stores/${storeId}/staff/${memberId}/shifts`;
}

function validateShift(shift: StaffShift) {
  if (!validShiftDate(shift.date)) throw new Error('올바른 근무 날짜를 선택해 주세요.');
  if (!TIME.test(shift.start) || !TIME.test(shift.end)) throw new Error('시간은 09:00처럼 시:분으로 입력해 주세요.');
  if (shift.start === shift.end) throw new Error('시작과 종료 시간을 다르게 입력해 주세요.');
}

export const scheduleRepository = {
  async list(storeId: number, memberId: string, month: string): Promise<StaffShift[]> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('올바른 월을 선택해 주세요.');
    return api<StaffShift[]>('GET', `${base(storeId, memberId)}?month=${month}`);
  },
  async save(storeId: number, memberId: string, shift: StaffShift): Promise<StaffShift[]> {
    validateShift(shift);
    return api<StaffShift[]>('PUT', base(storeId, memberId), { shifts: [shift] });
  },
  async remove(storeId: number, memberId: string, date: string): Promise<StaffShift[]> {
    if (!validShiftDate(date)) throw new Error('올바른 근무 날짜를 선택해 주세요.');
    return api<StaffShift[]>('PUT', base(storeId, memberId), { shifts: [{ date, start: null, end: null }] });
  },
};
