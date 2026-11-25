export type RatedSession = { clockIn: Date; clockOut: Date | null; breakSeconds?: number; hourlyWage?: number | null };
export function sessionHours(session: RatedSession, now = new Date()) {
  return Math.max(
    0,
    ((session.clockOut ?? now).getTime() - session.clockIn.getTime()) / 3600000 - (session.breakSeconds ?? 0) / 3600,
  );
}
export function summarizePay(sessions: RatedSession[], now = new Date()) {
  let knownPay = 0,
    unconfirmed = 0;
  for (const session of sessions) {
    if (session.hourlyWage == null || !Number.isFinite(session.hourlyWage) || session.hourlyWage <= 0) unconfirmed++;
    else knownPay += sessionHours(session, now) * session.hourlyWage;
  }
  return { knownPay, unconfirmed };
}
