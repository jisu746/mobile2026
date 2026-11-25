import { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './font';
import { C } from './ui';
import { MIN_WAGE, won, ymd } from './work';
import { LegacyRecord, StaffWage, wageRepository, parseHourlyWage } from './wageRepository';

export default function OwnerWage({
  storeId,
  employee,
  onBack,
}: {
  storeId: number;
  employee: { id: string; name: string };
  onBack: () => void;
}) {
  const today = ymd(new Date());
  const [saved, setSaved] = useState<StaffWage | null>(null);
  const [input, setInput] = useState('');
  const [effective, setEffective] = useState(today);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [records, setRecords] = useState<LegacyRecord[] | null>(null);
  const [recordError, setRecordError] = useState('');
  const [recordVersion, setRecordVersion] = useState(0);
  const [legacyRates, setLegacyRates] = useState<Record<number, string>>({});
  const [confirmation, setConfirmation] = useState<{ record: LegacyRecord; amount: number } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSaved(null);
    wageRepository
      .get(storeId, employee.id)
      .then(
        (item) => {
          if (active) {
            setSaved(item);
            setInput(String(item.hourlyWage ?? MIN_WAGE));
          }
        },
        (e: unknown) => {
          if (active) setError(e instanceof Error ? e.message : '시급 조회 실패');
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId, employee.id, retry]);
  useEffect(() => {
    let active = true;
    setRecords(null);
    setRecordError('');
    wageRepository.records(storeId, employee.id, month).then(
      (items) => {
        if (active) setRecords(items);
      },
      (e: unknown) => {
        if (active) setRecordError(e instanceof Error ? e.message : '근무 조회 실패');
      },
    );
    return () => {
      active = false;
    };
  }, [storeId, employee.id, month, recordVersion]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!working.current) onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
  const save = async () => {
    if (working.current || !saved) return;
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await wageRepository.save(storeId, employee.id, input, effective);
      setSaved(result);
      setNotice(`${effective}부터 적용하도록 저장했어요. 이미 시작한 근무의 시급은 유지돼요.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '시급 저장 실패');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!confirmation || working.current) return;
    working.current = true;
    setBusy(true);
    setRecordError('');
    try {
      const item = await wageRepository.confirm(
        storeId,
        employee.id,
        confirmation.record.sessionId,
        String(confirmation.amount),
      );
      setRecords((items) => items?.map((r) => (r.sessionId === item.sessionId ? item : r)) ?? null);
      setConfirmation(null);
    } catch (e) {
      setRecordError(e instanceof Error ? e.message : '확정 실패');
      setConfirmation(null);
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const moveMonth = (delta: number) => {
    const parts = month.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable disabled={busy} onPress={onBack} hitSlop={12} accessibilityLabel="직원 관리로 돌아가기">
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>직원 시급 설정</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.name}>{employee.name}</Text>
        {loading && <Text style={s.help}>불러오는 중이에요.</Text>}
        {!loading && !saved && (
          <Pressable onPress={() => setRetry((v) => v + 1)}>
            <Text style={s.error}>
              {error}
              {'\n'}눌러서 다시 불러오기
            </Text>
          </Pressable>
        )}
        {!!saved && (
          <>
            <View style={s.current}>
              <Text style={s.currentLabel}>오늘 적용 시급{saved.hourlyWage == null ? ' (기본값)' : ''}</Text>
              <Text style={s.currentAmount}>{won(saved.hourlyWage ?? MIN_WAGE)}원</Text>
            </View>
            <Text style={s.label}>변경할 시급 (원)</Text>
            <TextInput
              accessibilityLabel="변경할 시급"
              editable={!busy}
              style={s.input}
              value={input}
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(v) => {
                setInput(v.replace(/\D/g, ''));
                setNotice('');
              }}
            />
            <Text style={s.label}>적용 시작일</Text>
            <TextInput
              accessibilityLabel="시급 적용 시작일"
              editable={!busy}
              style={s.input}
              value={effective}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              onChangeText={(v) => {
                setEffective(v);
                setNotice('');
              }}
            />
            <Text style={s.help}>
              오늘 이후 날짜를 입력해 주세요. 해당 날짜에 시작하는 새 근무부터 적용돼요. 같은 날짜를 다시 저장하면 그
              날짜의 설정을 수정해요.
            </Text>
            <Text style={s.help}>
              출근 시 적용 시급을 근무 기록에 보관해요. 이미 출근한 근무와 과거 근무의 시급은 바뀌지 않아요.
            </Text>
            {!!error && <Text style={s.error}>{error}</Text>}
            {!!notice && (
              <Text accessibilityLiveRegion="polite" style={s.success}>
                {notice}
              </Text>
            )}
            <Pressable disabled={busy} style={[s.button, busy && s.disabled]} onPress={() => void save()}>
              <Text style={s.buttonText}>{busy ? '저장 중…' : '적용일과 시급 저장'}</Text>
            </Pressable>
            <Text style={s.label}>시급 적용 이력</Text>
            {saved.history.map((rate) => (
              <View key={rate.effectiveFrom} style={s.row}>
                <Text style={s.text}>
                  {rate.effectiveFrom}부터{rate.effectiveFrom > today ? ' (예정)' : ''}
                </Text>
                <Text style={s.text}>
                  {won(rate.hourlyWage)}원{rate.defaultRate ? ' (기본값)' : ''}
                </Text>
              </View>
            ))}
            {!saved.history.length && (
              <Text style={s.help}>아직 적용일을 지정한 시급 이력이 없어요. 새 근무에는 오늘의 설정값을 보관해요.</Text>
            )}
          </>
        )}
        <Text style={s.label}>기존 근무 시급 확인</Text>
        <Text style={s.help}>
          이 기능 추가 전에 저장한 근무에는 당시 시급이 없어요. 실제 적용했던 시급을 확인해 건별로 입력해 주세요. 확정
          후에는 이 화면에서 바꿀 수 없어요.
        </Text>
        <View style={s.row}>
          <Pressable disabled={busy} onPress={() => moveMonth(-1)} accessibilityLabel="이전 달">
            <Ionicons name="chevron-back" size={24} color={C.primary} />
          </Pressable>
          <Text style={s.title}>{month}</Text>
          <Pressable disabled={busy} onPress={() => moveMonth(1)} accessibilityLabel="다음 달">
            <Ionicons name="chevron-forward" size={24} color={C.primary} />
          </Pressable>
        </View>
        {!!recordError && (
          <Pressable onPress={() => setRecordVersion((v) => v + 1)}>
            <Text style={s.error}>
              {recordError}
              {'\n'}눌러서 다시 불러오기
            </Text>
          </Pressable>
        )}
        {records === null && !recordError && <Text style={s.help}>근무 기록 조회 중…</Text>}
        {records
          ?.filter((r) => r.hourlyWage == null)
          .map((record) => (
            <View key={record.sessionId} style={s.legacy}>
              <Text style={s.text}>
                {record.clockIn.slice(0, 10)} {record.clockIn.slice(11, 19)} 출근
              </Text>
              <Text style={s.help}>퇴근: {record.clockOut ? record.clockOut.replace('T', ' ') : '근무 중'}</Text>
              <TextInput
                accessibilityLabel={`${record.clockIn} 기존 적용 시급`}
                editable={!busy}
                style={s.input}
                placeholder="당시 실제 시급 입력"
                keyboardType="number-pad"
                maxLength={6}
                value={legacyRates[record.sessionId] ?? ''}
                onChangeText={(v) =>
                  setLegacyRates((values) => ({ ...values, [record.sessionId]: v.replace(/\D/g, '') }))
                }
              />
              <Pressable
                disabled={busy}
                style={s.button}
                onPress={() => {
                  try {
                    setConfirmation({ record, amount: parseHourlyWage(legacyRates[record.sessionId] ?? '') });
                  } catch (e) {
                    setRecordError(e instanceof Error ? e.message : '입력 확인');
                  }
                }}
              >
                <Text style={s.buttonText}>이 근무의 시급 확정</Text>
              </Pressable>
            </View>
          ))}
        {records !== null && !records.some((r) => r.hourlyWage == null) && (
          <Text style={s.help}>이 달에 시급 확인이 필요한 기록이 없어요.</Text>
        )}
        {records
          ?.filter((r) => r.hourlyWage != null)
          .map((r) => (
            <View key={r.sessionId} style={s.row}>
              <Text style={s.text}>
                {r.clockIn.slice(5, 10)} {r.clockIn.slice(11, 16)}
              </Text>
              <Text style={s.text}>{won(r.hourlyWage!)}원 보존</Text>
            </View>
          ))}
      </ScrollView>
      <Modal
        visible={!!confirmation}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmation(null);
        }}
      >
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.title}>기존 근무 시급을 확정할까요?</Text>
            <Text style={s.help}>
              {confirmation?.record.clockIn.replace('T', ' ')}에 시작한 근무에 {won(confirmation?.amount ?? 0)}원을
              적용해요. 실제 당시 시급인지 확인해 주세요. 저장 후 변경할 수 없어요.
            </Text>
            <View style={s.row}>
              <Pressable disabled={busy} onPress={() => setConfirmation(null)}>
                <Text style={s.text}>취소</Text>
              </Pressable>
              <Pressable disabled={busy} style={s.button} onPress={() => void confirm()}>
                <Text style={s.buttonText}>{busy ? '저장 중…' : '확인 후 확정'}</Text>
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
  header: { height: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { padding: 20, paddingBottom: 36 },
  name: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 16 },
  current: { borderRadius: 18, padding: 20, backgroundColor: C.primary },
  currentLabel: { fontSize: 13, color: '#fff' },
  currentAmount: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 8 },
  label: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 24, marginBottom: 10 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFCCDB',
    paddingHorizontal: 14,
    fontSize: 17,
    color: C.text,
  },
  help: { fontSize: 12, lineHeight: 20, color: '#6D687C', marginTop: 10 },
  error: { fontSize: 13, lineHeight: 20, color: '#B3261E', marginTop: 14 },
  success: { fontSize: 13, lineHeight: 20, color: '#247244', marginTop: 14 },
  button: {
    minHeight: 44,
    borderRadius: 24,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 18,
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  disabled: { opacity: 0.5 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#EAE7F2',
  },
  text: { fontSize: 13, color: C.text },
  legacy: { borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 14, padding: 14, marginTop: 12, gap: 8 },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(20,18,35,.4)',
  },
  dialog: { width: '100%', maxWidth: 360, padding: 20, borderRadius: 18, backgroundColor: '#fff' },
});
