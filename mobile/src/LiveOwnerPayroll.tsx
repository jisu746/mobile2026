import WorkBreakEditor from './WorkBreakEditor';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './font';
import { C } from './ui';
import OwnerWage from './OwnerWage';
import AttendanceSettings from './AttendanceSettings';
import PayrollSettlement from './PayrollSettlement';
import MissingClockOut from './MissingClockOut';
import { livePayrollRepository, payrollSummary } from './livePayrollRepository';
import type { PayrollMember, PayrollRecord } from './livePayrollRepository';
import { sessionHours } from './payCalculation';
import { won } from './work';
import { errorText } from './api';

type Entry = { member: PayrollMember; records: PayrollRecord[]; error: string };
const message = (e: unknown) => errorText(e, '정보를 불러오지 못했어요.');
const periodText = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const clock = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate()} ${[date.getHours(), date.getMinutes(), date.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')}`;
function duration(hours: number) {
  const seconds = Math.max(0, Math.round(hours * 3600));
  const h = Math.floor(seconds / 3600),
    m = Math.floor(seconds / 60) % 60,
    s = seconds % 60;
  return h ? `${h}시간 ${m}분` : m ? `${m}분 ${s}초` : `${s}초`;
}
export default function LiveOwnerPayroll({ storeId, onClose }: { storeId: number; onClose: () => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [wage, setWage] = useState(false);
  const [closing, setClosing] = useState<PayrollRecord | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const period = periodText(month);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setEntries([]);
    (async () => {
      try {
        const members = await livePayrollRepository.members(storeId);
        const result: Entry[] = [];
        // Limit concurrent calls for larger stores; an individual failure stays visible.
        for (let i = 0; i < members.length; i += 5) {
          result.push(
            ...(await Promise.all(
              members.slice(i, i + 5).map(async (member) => {
                try {
                  return {
                    member,
                    records: await livePayrollRepository.records(storeId, member.memberId, period),
                    error: '',
                  };
                } catch (e) {
                  return { member, records: [], error: message(e) };
                }
              }),
            )),
          );
        }
        if (active) setEntries(result);
      } catch (e) {
        if (active) setError(message(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [storeId, period, version]);
  useEffect(() => {
    setSelected(null);
    setWage(false);
  }, [storeId]);
  const back = () => {
    if (selected !== null) setSelected(null);
    else onClose();
  };
  useEffect(() => {
    if (wage || closing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [selected, wage, closing, onClose]);
  const current = entries.find((entry) => entry.member.memberId === selected);
  const now = new Date();
  const filtered = entries.filter((entry) =>
    entry.member.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  if (wage && current)
    return (
      <OwnerWage
        storeId={storeId}
        employee={{ id: String(current.member.memberId), name: current.member.name }}
        onBack={() => {
          setWage(false);
          setVersion((v) => v + 1);
        }}
      />
    );
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityLabel="뒤로">
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>직원 급여 관리</Text>
        <Pressable onPress={() => setVersion((v) => v + 1)} hitSlop={10} accessibilityLabel="새로고침">
          <Ionicons name="refresh" size={21} color={C.primary} />
        </Pressable>
        {selected === null && (
          <Pressable onPress={() => setSearch((v) => !v)} hitSlop={10} accessibilityLabel="직원 검색">
            <Ionicons name="search" size={22} color={C.text} />
          </Pressable>
        )}
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.monthRow}>
          <Text style={s.month}>
            {month.getFullYear()}년 {month.getMonth() + 1}월
          </Text>
          <View style={s.row}>
            <Pressable
              style={s.nav}
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              accessibilityLabel="이전 달"
            >
              <Ionicons name="chevron-back" size={20} color={C.primary} />
            </Pressable>
            <Pressable
              style={s.nav}
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              accessibilityLabel="다음 달"
            >
              <Ionicons name="chevron-forward" size={20} color={C.primary} />
            </Pressable>
          </View>
        </View>
        <AttendanceSettings storeId={storeId} />
        <Text style={s.hint}>출근일 기준 월별 기본급 예상이에요. 주휴·가산 수당과 공제는 별도 확인이 필요해요.</Text>
        {selected === null && search && (
          <TextInput style={s.input} value={query} onChangeText={setQuery} placeholder="직원 이름 검색" />
        )}
        {loading ? (
          <Text style={s.empty}>근무 기록을 불러오는 중이에요.</Text>
        ) : error ? (
          <View style={s.card}>
            <Text style={s.error}>{error}</Text>
            <Pressable onPress={() => setVersion((v) => v + 1)}>
              <Text style={s.link}>다시 불러오기</Text>
            </Pressable>
          </View>
        ) : selected !== null ? (
          current ? (
            <>
              <View style={s.card}>
                <Text style={s.name}>{current.member.name}</Text>
                <Text style={s.hint}>
                  오늘 설정 시급: {current.member.hourlyWage == null ? '기본값' : `${won(current.member.hourlyWage)}원`}
                </Text>
                <Pressable style={s.button} onPress={() => setWage(true)}>
                  <Text style={s.buttonText}>시급 설정·이력 및 기존 시급 확인</Text>
                </Pressable>
                <Summary entry={current} now={now} />
                <PayrollSettlement storeId={storeId} memberId={current.member.memberId} period={period} />
              </View>
              {!current.error && (
                <>
                  <Text style={s.section}>상세 근무 내역</Text>
                  {!current.records.length && <Text style={s.empty}>이번 달 근무 기록이 없어요.</Text>}
                  {current.records.map((record) => (
                    <View key={record.sessionId} style={s.card}>
                      <Text style={s.name}>{clock(record.clockIn)} 출근</Text>
                      <Text style={s.hint}>
                        {record.clockOut ? `${clock(record.clockOut)} 퇴근` : '근무 중 · 조회 시점까지 계산'}
                      </Text>
                      <Text style={s.line}>
                        실근무 {duration(sessionHours(record, now))} · 휴게{' '}
                        {Math.floor((record.breakSeconds ?? 0) / 60)}분
                      </Text>
                      {record.sessionId != null && (
                        <WorkBreakEditor
                          storeId={storeId}
                          sessionId={record.sessionId}
                          onSaved={() => setVersion((v) => v + 1)}
                        />
                      )}
                      <Text style={s.line}>
                        {record.hourlyWage == null
                          ? '적용 시급 확인 필요'
                          : `보존 시급 ${won(record.hourlyWage)}원${record.wageSource === 'DEFAULT' ? ' (기본값)' : ''}`}
                      </Text>
                      <Text style={record.hourlyWage == null ? s.error : s.amount}>
                        {record.hourlyWage == null
                          ? '금액 합산에서 제외'
                          : `기본급 예상 ${won(sessionHours(record, now) * record.hourlyWage)}원`}
                      </Text>
                      <Pressable style={s.button} onPress={() => setClosing(record)}>
                        <Text style={s.buttonText}>{record.clockOut ? '퇴근 시각 정정' : '퇴근 누락 처리'}</Text>
                      </Pressable>
                      {!!record.correctedAt && (
                        <Text style={s.hint}>
                          관리자 퇴근 처리 · {record.correctedBy ?? '관리자'}
                          {`\n`}
                          {record.correctedAt.replace('T', ' ')}
                          {`\n`}사유: {record.correctionReason}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <Text style={s.empty}>직원 목록에서 다시 선택해 주세요.</Text>
          )
        ) : (
          <>
            {!filtered.length && (
              <Text style={s.empty}>{query.trim() ? '검색 결과가 없어요.' : '현재 소속된 직원이 없어요.'}</Text>
            )}
            {filtered.map((entry) => (
              <Pressable key={entry.member.memberId} style={s.card} onPress={() => setSelected(entry.member.memberId)}>
                <View style={s.monthRow}>
                  <Text style={s.name}>{entry.member.name}</Text>
                  <Ionicons name="chevron-forward" size={19} color={C.primary} />
                </View>
                <Summary entry={entry} now={now} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      {closing && current && (
        <MissingClockOut
          key={closing.sessionId}
          storeId={storeId}
          memberId={current.member.memberId}
          name={current.member.name}
          record={closing}
          onCancel={() => setClosing(null)}
          onSaved={() => {
            setClosing(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </View>
  );
}
function Summary({ entry, now }: { entry: Entry; now: Date }) {
  if (entry.error) return <Text style={s.error}>근무 기록 조회 실패: {entry.error}</Text>;
  const pay = payrollSummary(entry.records, now);
  return (
    <>
      <Text style={s.line}>
        {pay.days}일 · {duration(pay.hours)}
      </Text>
      <View style={s.pay}>
        <Text style={s.hint}>확인된 기록 기본급 예상</Text>
        <Text style={s.amount}>{won(pay.knownPay)}원</Text>
      </View>
      {!!pay.unconfirmed && <Text style={s.error}>시급 미확정 {pay.unconfirmed}건 · 금액에서 제외했어요.</Text>}
      {!!pay.active && <Text style={s.hint}>근무 중 {pay.active}건 포함 · 조회 시점 기준</Text>}
    </>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 14 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text },
  body: { padding: 20, paddingBottom: 36 },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  month: { fontSize: 22, fontWeight: '800', color: C.text },
  row: { flexDirection: 'row', gap: 6 },
  nav: { padding: 7, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 9 },
  hint: { fontSize: 12, lineHeight: 20, color: '#6A657A', marginVertical: 6 },
  line: { fontSize: 13, lineHeight: 22, color: C.text, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#D8D3E8', borderRadius: 12, padding: 12, fontSize: 14, marginVertical: 10 },
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 18, padding: 16, marginTop: 16 },
  name: { fontSize: 17, fontWeight: '700', color: C.text },
  pay: { backgroundColor: '#F4F1FA', borderRadius: 12, padding: 12, marginTop: 10 },
  amount: { fontSize: 21, fontWeight: '800', color: C.primary, marginTop: 6 },
  error: { fontSize: 12, lineHeight: 20, color: '#B3261E', marginTop: 8 },
  link: { fontSize: 14, color: C.primary, marginTop: 12 },
  empty: { fontSize: 14, color: '#777', textAlign: 'center', paddingVertical: 30 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 22, color: C.text },
  button: { backgroundColor: C.primary, borderRadius: 12, padding: 12, marginVertical: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: '700' },
});
