import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { api, errorText } from './api';
import { C } from './ui';

type Batch = {
  id: number;
  quantity: number;
  expiry: string | null;
  receivedAt: string | null;
  source: string;
  revision: number;
};
export default function StockBatches({
  storeId,
  barcode,
  onChange,
}: {
  storeId: number;
  barcode: string;
  onChange: () => void;
}) {
  const [rows, setRows] = useState<Batch[] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(''),
    [expiry, setExpiry] = useState('');
  const path = `/api/stores/${storeId}/products/${encodeURIComponent(barcode)}/batches`;
  const load = () => api<Batch[]>('GET', path).then(setRows);
  useEffect(() => {
    let active = true;
    api<Batch[]>('GET', path).then(
      (r) => {
        if (active) setRows(r);
      },
      (e) => {
        if (active) setError(e.message);
      },
    );
    return () => {
      active = false;
    };
  }, [path]);
  const save = async (b: Batch, discard = false) => {
    if (busy) return;
    setError('');
    if (!discard && (!/^\d{1,7}$/.test(quantity) || Number(quantity) > 1000000)) {
      setError('수량은 0~1,000,000개로 입력해주세요.');
      return;
    }
    const date = expiry.replace(/\./g, '-');
    if (!discard && date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('유통기한은 YYYY-MM-DD로 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      await api('PUT', `${path}/${b.id}`, {
        quantity: discard ? 0 : Number(quantity),
        expiry: discard ? b.expiry : date || null,
        revision: b.revision,
      });
      await load();
      setEditing(null);
      onChange();
    } catch (e) {
      setError(errorText(e, '묶음 재고를 저장하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={s.box}>
      <Text style={s.title}>입고 묶음별 재고·유통기한</Text>
      <Text style={s.note}>
        기존 재고는 ‘기존 재고’ 묶음으로 보관해요. 전체 재고를 줄이면 유통기한이 빠른 묶음부터 차감해요.
      </Text>
      {rows === null && !error && <Text style={s.note}>불러오는 중…</Text>}
      {rows?.length === 0 && <Text style={s.note}>남아 있는 재고가 없어요.</Text>}
      {rows?.map((b) => (
        <View key={b.id} style={s.row}>
          <Text style={s.title}>
            {b.quantity}개 · {b.expiry ?? '유통기한 미확인'}
          </Text>
          <Text style={s.note}>
            {b.source === 'LEGACY'
              ? '기존 재고'
              : b.source === 'ADJUSTMENT'
                ? '재고 조정'
                : `입고 ${b.receivedAt?.replace('T', ' ') ?? ''}`}
          </Text>
          {editing === b.id ? (
            <>
              <Text style={s.note}>남은 수량</Text>
              <TextInput
                style={s.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                maxLength={7}
              />
              <Text style={s.note}>유통기한 (비우면 미확인)</Text>
              <TextInput
                style={s.input}
                value={expiry}
                onChangeText={setExpiry}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
              <Pressable disabled={busy} style={s.button} onPress={() => void save(b)}>
                <Text style={s.white}>{busy ? '저장 중…' : '묶음 저장'}</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => setEditing(null)}>
                <Text style={s.link}>취소</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              disabled={busy}
              onPress={() => {
                setEditing(b.id);
                setQuantity(String(b.quantity));
                setExpiry(b.expiry ?? '');
              }}
            >
              <Text style={s.link}>수량·유통기한 수정 / 0개로 폐기</Text>
            </Pressable>
          )}
        </View>
      ))}
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  box: { padding: 14, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 14, marginTop: 10 },
  row: { borderTopWidth: 1, borderTopColor: '#E4E2EC', marginTop: 12, paddingTop: 12 },
  title: { fontSize: 14, lineHeight: 21, fontWeight: '700', color: C.text },
  note: { fontSize: 12, lineHeight: 19, color: '#686373', marginTop: 6 },
  link: { fontSize: 13, lineHeight: 20, color: C.primary, paddingVertical: 10 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D8D3E8',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    color: C.text,
    ...(Platform.OS === 'android' ? { fontFamily: 'sans-serif', paddingVertical: 0, includeFontPadding: false } : {}),
  },
  button: { backgroundColor: C.primary, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  white: { fontSize: 13, color: '#fff' },
  error: { fontSize: 12, lineHeight: 18, color: '#B3261E' },
});
