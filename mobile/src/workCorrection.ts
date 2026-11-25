import { api } from './api';
import type { PayrollRecord } from './livePayrollRepository';

export function validateClockOut(record: PayrollRecord, date: string, time: string, reason: string, now = new Date()) {
  if (record.clockOut) throw new Error('이미 퇴근한 기록이에요. 새로고침해 주세요.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time))
    throw new Error('날짜는 YYYY-MM-DD, 시각은 HH:mm:ss 형식으로 입력해 주세요.');
  const [y, m, d] = date.split('-').map(Number),
    [h, min, sec] = time.split(':').map(Number);
  const end = new Date(y, m - 1, d, h, min, sec);
  if (
    end.getFullYear() !== y ||
    end.getMonth() !== m - 1 ||
    end.getDate() !== d ||
    end.getHours() !== h ||
    end.getMinutes() !== min ||
    end.getSeconds() !== sec
  )
    throw new Error('유효한 퇴근 날짜와 시각을 입력해 주세요.');
  if (end <= record.clockIn || end > now) throw new Error('퇴근 시각은 출근 이후부터 현재 시각까지 입력해 주세요.');
  if (!reason.trim() || reason.trim().length > 300) throw new Error('처리 사유를 1~300자로 입력해 주세요.');
  return { clockOut: `${date}T${time}`, reason: reason.trim() };
}
export async function closeMissingClockOut(
  storeId: number,
  memberId: number,
  record: PayrollRecord,
  date: string,
  time: string,
  reason: string,
) {
  if (![storeId, memberId, record.sessionId].every((n) => Number.isSafeInteger(n) && n > 0))
    throw new Error('매장과 근무 기록을 다시 선택해 주세요.');
  const payload = validateClockOut(record, date, time, reason);
  return api('PUT', `/api/stores/${storeId}/staff/${memberId}/work-records/${record.sessionId}/close`, payload);
}
