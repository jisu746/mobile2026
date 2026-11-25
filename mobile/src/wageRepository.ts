import { api } from './api';

export type WageRate = { effectiveFrom: string; hourlyWage: number; defaultRate: boolean };
export type StaffWage = { memberId: number; name: string; hourlyWage: number | null; history: WageRate[] };
export type LegacyRecord = {
  breakSeconds?: number;
  breakRevision?: number;
  breaks?: string | null;
  sessionId: number;
  clockIn: string;
  clockOut: string | null;
  hourlyWage: number | null;
  wageSource: string | null;
  correctedBy?: string | null;
  correctedAt?: string | null;
  correctionReason?: string | null;
};
export function validateEffectiveDate(value: string) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('적용 시작일을 YYYY-MM-DD 형식으로 입력해 주세요.');
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || value < today)
    throw new Error('적용 시작일은 오늘 이후의 유효한 날짜로 입력해 주세요.');
}
function base(storeId: number, memberId: string) {
  if (!Number.isSafeInteger(storeId) || storeId <= 0 || !/^[1-9]\d*$/.test(memberId))
    throw new Error('직원 정보를 확인할 수 없어요. 직원 목록에서 다시 선택해 주세요.');
  return `/api/stores/${storeId}/staff`;
}

export function parseHourlyWage(value: string): number {
  const text = value.trim();
  if (!/^\d+$/.test(text)) throw new Error('시급은 숫자로 입력해 주세요.');
  const amount = Number(text);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000)
    throw new Error('시급은 1원 이상 100,000원 이하로 입력해 주세요.');
  return amount;
}

export const wageRepository = {
  async get(storeId: number, memberId: string): Promise<StaffWage> {
    const staff = await api<StaffWage[]>('GET', base(storeId, memberId));
    const employee = staff.find((item) => String(item.memberId) === memberId);
    if (!employee) throw new Error('현재 매장에 소속된 직원을 찾을 수 없어요.');
    const history = await api<{ currentHourlyWage: number; defaultRate: boolean; history: WageRate[] }>(
      'GET',
      `${base(storeId, memberId)}/${memberId}/wage-history`,
    );
    return {
      ...employee,
      hourlyWage: history.defaultRate ? null : history.currentHourlyWage,
      history: history.history,
    };
  },
  async save(storeId: number, memberId: string, input: string, effectiveFrom: string): Promise<StaffWage> {
    const path = base(storeId, memberId);
    const hourlyWage = parseHourlyWage(input);
    validateEffectiveDate(effectiveFrom);
    await api('PUT', `${path}/${memberId}/wage`, { hourlyWage, effectiveFrom });
    return this.get(storeId, memberId);
  },
  async records(storeId: number, memberId: string, month: string): Promise<LegacyRecord[]> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('조회 월을 YYYY-MM 형식으로 입력해 주세요.');
    return api('GET', `${base(storeId, memberId)}/${memberId}/work-records?month=${month}`);
  },
  async confirm(storeId: number, memberId: string, sessionId: number, input: string): Promise<LegacyRecord> {
    if (!Number.isSafeInteger(sessionId) || sessionId <= 0) throw new Error('근무 기록을 확인할 수 없어요.');
    return api('PUT', `${base(storeId, memberId)}/${memberId}/work-records/${sessionId}/wage`, {
      hourlyWage: parseHourlyWage(input),
    });
  },
};
