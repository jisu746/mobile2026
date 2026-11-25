import WorkBreakEditor from './WorkBreakEditor';
import { sessionHours } from './payCalculation';
// 근무 기록 화면 (달력, 예상 급여) - MY 에서 열린다
import { useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, TextProps, View } from 'react-native';
import { Text as AppText } from './font';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';
import { hoursByDay, hr, listSessions, won } from './work';
import type { Session } from './work';
import { summarizePay } from './payCalculation';
import PayrollSettlement from './PayrollSettlement';

function Text(props: TextProps) {
  return (
    <AppText
      {...props}
      style={[Platform.OS === 'android' && { fontFamily: 'sans-serif', includeFontPadding: false }, props.style]}
    />
  );
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const duration = (hours: number) => {
  const seconds = Math.max(0, Math.round(hours * 3600));
  const h = Math.floor(seconds / 3600),
    m = Math.floor(seconds / 60) % 60,
    sec = seconds % 60;
  return h ? `${h}시간 ${m}분` : m ? `${m}분 ${sec}초` : `${sec}초`;
};
const clockText = (d: Date) =>
  [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');

export default function WorkRecords({ storeId, onBack }: { storeId: number; onBack: () => void }) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [days, setDays] = useState<Record<string, number> | null>(null); // 날짜별 근무 시간 (null = 불러오는 중)
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const hoursOf = (d: Date) => days?.[key(d)] ?? 0;

  useEffect(() => {
    let alive = true;
    setDays(null);
    setError('');
    setSessions([]);
    listSessions(storeId, month.getFullYear(), month.getMonth() + 1).then(
      (l) => {
        if (alive) {
          setSessions(l);
          setDays(hoursByDay(l));
        }
      },
      (e) => alive && (setDays({}), setError(e instanceof Error ? e.message : '근무 기록을 불러오지 못했어요')),
    );
    return () => {
      alive = false;
    };
  }, [storeId, month, version]);

  // 안드로이드 뒤로가기로 근무 기록 화면만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const lead = first.getDay();
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - lead + i)); // 6주 × 7일

  // 이번 달 요약
  let total = 0,
    workDays = 0;
  for (let d = new Date(y, m, 1); d.getMonth() === m; d.setDate(d.getDate() + 1)) {
    const h = hoursOf(d);
    if (!h) continue;
    total += h;
    workDays += 1;
  }
  const isThisMonth = y === today.getFullYear() && m === today.getMonth();

  const selHours = hoursOf(selected);
  const selIsToday = key(selected) === key(today);
  const selectedInMonth = selected.getFullYear() === y && selected.getMonth() === m;
  const selectedSessions = sessions.filter((session) => key(session.clockIn) === key(selected));
  const pay = summarizePay(sessions);
  const selectedPay = summarizePay(selectedSessions);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>근무 기록</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        overScrollMode="never"
        bounces={false}
        decelerationRate={Platform.OS === 'android' ? 0 : 'normal'}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.body}
      >
        <View style={s.monthRow}>
          <Text style={s.month}>
            {y}년 {m + 1}월
          </Text>
          <View style={s.navs}>
            <Pressable style={s.nav} onPress={() => setMonth(new Date(y, m - 1, 1))}>
              <Ionicons name="chevron-back" size={16} color={C.text} />
            </Pressable>
            <Pressable style={s.nav} onPress={() => setMonth(new Date(y, m + 1, 1))}>
              <Ionicons name="chevron-forward" size={16} color={C.text} />
            </Pressable>
          </View>
        </View>

        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLabel}>{isThisMonth ? '이번 달' : `${m + 1}월`} 기본급 예상</Text>
              <Text style={s.heroPay}>
                {won(pay.knownPay)}
                <Text style={s.heroWon}>원</Text>
              </Text>
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>근무별 보존 시급 기준</Text>
            </View>
          </View>
          <View style={s.metrics}>
            <Metric label="총 근무시간" value={duration(total)} unit="" />
            <Metric label="근무 일수" value={String(workDays)} unit="일" />
          </View>
          <View style={s.allowance}>
            <Text style={s.metricLabel}>주휴·가산 수당</Text>
            <Text style={s.allowanceValue}>별도 확인</Text>
          </View>
        </View>

        <PayrollSettlement storeId={storeId} period={`${y}-${String(m + 1).padStart(2, '0')}`} />
        {!!pay.unconfirmed && (
          <Text style={{ color: '#B3261E', fontSize: 12, lineHeight: 20, marginTop: 12 }}>
            기존 근무 {pay.unconfirmed}건은 적용 시급 확인이 필요해 금액에서 제외했어요. 관리자가 직원 시급 설정에서
            확인할 수 있어요.
          </Text>
        )}

        <View style={s.calendar}>
          <View style={s.weekRow}>
            {DAYS.map((d, i) => (
              <Text key={d} style={[s.weekday, i === 0 && { color: '#B3261E' }, i === 6 && { color: C.primary }]}>
                {d}
              </Text>
            ))}
          </View>
          {Array.from({ length: 6 }, (_, w) => (
            <View key={w} style={s.weekRow}>
              {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
                const inMonth = d.getMonth() === m;
                const h = inMonth ? hoursOf(d) : 0;
                const isToday = key(d) === key(today);
                const isSel = key(d) === key(selected);
                return (
                  <Pressable
                    key={i}
                    disabled={!inMonth}
                    style={[s.cell, !inMonth && { opacity: 0.25 }, isSel && s.cellSel]}
                    onPress={() => setSelected(d)}
                  >
                    <Text
                      style={[
                        s.dayNum,
                        i === 0 && { color: '#B3261E' },
                        i === 6 && { color: C.primary },
                        isToday && s.dayToday,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                    {inMonth && isToday && (
                      <View style={[s.badge, { backgroundColor: C.primary }]}>
                        <Text style={[s.badgeText, { color: '#fff' }]}>Today</Text>
                      </View>
                    )}
                    {h > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>
                          {h < 1 / 60 ? '<1분' : h < 1 ? `${Math.floor(h * 60)}분` : `${hr(h)}h`}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {!!error && (
          <View style={s.notice}>
            <Text style={s.noticeText}>{error}</Text>
          </View>
        )}

        {!error && days === null && (
          <View style={s.notice}>
            <Text style={s.noticeText}>근무 기록을 불러오는 중이에요.</Text>
          </View>
        )}

        {!error && days !== null && selectedInMonth && selectedSessions.length === 0 && (
          <View style={s.notice}>
            <Text style={s.noticeText}>
              {selIsToday ? '오늘은 아직 근무 기록이 없어요.' : '이 날은 근무 기록이 없어요.'}
            </Text>
          </View>
        )}

        {!error && days !== null && selectedInMonth && selectedSessions.length > 0 && (
          <>
            <Text style={s.detailTitle}>
              {selected.getMonth() + 1}월 {selected.getDate()}일 ({DAYS[selected.getDay()]}) 근무 상세
            </Text>
            <View style={s.detail}>
              <View style={s.heroTop}>
                <Text style={s.detailPay}>
                  {won(selectedPay.knownPay)}
                  <Text style={s.detailWon}> 원{selectedPay.unconfirmed ? ' (확정분)' : ''}</Text>
                </Text>
                <View style={s.pill}>
                  <Text style={s.pillText}>근무별 적용 시급</Text>
                </View>
              </View>
              <View style={s.detailBox}>
                <Text style={s.metricLabel}>근무시간</Text>
                <Text style={s.metricValue}>{duration(selHours)}</Text>
              </View>
              {selectedSessions.map((session, index) => (
                <View key={`${session.clockIn.toISOString()}-${index}`} style={s.detailBox}>
                  <Text style={s.metricLabel}>{index + 1}번째 근무</Text>
                  <View style={s.sessionRow}>
                    <Text style={s.sessionLabel}>적용 시급</Text>
                    <Text style={s.sessionTime}>
                      {session.hourlyWage == null
                        ? '확인 필요 · 금액 제외'
                        : `${won(session.hourlyWage)}원${session.wageSource === 'DEFAULT' ? ' (기본값 보존)' : ''}`}
                    </Text>
                  </View>
                  <View style={s.sessionRow}>
                    <Text style={s.sessionLabel}>출근</Text>
                    <Text style={s.sessionTime}>{clockText(session.clockIn)}</Text>
                  </View>
                  <View style={s.sessionRow}>
                    <Text style={s.sessionLabel}>퇴근</Text>
                    <Text style={s.sessionTime}>
                      {session.clockOut
                        ? `${key(session.clockOut) !== key(session.clockIn) ? `${session.clockOut.getMonth() + 1}/${session.clockOut.getDate()} ` : ''}${clockText(session.clockOut)}`
                        : '근무 중'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, lineHeight: 20, color: '#DAD5ED' }}>
                    휴게 {Math.floor((session.breakSeconds ?? 0) / 60)}분 · 실근무 기준
                  </Text>
                  {session.sessionId != null && (
                    <WorkBreakEditor
                      storeId={storeId}
                      sessionId={session.sessionId}
                      onSaved={() => setVersion((v) => v + 1)}
                    />
                  )}
                  <View style={s.sessionRow}>
                    <Text style={s.sessionLabel}>{session.clockOut ? '근무시간' : '조회 시점 근무시간'}</Text>
                    <Text style={s.sessionTime}>{duration(sessionHours(session))}</Text>
                  </View>
                  {!!session.correctedAt && (
                    <Text style={[s.sessionLabel, { marginTop: 10 }]}>
                      관리자 퇴근 처리 · {session.correctedBy ?? '관리자'}
                      {'\n'}
                      {session.correctedAt.replace('T', ' ')}
                      {'\n'}사유: {session.correctionReason}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={s.metricValue}>
        {value}
        <Text style={s.metricUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 56 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 20, paddingBottom: 60 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },
  month: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  navs: { flexDirection: 'row', gap: 4 },
  nav: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFCCDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 20,
    shadowColor: C.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroTop: { alignItems: 'flex-start', gap: 8 },
  heroLabel: { lineHeight: 20, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  heroPay: { lineHeight: 40, fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginTop: 4 },
  heroWon: { fontSize: 18, fontWeight: '600' },
  pill: {
    maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { lineHeight: 18, fontSize: 11.5, fontWeight: '600', color: '#fff' },
  metrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  metric: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingTop: 10,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  metricLabel: { lineHeight: 16, fontSize: 10.5, letterSpacing: -0.4, color: 'rgba(255,255,255,0.75)' },
  metricValue: { lineHeight: 25, fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  allowance: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  allowanceValue: { fontSize: 13, fontWeight: '600', color: '#fff' },
  metricUnit: { fontSize: 12, fontWeight: '500' },
  calendar: {
    borderWidth: 1,
    borderColor: '#E4E2EC',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 14,
    gap: 6,
  },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: '600', color: '#5E5C6B', marginBottom: 4 },
  cell: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    paddingTop: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellSel: { borderColor: C.primary, backgroundColor: '#F5F4FB' },
  dayNum: { lineHeight: 20, fontSize: 13.5, fontWeight: '500', color: C.text },
  dayToday: { fontWeight: '700', color: C.primary },
  badge: { marginTop: 3, backgroundColor: '#ECEAF7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { lineHeight: 13, fontSize: 10, fontWeight: '700', color: C.primary },
  notice: { backgroundColor: C.primary, borderRadius: 20, padding: 20, marginTop: 16 },
  noticeText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  detailTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 22, marginBottom: 10 },
  detail: { backgroundColor: C.primary, borderRadius: 20, padding: 20 },
  detailPay: { fontSize: 24, fontWeight: '800', color: '#fff' },
  detailWon: { fontSize: 15, fontWeight: '600' },
  detailBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 16 },
  sessionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sessionLabel: { lineHeight: 19, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  sessionTime: { lineHeight: 21, fontSize: 14, fontWeight: '600', color: '#fff' },
});
