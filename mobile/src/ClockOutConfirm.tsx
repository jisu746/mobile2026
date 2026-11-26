import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Text } from './font';
import { C } from './ui';
import { listSessions, Session } from './work';
import { sessionHours } from './payCalculation';
import { errorText } from './api';
export default function ClockOutConfirm({
  storeId,
  clockedAt,
  pending,
  onCancel,
  onConfirm,
}: {
  storeId: number;
  clockedAt: Date;
  pending: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [record, setRecord] = useState<Session | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    listSessions(storeId, clockedAt.getFullYear(), clockedAt.getMonth() + 1).then(
      (list) => setRecord(list.find((w) => !w.clockOut) ?? null),
      (e) => setError(e.message),
    );
  }, [storeId, clockedAt]);
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.4)', padding: 24 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 22, gap: 14 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>퇴근 기록 확인</Text>
          <Text style={{ fontSize: 14, lineHeight: 24 }}>
            출근 {clockedAt.toLocaleString('ko-KR')}
            {'\n'}기록된 휴게 {Math.floor((record?.breakSeconds ?? 0) / 60)}분{'\n'}조회 시점 실근무{' '}
            {Math.floor(sessionHours(record ?? { clockIn: clockedAt, clockOut: null }) * 60)}분
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 22, color: '#686373' }}>
            미완료 업무 {pending}건이 있어요. 다음 근무자에게 전달할 내용이 있으면 인수인계에 남겨주세요. 실제 퇴근
            시각은 확인 버튼을 누른 시각으로 저장돼요.
          </Text>
          {!!error && <Text style={{ color: '#B3261E' }}>{error}</Text>}
          <Pressable
            disabled={busy || !record}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              try {
                await onConfirm();
              } catch (e) {
                setError(errorText(e, '퇴근 처리 실패'));
                setBusy(false);
              }
            }}
            style={{ backgroundColor: C.primary, padding: 15, borderRadius: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{busy ? '퇴근 처리 중…' : '확인하고 퇴근'}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={onCancel}>
            <Text style={{ textAlign: 'center', padding: 10, color: C.primary }}>돌아가서 인수인계 확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
