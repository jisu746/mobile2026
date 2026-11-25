import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from './font';
import { api } from './api';
import { C } from './ui';
type Breaks = {
  revision: number;
  seconds: number;
  clockIn: string;
  clockOut: string | null;
  breaks: { from: string; to: string }[];
};
export default function WorkBreakEditor({
  storeId,
  sessionId,
  onSaved,
}: {
  storeId: number;
  sessionId: number;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<Breaks | null>(null),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const path = `/api/stores/${storeId}/work/sessions/${sessionId}/breaks`;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<Breaks>('GET', path).then(
      (v) => {
        if (alive) {
          setData(v);
          setText(v.breaks.map((b) => b.from.replace('T', ' ') + ' / ' + b.to.replace('T', ' ')).join('\n'));
        }
      },
      (e) => {
        if (alive) setError(e.message);
      },
    );
    return () => {
      alive = false;
    };
  }, [path, open]);
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, marginVertical: 6 }}>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={{ fontSize: 13, color: C.primary, paddingVertical: 10 }}>
          실제 휴게시간 확인·수정 {open ? '⌄' : '〉'}
        </Text>
      </Pressable>
      {open && (
        <View>
          <Text style={{ fontSize: 12, lineHeight: 21, color: '#686373' }}>
            실제로 쉰 무급 휴게만 입력해요. 휴게가 없으면 빈칸으로 저장해요. 출퇴근 시간에서 이 구간을 빼서 실근무와
            기본급을 계산해요.
          </Text>
          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder={'2026-11-25 12:00 / 2026-11-25 12:30\n구간별 줄바꿈'}
            style={{
              borderWidth: 1,
              borderColor: '#D8D3E8',
              borderRadius: 10,
              padding: 10,
              minHeight: 90,
              fontSize: 13,
              color: C.text,
              marginTop: 8,
            }}
          />
          {!!error && <Text style={{ color: '#B3261E', fontSize: 12 }}>{error}</Text>}
          <Pressable
            disabled={!data || busy}
            onPress={async () => {
              if (!data || busy) return;
              setBusy(true);
              setError('');
              try {
                const breaks = text.trim()
                  ? text
                      .split('\n')
                      .filter((v) => v.trim())
                      .map((line) => {
                        const parts = line.split('/').map((v) => v.trim().replace(' ', 'T'));
                        if (
                          parts.length !== 2 ||
                          parts.some((v) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v))
                        )
                          throw Error('YYYY-MM-DD HH:mm / YYYY-MM-DD HH:mm 형식으로 입력해주세요.');
                        return { from: parts[0], to: parts[1] };
                      })
                  : [];
                setData(await api<Breaks>('PUT', path, { revision: data.revision, breaks }));
                setOpen(false);
                onSaved();
              } catch (e) {
                setError(e instanceof Error ? e.message : '저장 실패');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ fontSize: 13, color: C.primary, paddingVertical: 12, fontWeight: '700' }}>
              {busy ? '저장 중…' : '확인한 휴게시간 저장'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
