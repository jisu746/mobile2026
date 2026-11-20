import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

type DayItem = {
  dateKey: string;
  day: number;
  dim?: boolean;
  col: number; // 0: 일 ~ 6: 토
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURLY_WAGE = 10030;

// TODO: 근무 기록은 샘플 데이터. API 연동 단계에서 서버 값으로 교체
const WORK_LOGS: Record<string, number> = {
  '2026-11-02': 6,
  '2026-11-04': 6,
  '2026-11-06': 6,
  '2026-11-07': 5,
  '2026-11-09': 6,
  '2026-11-11': 6,
  '2026-11-13': 6,
  '2026-11-14': 5,
  '2026-11-16': 6,
  '2026-11-18': 6,
  '2026-11-20': 4,
};

const toKey = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function getCalendarDays(year: number, month: number): DayItem[] {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const prevLastDate = new Date(year, month - 1, 0).getDate();

  const days: DayItem[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevLastDate - i;
    days.push({ dateKey: `prev-${d}`, day: d, dim: true, col: days.length % 7 });
  }
  for (let d = 1; d <= lastDate; d++) {
    days.push({ dateKey: toKey(year, month, d), day: d, col: days.length % 7 });
  }
  const remain = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remain; d++) {
    days.push({ dateKey: `next-${d}`, day: d, dim: true, col: days.length % 7 });
  }
  return days;
}

export default function WorkLog({ onBack, onBell }: { onBack: () => void; onBell: () => void }) {
  const now = new Date();
  const todayKey = toKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedKey, setSelectedKey] = useState(todayKey);

  // 안드로이드 뒤로가기로 근무 기록 화면만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const moveMonth = (diff: number) => {
    const next = new Date(year, month - 1 + diff, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  const getDayColor = (item: DayItem, isToday: boolean) => {
    if (isToday) return C.primary;
    if (item.col === 0) return '#B3261E';
    if (item.col === 6) return C.primary;
    return C.text;
  };

  const monthly = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    const list = Object.entries(WORK_LOGS)
        .filter(([key]) => key.startsWith(prefix))
        .map(([, hours]) => hours);
    
    const workDays = list.length;
    const totalHours = Math.round(list.reduce((sum, h) => sum + h, 0) * 10) / 10;
    const basePay = Math.round(totalHours * HOURLY_WAGE);
    // 주휴수당: 총 근무시간 15시간 이상이면 기본 급의 20%
    const holidayPay = totalHours >= 15 ? Math.round(basePay * 0.2) : 0;

    return { workDays, totalHours, holidayPay, totalPay: basePay + holidayPay };
  }, [year, month]);

  const selectedHours = WORK_LOGS[selectedKey];
  const selectedPay = selectedHours ? Math.round(selectedHours * HOURLY_WAGE) : 0;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>근무 기록</Text>
        <Pressable onPress={onBell} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} color={C.primary} />
        </Pressable>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color="#fff" />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.monthBar}>
          <Text style={s.monthText}>
            {year}년 {month}월
          </Text>
          <View style={s.monthBtns}>
            <Pressable style={s.navBtn} onPress={() => moveMonth(-1)}>
              <Ionicons name="chevron-back" size={16} color={C.text} />
            </Pressable>
            <Pressable style={s.navBtn} onPress={() => moveMonth(1)}>
              <Ionicons name="chevron-forward" size={16} color={C.text} />
            </Pressable>
          </View>
        </View>

        <View style={s.salaryCard}>
          <View style={s.salaryTop}>
            <View style={{ gap: 2 }}>
              <Text style={s.salaryLabel}>{month}월 예상 급여</Text>
              <Text style={s.salaryAmount}>
                {monthly.totalPay.toLocaleString()}<Text style={s.salaryWon}>원</Text>
              </Text>
            </View>
            <View style={s.wageBadge}>
              <Text style={s.wageBadgeText}>시급 {HOURLY_WAGE.toLocaleString()}원 기준</Text>
            </View>
          </View>

          <View style={s.statRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>총 근무시간</Text>
              <Text style={s.statVal}>
                {monthly.totalHours}<Text style={s.statUnit}> 시간</Text>
              </Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>근무 일수</Text>
              <Text style={s.statVal}>
                {monthly.workDays}<Text style={s.statUnit}> 일</Text>
              </Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>주휴수당(예상)</Text>
              <Text style={s.statVal}>
                {(monthly.holidayPay / 10000).toFixed(1)}<Text style={s.statUnit}> 만</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={s.calendarCard}>
          <View style={s.weekRow}>
            {WEEKDAYS.map((day, idx) => (
              <Text
                key={day}
                style={[
                  s.weekText,
                  idx === 0 && { color: '#B3261E' },
                  idx === 6 && { color: C.primary },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={s.grid}>
            {days.map((item) => {
              const isToday = !item.dim && item.dateKey === todayKey;
              const isSelected = !item.dim && item.dateKey === selectedKey;
              const hours = !item.dim ? WORK_LOGS[item.dateKey] : undefined;

              return (
                <Pressable
                  key={item.dateKey}
                  disabled={item.dim}
                  onPress={() => setSelectedKey(item.dateKey)}
                  style={[
                    s.dayCell,
                    item.dim && { opacity: 0.25 },
                    isSelected && s.todayCell,
                  ]}
                >
                  <Text style={[s.dayNum, { color: getDayColor(item, isToday) }, isToday && s.dayNumBold]}>
                    {item.day}
                  </Text>
                  {isToday ? (
                    <View style={s.todayBadge}>
                      <Text style={s.todayBadgeText}>Today</Text>
                    </View>
                  ) : hours ? (
                    <View style={s.hourBadge}>
                      <Text style={s.hourBadgeText}>{hours}h</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedHours !== undefined ? (
            <View style={s.dailyCard}>
                <View style={s.dailyTop}>
                    <Text style={s.dailyAmount}>
                        {selectedPay.toLocaleString()}
                        <Text style={s.dailyWon}>원</Text>
                    </Text>
                    <View style={s.wageBadge}>
                        <Text style={s.wageBadgeText}>시급 {HOURLY_WAGE.toLocaleString()}원 기준</Text>
                    </View>
                </View>

                <View style={s.dailyDivider} />

                <View style={s.dailyBox}>
                    <Text style={s.dailyBoxLabel}>근무 시간</Text>
                    <Text style={s.dailyBoxVal}>
                        {selectedHours}
                        <Text style={s.dailyBoxUnit}>시간</Text>
                    </Text>
                </View>
            </View>
            ) : (
                <View style={s.bottomCard}>
                    <Text style={s.bottomCardText}>아직 데이터가 로드되지 않았어요.</Text>
                </View>
            )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 56 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 24, gap: 12 },

  monthBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  monthText: { fontSize: 21, fontWeight: '800', color: C.text },
  monthBtns: { flexDirection: 'row', gap: 6 },
  navBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  salaryCard: { backgroundColor: C.primary, borderRadius: 20, padding: 18, gap: 14, elevation: 6 },
  salaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  salaryLabel: { color: '#fff', opacity: 0.85, fontSize: 13, fontWeight: '500' },
  salaryAmount: { color: '#fff', fontSize: 28, fontWeight: '700' },
  salaryWon: { fontSize: 17, fontWeight: '300' },
  wageBadge: { backgroundColor: `${C.pill}2E`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  wageBadgeText: { color: '#fff', fontSize: 11, fontWeight: '500' },

  statRow: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${C.border}33` },
  statBox: { flex: 1, backgroundColor: `${C.pill}1A`, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, gap: 2 },
  statLabel: { color: '#fff', opacity: 0.75, fontSize: 11 },
  statVal: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statUnit: { fontSize: 11, fontWeight: '400' },

  calendarCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 14, gap: 8 },
  weekRow: { flexDirection: 'row' },
  weekText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: C.placeholder },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', minHeight: 46, paddingTop: 4, paddingBottom: 6, alignItems: 'center', borderRadius: 10, gap: 3 },
  todayCell: { backgroundColor: `${C.primary}12`, borderWidth: 1.5, borderColor: C.primary },
  dayNum: { fontSize: 13, fontWeight: '400' },
  dayNumBold: { fontWeight: '500' },
  hourBadge: { backgroundColor: `${C.primary}1E`, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  hourBadgeText: { color: C.primary, fontSize: 10, fontWeight: '600' },
  todayBadge: { backgroundColor: C.primary, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  todayBadgeText: { color: '#fff', fontSize: 9.5, fontWeight: '600' },

  bottomCard: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 22, justifyContent: 'center', elevation: 5 },
  bottomCardText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dailyCard: { backgroundColor: C.primary, borderRadius: 20, padding: 18, gap: 14, elevation: 5 },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyAmount: { color: '#fff', fontSize: 28, fontWeight: '700' },
  dailyWon: { fontSize: 17, fontWeight: '500' },
  dailyDivider: { height: 1, backgroundColor: `${C.border}33` },
  dailyBox: { backgroundColor: `${C.pill}1A`, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  dailyBoxLabel: { color: '#fff', opacity: 0.75, fontSize: 12 },
  dailyBoxVal: { color: '#fff', fontSize: 20, fontWeight: '700' },
  dailyBoxUnit: { fontSize: 14, fontWeight: '400'}
});