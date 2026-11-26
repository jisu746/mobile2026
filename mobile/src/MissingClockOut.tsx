import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { C } from './ui';
import type { PayrollRecord } from './livePayrollRepository';
import { closeMissingClockOut, validateClockOut } from './workCorrection';
import { api, errorText } from './api';

export default function MissingClockOut({
  storeId,
  memberId,
  name,
  record,
  onCancel,
  onSaved,
}: {
  storeId: number;
  memberId: number;
  name: string;
  record: PayrollRecord;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(''),
    [time, setTime] = useState(''),
    [reason, setReason] = useState('');
  const [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const review = () => {
    try {
      validateClockOut({ ...record, clockOut: null }, date, time, reason);
      setError('');
      setConfirm(true);
    } catch (e) {
      setError(errorText(e, '입력값을 확인해 주세요.'));
    }
  };
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (record.clockOut) {
        const payload = validateClockOut({ ...record, clockOut: null }, date, time, reason);
        const d = record.clockOut;
        const expectedClockOut = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        await api(
          'POST',
          `/api/stores/${storeId}/staff/${memberId}/work-records/${record.sessionId}/time-corrections`,
          { ...payload, expectedClockOut },
        );
      } else await closeMissingClockOut(storeId, memberId, record, date, time, reason);
      onSaved();
    } catch (e) {
      setConfirm(false);
      setError(errorText(e, '퇴근 처리를 저장하지 못했어요.'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
            <Text style={s.title}>{record.clockOut ? '퇴근 시각 정정' : '퇴근 누락 처리'}</Text>
            <Text style={s.name}>{name}</Text>
            <Text style={s.hint}>출근: {record.clockIn.toLocaleString('ko-KR', { hour12: false })}</Text>
            {confirm ? (
              <>
                <Text style={s.label}>입력한 퇴근 시각</Text>
                <Text style={s.name}>
                  {date} {time}
                </Text>
                <Text style={s.label}>처리 사유</Text>
                <Text style={s.hint}>{reason.trim()}</Text>
                <Text style={s.hint}>
                  이 시각으로 근무시간을 마감해요. 처리자·처리 시각·사유가 기록돼요. 이미 마감한 시각의 정정은 변경 전후
                  이력도 보관해요. 저장된 시급은 유지돼요.
                </Text>
              </>
            ) : (
              <>
                <Text style={s.hint}>
                  직원과 실제 퇴근 시각을 확인한 뒤 입력해 주세요. 시급이 미확정인 기록은 퇴근 처리 후에도 금액 합산에서
                  제외돼요.
                </Text>
                <Text style={s.label}>실제 퇴근 날짜</Text>
                <TextInput
                  style={s.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
                <Text style={s.label}>실제 퇴근 시각 (24시간)</Text>
                <TextInput
                  style={s.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:mm:ss (예: 18:00:00)"
                  maxLength={8}
                />
                <Text style={s.label}>처리 사유</Text>
                <TextInput
                  style={[s.input, { minHeight: 80 }]}
                  multiline
                  value={reason}
                  onChangeText={setReason}
                  maxLength={300}
                  placeholder="직원과 확인한 내용 입력"
                />
              </>
            )}
            {!!error && <Text style={s.error}>{error}</Text>}
            <Pressable
              disabled={busy}
              style={[s.button, busy && { opacity: 0.5 }]}
              onPress={confirm ? () => void save() : review}
            >
              <Text style={s.buttonText}>
                {busy ? '저장 중…' : confirm ? '확인한 시각으로 퇴근 처리' : '입력 내용 확인'}
              </Text>
            </Pressable>
            <Pressable disabled={busy} style={s.cancel} onPress={() => (confirm ? setConfirm(false) : onCancel())}>
              <Text style={s.cancelText}>{confirm ? '다시 입력' : '취소'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: C.text },
  name: { fontSize: 16, fontWeight: '700', marginTop: 12, color: C.text },
  hint: { fontSize: 12, lineHeight: 21, color: '#686373', marginTop: 10 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, color: C.text },
  input: {
    borderWidth: 1,
    borderColor: '#D8D3E8',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    fontSize: 14,
    color: C.text,
  },
  button: { backgroundColor: C.primary, borderRadius: 12, padding: 14, marginTop: 18 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  cancel: { padding: 12, marginTop: 5 },
  cancelText: { color: C.primary, textAlign: 'center', fontSize: 14 },
  error: { color: '#B3261E', fontSize: 12, lineHeight: 20, marginTop: 10 },
});
