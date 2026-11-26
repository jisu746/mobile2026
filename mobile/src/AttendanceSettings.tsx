import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Text, TextInput } from './font';
import { api, errorText } from './api';
import { C } from './ui';
type Policy = { alertAfterHours: number; graceMinutes: number; autoCloseScheduled: boolean; revision: number };
export default function AttendanceSettings({ storeId }: { storeId: number }) {
  const [open, setOpen] = useState(false),
    [policy, setPolicy] = useState<Policy | null>(null),
    [hours, setHours] = useState('16'),
    [grace, setGrace] = useState('60'),
    [auto, setAuto] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const path = `/api/stores/${storeId}/attendance-policy`;
  useEffect(() => {
    if (!open) return;
    let active = true;
    api<Policy>('GET', path).then(
      (p) => {
        if (active) {
          setPolicy(p);
          setHours(String(p.alertAfterHours));
          setGrace(String(p.graceMinutes));
          setAuto(p.autoCloseScheduled);
        }
      },
      (e) => {
        if (active) setError(e.message);
      },
    );
    return () => {
      active = false;
    };
  }, [open, path]);
  const input = {
    height: 44,
    borderWidth: 1,
    borderColor: '#D8D3E8',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    color: C.text,
    fontFamily: 'sans-serif',
  };
  return (
    <View style={{ marginVertical: 12 }}>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={{ color: C.primary, fontSize: 14 }}>퇴근 누락 감지·자동 마감 설정 {open ? '접기' : '열기'}</Text>
      </Pressable>
      {open && (
        <View style={{ padding: 14, borderWidth: 1, borderColor: '#D8D3E8', borderRadius: 14, marginTop: 10 }}>
          <Text>일정이 없으면 출근 후 몇 시간부터 알릴까요? (4~48)</Text>
          <TextInput style={input} keyboardType="number-pad" value={hours} onChangeText={setHours} />
          <Text>예정 종료 후 유예 시간 (분)</Text>
          <TextInput style={input} keyboardType="number-pad" value={grace} onChangeText={setGrace} />
          <Text>예정 종료 시각으로 자동 퇴근 처리</Text>
          <Switch value={auto} onValueChange={setAuto} />
          <Text style={{ fontSize: 12, lineHeight: 20, color: '#686373' }}>
            기본은 알림만 보내요. 자동 처리를 켜면 등록된 일정이 있는 근무를 예정 종료 시각으로 마감해요. 일정이 없는
            근무는 자동 마감하지 않아요. 직원에게 운영 기준을 안내하고 실제 근무시간과 다르면 정정해주세요.
          </Text>
          <Pressable
            disabled={busy || !policy}
            onPress={async () => {
              if (!policy || busy) return;
              if (!/^\d+$/.test(hours) || !/^\d+$/.test(grace)) {
                setError('숫자로 입력해주세요.');
                return;
              }
              setBusy(true);
              try {
                const p = await api<Policy>('PUT', path, {
                  ...policy,
                  alertAfterHours: Number(hours),
                  graceMinutes: Number(grace),
                  autoCloseScheduled: auto,
                });
                setPolicy(p);
                setError('저장했어요.');
              } catch (e) {
                setError(errorText(e, '저장 실패'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ color: C.primary, paddingVertical: 12 }}>{busy ? '저장 중…' : '설정 저장'}</Text>
          </Pressable>
          <Text>{error}</Text>
        </View>
      )}
    </View>
  );
}
