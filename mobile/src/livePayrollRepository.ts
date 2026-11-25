import { api } from './api';
import { wageRepository } from './wageRepository';
import type { LegacyRecord } from './wageRepository';
import { summarizePay, sessionHours } from './payCalculation';

export type PayrollMember = { memberId: number; name: string; hourlyWage: number | null };
export type PayrollRecord = Omit<LegacyRecord, 'clockIn' | 'clockOut'> & { clockIn: Date; clockOut: Date | null };
export function payrollSummary(records: PayrollRecord[], now = new Date()) {
  return {
    ...summarizePay(records, now),
    hours: records.reduce((sum, record) => sum + sessionHours(record, now), 0),
    days: new Set(records.map(({ clockIn: d }) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)).size,
    active: records.filter(record => !record.clockOut).length,
  };
}
export const livePayrollRepository = {
  async members(storeId: number): Promise<PayrollMember[]> {
    if (!Number.isSafeInteger(storeId) || storeId <= 0) throw new Error('매장을 다시 선택해 주세요.');
    return api('GET', `/api/stores/${storeId}/staff`);
  },
  async records(storeId: number, memberId: number, month: string): Promise<PayrollRecord[]> {
    const records = await wageRepository.records(storeId, String(memberId), month);
    return records.map(record => {
      const clockIn = new Date(record.clockIn);
      const clockOut = record.clockOut ? new Date(record.clockOut) : null;
      if (!Number.isFinite(clockIn.getTime()) || (clockOut && (!Number.isFinite(clockOut.getTime()) || clockOut < clockIn)))
        throw new Error('근무 기록의 날짜를 확인할 수 없어요.');
      return { ...record, clockIn, clockOut };
    });
  },
};
