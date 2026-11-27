import { MIN_WAGE } from './work';

type RatedSession = { clockIn: Date; clockOut: Date | null; breakSeconds?: number; hourlyWage?: number | null };
export function sessionHours(session: RatedSession, now = new Date()) {
  return Math.max(
    0,
    ((session.clockOut ?? now).getTime() - session.clockIn.getTime()) / 3600000 - (session.breakSeconds ?? 0) / 3600,
  );
}
// 근무에 적용할 시급. 저장된 시급이 없는 근무는 최저시급으로 계산한다
export const appliedWage = (wage: number | null | undefined) =>
  wage != null && Number.isFinite(wage) && wage > 0 ? wage : MIN_WAGE;
export function summarizePay(sessions: RatedSession[], now = new Date()) {
  let pay = 0;
  for (const session of sessions) pay += sessionHours(session, now) * appliedWage(session.hourlyWage);
  return { pay };
}
