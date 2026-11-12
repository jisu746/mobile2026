import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

const WAGE = 10030; // TODO: 시급은 직원 정보에서 가져온다
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const won = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// TODO: 근무 기록은 샘플 규칙(월~수 6시간, 토 5시간, 오늘 이후는 기록 없음). 출퇴근 기록 API 연동 후 서버 값으로 교체
function hoursOf(d: Date, today: Date) {
  if (d >= today) return 0;
  const dow = d.getDay();
  return dow >= 1 && dow <= 3 ? 6 : dow === 6 ? 5 : 0;
}

// 직원 근무 기록 (MY → 근무 기록)
export default function WorkRecords({ onBack }: { onBack: () => void }) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

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
  let total = 0, workDays = 0;
  const weekly: Record<string, number> = {};
  for (let d = new Date(y, m, 1); d.getMonth() === m; d.setDate(d.getDate() + 1)) {
    const h = hoursOf(d, today);
    if (!h) continue;
    total += h;
    workDays += 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    weekly[key(monday)] = (weekly[key(monday)] ?? 0) + h;
  }
  // 주휴 수당(예상): 주 15시간 이상 근무한 주마다 (주 근무시간 ÷ 40 × 8시간) × 시급
  const holiday = Object.values(weekly).reduce((a, h) => a + (h >= 15 ? (Math.min(h, 40) / 40) * 8 * WAGE : 0), 0);
  const isThisMonth = y === today.getFullYear() && m === today.getMonth();

  const selHours = hoursOf(selected, today);
  const selIsToday = key(selected) === key(today);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>근무 기록</Text>
       
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.monthRow}>
          <Text style={s.month}>{y}년 {m + 1}월</Text>
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
              <Text style={s.heroLabel}>{isThisMonth ? '이번 달' : `${m + 1}월`} 예상 급여</Text>
              <Text style={s.heroPay}>{won(total * WAGE)}<Text style={s.heroWon}>원</Text></Text>
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>시급 {won(WAGE)}원 기준</Text>
            </View>
          </View>
          <View style={s.metrics}>
            <Metric label="총 근무시간" value={String(total)} unit="시간" />
            <Metric label="근무 일수" value={String(workDays)} unit="일" />
            <Metric label="주휴 수당(예상)" value={(holiday / 10000).toFixed(1)} unit="만" />
          </View>
        </View>

        <View style={s.calendar}>
          <View style={s.weekRow}>
            {DAYS.map((d, i) => (
              <Text key={d} style={[s.weekday, i === 0 && { color: '#B3261E' }, i === 6 && { color: C.primary }]}>{d}</Text>
            ))}
          </View>
          {Array.from({ length: 6 }, (_, w) => (
            <View key={w} style={s.weekRow}>
              {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
                const inMonth = d.getMonth() === m;
                const h = inMonth ? hoursOf(d, today) : 0;
                const isToday = key(d) === key(today);
                const isSel = key(d) === key(selected);
                return (
                  <Pressable key={i} disabled={!inMonth} style={[s.cell, !inMonth && { opacity: 0.25 }, isSel && s.cellSel]} onPress={() => setSelected(d)}>
                    <Text style={[s.dayNum, i === 0 && { color: '#B3261E' }, i === 6 && { color: C.primary }, isToday && s.dayToday]}>{d.getDate()}</Text>
                    {inMonth && isToday && (
                      <View style={[s.badge, { backgroundColor: C.primary }]}>
                        <Text style={[s.badgeText, { color: '#fff' }]}>Today</Text>
                      </View>
                    )}
                    {h > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{h}h</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {selected.getMonth() === m && selIsToday && (
          <View style={s.notice}>
            <Text style={s.noticeText}>아직 데이터가 로드되지 않았어요.</Text>
          </View>
        )}

        {selected.getMonth() === m && !selIsToday && selHours === 0 && (
          <View style={s.notice}>
            <Text style={s.noticeText}>이 날은 근무 기록이 없어요.</Text>
          </View>
        )}

        {selected.getMonth() === m && !selIsToday && selHours > 0 && (
          <>
            <Text style={s.detailTitle}>{selected.getMonth() + 1}월 {selected.getDate()}일 ({DAYS[selected.getDay()]}) 근무 상세</Text>
            <View style={s.detail}>
              <View style={s.heroTop}>
                <Text style={s.detailPay}>{won(selHours * WAGE)}<Text style={s.detailWon}> 원</Text></Text>
                <View style={s.pill}>
                  <Text style={s.pillText}>시급 {won(WAGE)}원</Text>
                </View>
              </View>
              <View style={s.detailBox}>
                <Text style={s.metricLabel}>근무시간</Text>
                <Text style={s.metricValue}>{selHours}<Text style={s.metricUnit}>시간</Text></Text>
              </View>
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
      <Text style={s.metricLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.metricValue}>{value}<Text style={s.metricUnit}>{unit}</Text></Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 56 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 20, paddingBottom: 30 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 14 },
  month: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  navs: { flexDirection: 'row', gap: 4 },
  nav: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#CFCCDB', alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: C.primary, borderRadius: 20, padding: 20, shadowColor: C.primary, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  heroPay: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginTop: 4 },
  heroWon: { fontSize: 18, fontWeight: '600' },
  pill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11.5, fontWeight: '600', color: '#fff' },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  metric: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 8 },
  metricLabel: { fontSize: 10.5, letterSpacing: -0.4, color: 'rgba(255,255,255,0.75)' },
  metricValue: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  metricUnit: { fontSize: 12, fontWeight: '500' },
  calendar: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 12, marginTop: 14, gap: 6 },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: '600', color: '#5E5C6B', marginBottom: 4 },
  cell: { flex: 1, height: 52, alignItems: 'center', paddingTop: 4, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  cellSel: { borderColor: C.primary, backgroundColor: '#F5F4FB' },
  dayNum: { fontSize: 13.5, fontWeight: '500', color: C.text },
  dayToday: { fontWeight: '700', color: C.primary },
  badge: { marginTop: 3, backgroundColor: '#ECEAF7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', color: C.primary },
  notice: { backgroundColor: C.primary, borderRadius: 20, padding: 20, marginTop: 16 },
  noticeText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  detailTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 22, marginBottom: 10 },
  detail: { backgroundColor: C.primary, borderRadius: 20, padding: 20 },
  detailPay: { fontSize: 24, fontWeight: '800', color: '#fff' },
  detailWon: { fontSize: 15, fontWeight: '600' },
  detailBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 16 },
});
