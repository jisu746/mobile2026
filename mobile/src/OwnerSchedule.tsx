import { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './font';
import { C } from './ui';
import { scheduleRepository, StaffShift } from './scheduleRepository';
import { errorText } from './api';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

export default function OwnerSchedule({
  storeId,
  employee,
  onBack,
}: {
  storeId: number;
  employee: { id: string; name: string };
  onBack: () => void;
}) {
  const [date, setDate] = useState(localToday);
  const month = date.slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selected = shifts.find((shift) => shift.date === date);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoaded(false);
    setError('');
    setShifts([]);
    scheduleRepository
      .list(storeId, employee.id, month)
      .then(
        (items) => {
          if (active) {
            setShifts(items);
            setLoaded(true);
          }
        },
        (e: unknown) => {
          if (active) setError(errorText(e, '일정을 불러오지 못했어요.'));
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId, employee.id, month, retry]);

  useEffect(() => {
    setStart(selected?.start ?? '09:00');
    setEnd(selected?.end ?? '18:00');
  }, [date, selected?.start, selected?.end]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!working.current) onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const choose = (value: string) => {
    if (working.current) return;
    setDate(value);
    setNotice('');
    setError('');
  };
  const changeMonth = (offset: number) => {
    const d = new Date(year, monthNumber - 1 + offset, 1);
    choose(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`);
  };
  const mutate = async (remove: boolean) => {
    if (working.current || !loaded) return;
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const items = remove
        ? await scheduleRepository.remove(storeId, employee.id, date)
        : await scheduleRepository.save(storeId, employee.id, { date, start, end });
      setShifts(items);
      setNotice(
        remove ? '선택한 날짜의 일정을 삭제했어요.' : '일정을 저장했어요. 직원이 다시 로그인하면 확인할 수 있어요.',
      );
    } catch (e) {
      setError(errorText(e, '일정을 저장하지 못했어요.'));
    } finally {
      setConfirmDelete(false);
      working.current = false;
      setBusy(false);
    }
  };
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const days = new Date(year, monthNumber, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + days) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= days ? day : null;
  });
  const scheduledDates = new Set(shifts.map((shift) => shift.date));
  const overnight = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && end < start;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable accessibilityLabel="직원 관리로 돌아가기" disabled={busy} onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>근무 일정 관리</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.employee}>{employee.name}</Text>
        <Text style={s.help}>날짜를 선택하고 근무 시간을 입력해 주세요.</Text>
        <View style={s.monthRow}>
          <Pressable
            accessibilityLabel="이전 달"
            disabled={busy || (year <= 1900 && monthNumber === 1)}
            onPress={() => changeMonth(-1)}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={C.primary} />
          </Pressable>
          <Text style={s.month}>
            {year}년 {monthNumber}월
          </Text>
          <Pressable
            accessibilityLabel="다음 달"
            disabled={busy || (year >= 9999 && monthNumber === 12)}
            onPress={() => changeMonth(1)}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={C.primary} />
          </Pressable>
        </View>
        <View style={s.calendar}>
          {weekdays.map((day) => (
            <View key={day} style={s.day}>
              <Text style={s.weekday}>{day}</Text>
            </View>
          ))}
          {cells.map((day, i) => {
            const value = `${month}-${pad(day ?? 1)}`;
            const chosen = value === date && day !== null;
            return (
              <Pressable
                key={i}
                accessibilityLabel={day ? `${value}${scheduledDates.has(value) ? ' 근무 있음' : ''}` : undefined}
                accessibilityState={{ selected: chosen }}
                disabled={!day || busy || loading || !loaded}
                onPress={() => choose(value)}
                style={[s.day, chosen && s.chosen]}
              >
                <Text style={[s.dayText, chosen && s.white]}>{day ?? ''}</Text>
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: day && scheduledDates.has(value) ? (chosen ? '#fff' : C.primary) : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
        {loading && <Text style={s.help}>일정을 불러오는 중이에요.</Text>}
        {!loaded && !loading && (
          <Pressable onPress={() => setRetry((n) => n + 1)}>
            <Text style={s.error}>
              {error}
              {'\n'}눌러서 다시 불러오기
            </Text>
          </Pressable>
        )}
        {loaded && (
          <>
            <Text style={s.section}>
              {date} {selected ? '일정 수정' : '일정 등록'}
            </Text>
            <View style={s.timeRow}>
              <View style={s.timeField}>
                <Text style={s.label}>시작 시간</Text>
                <TextInput
                  accessibilityLabel="시작 시간"
                  editable={!busy}
                  style={s.input}
                  value={start}
                  placeholder="09:00"
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={(v) => {
                    setStart(timeInput(v));
                    setNotice('');
                  }}
                />
              </View>
              <View style={s.timeField}>
                <Text style={s.label}>종료 시간</Text>
                <TextInput
                  accessibilityLabel="종료 시간"
                  editable={!busy}
                  style={s.input}
                  value={end}
                  placeholder="18:00"
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={(v) => {
                    setEnd(timeInput(v));
                    setNotice('');
                  }}
                />
              </View>
            </View>
            {overnight && <Text style={s.help}>종료 시간은 다음 날로 저장됩니다.</Text>}
            {!!error && (
              <Text accessibilityLiveRegion="polite" style={s.error}>
                {error}
              </Text>
            )}
            {!!notice && (
              <Text accessibilityLiveRegion="polite" style={s.success}>
                {notice}
              </Text>
            )}
            <Pressable disabled={busy} style={[s.save, busy && s.disabled]} onPress={() => void mutate(false)}>
              <Text style={s.saveText}>{busy ? '처리 중…' : selected ? '일정 수정 저장' : '일정 저장'}</Text>
            </Pressable>
            {!!selected && (
              <Pressable disabled={busy} style={s.delete} onPress={() => setConfirmDelete(true)}>
                <Text style={s.error}>이 날짜의 일정 삭제</Text>
              </Pressable>
            )}
            <Text style={s.section}>이번 달 근무 일정 · {shifts.length}일</Text>
            {[...shifts]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((shift) => (
                <Pressable key={shift.date} disabled={busy} onPress={() => choose(shift.date)} style={s.listRow}>
                  <Text style={s.dayText}>{shift.date.slice(5)}</Text>
                  <Text style={s.dayText}>
                    {shift.start} - {shift.end}
                    {shift.end < shift.start ? ' (다음 날)' : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={15} color={C.primary} />
                </Pressable>
              ))}
            {!shifts.length && <Text style={s.help}>등록된 일정이 없어요.</Text>}
          </>
        )}
      </ScrollView>
      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmDelete(false);
        }}
      >
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.section}>근무 일정을 삭제할까요?</Text>
            <Text style={s.help}>
              {employee.name} 님의 {date} 일정만 삭제합니다.
            </Text>
            <View style={s.timeRow}>
              <Pressable disabled={busy} style={s.cancel} onPress={() => setConfirmDelete(false)}>
                <Text style={s.dayText}>취소</Text>
              </Pressable>
              <Pressable disabled={busy} style={[s.save, { flex: 1 }]} onPress={() => void mutate(true)}>
                <Text style={s.saveText}>{busy ? '처리 중…' : '삭제'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { padding: 20, paddingTop: 12, paddingBottom: 32 },
  employee: { fontSize: 21, fontWeight: '700', color: C.text },
  help: { fontSize: 12, lineHeight: 19, color: '#6D687C', marginVertical: 8 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  month: { fontSize: 17, fontWeight: '700', color: C.text },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.2857%', height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  weekday: { fontSize: 11, color: '#767082' },
  dayText: { fontSize: 13, color: C.text },
  chosen: { backgroundColor: C.primary },
  white: { color: '#fff', fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  section: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 20, marginBottom: 12 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  label: { fontSize: 12, color: '#6D687C', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CFCCDB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: C.text,
  },
  save: {
    minHeight: 46,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  disabled: { opacity: 0.5 },
  delete: { alignItems: 'center', padding: 12 },
  error: { fontSize: 12, lineHeight: 19, color: '#B3261E', marginTop: 8 },
  success: { fontSize: 12, lineHeight: 19, color: '#247244', marginTop: 10 },
  listRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#EAE7F2',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(20,18,35,0.4)',
  },
  dialog: { width: '100%', maxWidth: 360, backgroundColor: '#fff', padding: 20, borderRadius: 20 },
  cancel: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CFCCDB',
    marginTop: 14,
  },
});
