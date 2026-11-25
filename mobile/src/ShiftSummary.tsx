import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from './font';
import { api } from './api';
import { C } from './ui';
import LinkedTasks from './LinkedTasks';
import InventoryTab from './InventoryTab';
import { resolveHandover } from './handover';
type Memo = { id: number; title: string | null; content: string; author: string; revision: number };
type Summary = {
  generatedAt: string;
  tasks: { id: number; title: string; status: string; assignee: string | null }[];
  urgent: Memo[];
  expiry: { barcode: string; name: string; stock: number; expiry: string; days: number }[];
  previous: { author: string | null; workPart: string | null; clockOut: string | null; items: Memo[] };
};
const card = { padding: 15, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 14, marginTop: 10, gap: 8 };
export default function ShiftSummary({
  storeId,
  owner,
  onBack,
}: {
  storeId: number;
  owner: boolean;
  onBack: () => void;
}) {
  const [data, setData] = useState<Summary | null>(null),
    [error, setError] = useState(''),
    [version, setVersion] = useState(0),
    [task, setTask] = useState<number | null>(null),
    [barcode, setBarcode] = useState<string | null>(null),
    [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    api<Summary>('GET', `/api/stores/${storeId}/shift-summary`).then(
      (v) => {
        if (alive) {
          setData(v);
          setError('');
        }
      },
      (e) => {
        if (alive) setError(e.message);
      },
    );
    return () => {
      alive = false;
    };
  }, [storeId, version]);
  if (task !== null)
    return (
      <LinkedTasks
        storeId={storeId}
        owner={owner}
        taskId={task}
        onBack={() => {
          setTask(null);
          setVersion((v) => v + 1);
        }}
      />
    );
  if (barcode !== null)
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <Pressable
          onPress={() => {
            setBarcode(null);
            setVersion((v) => v + 1);
          }}
        >
          <Text style={{ padding: 18, color: C.primary, fontWeight: '700' }}>〈 교대 요약으로 돌아가기</Text>
        </Pressable>
        <InventoryTab
          store={storeId}
          focusBarcode={barcode}
          onProfile={() => setBarcode(null)}
          onBell={() => setBarcode(null)}
        />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}>
        <Pressable onPress={onBack}>
          <Text style={{ color: C.primary, fontSize: 20 }}>〈</Text>
        </Pressable>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '700' }}>교대 요약</Text>
        <Pressable onPress={() => setVersion((v) => v + 1)}>
          <Text style={{ color: C.primary }}>새로고침</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }}>
        {!!error && <Text style={{ color: '#B3261E', lineHeight: 23 }}>{error}</Text>}
        {!data && !error && <Text>교대 정보를 모으고 있어요.</Text>}
        {data && (
          <>
            <Text style={{ fontSize: 12, color: '#686373' }}>조회: {data.generatedAt.replace('T', ' ')}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 22 }}>미완료 업무 {data.tasks.length}개</Text>
            {!data.tasks.length && <Text style={{ marginTop: 10 }}>남은 업무가 없어요.</Text>}
            {data.tasks.map((t) => (
              <Pressable key={t.id} style={card} onPress={() => setTask(t.id)}>
                <Text style={{ fontWeight: '700' }}>{t.title} 〉</Text>
                <Text style={{ fontSize: 13, color: C.primary }}>
                  {t.status === 'SUBMITTED' ? '승인 대기' : '대기'} · 담당 {t.assignee ?? '미지정'}
                </Text>
              </Pressable>
            ))}
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 24 }}>
              내가 확인할 긴급 메모 {data.urgent.length}개
            </Text>
            {!data.urgent.length && <Text style={{ marginTop: 10 }}>확인하지 않은 긴급 메모가 없어요.</Text>}
            {data.urgent.map((m) => (
              <View key={m.id} style={card}>
                <Text style={{ fontWeight: '700' }}>{m.title || '긴급 인수인계'}</Text>
                <Text style={{ lineHeight: 23 }}>{m.content}</Text>
                <Text style={{ fontSize: 12, color: '#686373' }}>작성: {m.author}</Text>
                <Pressable
                  disabled={busy !== null}
                  onPress={async () => {
                    setBusy(m.id);
                    try {
                      await resolveHandover(storeId, m.id, true, m.revision);
                      setVersion((v) => v + 1);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : '확인 실패');
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  <Text style={{ color: C.primary, fontWeight: '700', paddingVertical: 8 }}>
                    {busy === m.id ? '저장 중…' : '내용 확인 완료'}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 24 }}>유통기한 확인 {data.expiry.length}개</Text>
            {!data.expiry.length && <Text style={{ marginTop: 10 }}>확인할 유통기한 상품이 없어요.</Text>}
            {data.expiry.map((p) => (
              <Pressable key={p.barcode} style={card} onPress={() => setBarcode(p.barcode)}>
                <Text style={{ fontWeight: '700' }}>{p.name} 〉</Text>
                <Text style={{ color: p.days < 0 ? '#B3261E' : C.primary }}>
                  {p.days < 0 ? '기한 지남' : p.days === 0 ? '오늘 만료' : `D-${p.days}`} · {p.expiry} · {p.stock}개
                </Text>
              </Pressable>
            ))}
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 24 }}>직전 근무자의 전달 사항</Text>
            {data.previous.author ? (
              <>
                <Text style={{ marginTop: 10, fontSize: 13, color: '#686373' }}>
                  {data.previous.author} · {data.previous.workPart || '파트 미기록'} ·{' '}
                  {data.previous.clockOut?.replace('T', ' ')} 퇴근
                </Text>
                {data.previous.items.map((m) => (
                  <View key={m.id} style={card}>
                    <Text style={{ fontWeight: '700' }}>{m.title || '인수인계'}</Text>
                    <Text style={{ lineHeight: 23 }}>{m.content}</Text>
                  </View>
                ))}
                {!data.previous.items.length && <Text style={{ marginTop: 10 }}>남긴 메모가 없어요.</Text>}
              </>
            ) : (
              <Text style={{ marginTop: 10 }}>연결할 직전 근무 기록이 없어요.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
