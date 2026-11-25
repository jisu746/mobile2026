import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from './font';
import { api } from './api';
import { C } from './ui';
import type { Product } from './inventory';
const field = {
  height: 44,
  borderWidth: 1,
  borderColor: '#D8D3E8',
  borderRadius: 10,
  paddingHorizontal: 10,
  color: C.text,
};
export default function BulkStocktake({
  storeId,
  products,
  onClose,
  onSaved,
}: {
  storeId: number;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [snapshot] = useState(() => products.map((p) => ({ ...p }))),
    [counts, setCounts] = useState<Record<string, string>>({}),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [reason, setReason] = useState(''),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const request = useRef(`stocktake-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    signature = useRef(''),
    lock = useRef(false);
  const selected = snapshot.filter((p) => counts[p.barcode]?.trim() !== undefined && counts[p.barcode].trim() !== '');
  const differences = selected.filter((p) => Number(counts[p.barcode]) !== p.stock);
  const matches = snapshot.filter((p) =>
    `${p.name} ${p.barcode} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const review = () => {
    if (
      !selected.length ||
      selected.length > 100 ||
      selected.some((p) => !/^\d+$/.test(counts[p.barcode]) || Number(counts[p.barcode]) > 1000000)
    ) {
      setError('수량을 정수로 입력해주세요. 한 번에 최대 100개 상품을 실사할 수 있어요.');
      return;
    }
    setError('');
    setPreview(true);
  };
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 34 }}>
        <Pressable disabled={busy} onPress={onClose}>
          <Text style={{ padding: 18, fontSize: 18, color: C.primary, fontWeight: '700' }}>〈 여러 상품 실사</Text>
        </Pressable>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }}
        >
          <Text style={{ fontSize: 13, lineHeight: 22 }}>
            직접 센 수량을 입력해요. 빈칸은 건너뛰고, 0은 재고 없음으로 처리해요. 재고를 늘리면 날짜 미확인 묶음에
            추가하고, 줄이면 유통기한 빠른 묶음부터 차감해요.
          </Text>
          {!!error && <Text style={{ color: '#B3261E', lineHeight: 22 }}>{error}</Text>}
          {!preview ? (
            <>
              <TextInput
                style={field}
                value={query}
                onChangeText={(v) => {
                  setQuery(v);
                  setPage(0);
                }}
                placeholder="상품명·바코드·카테고리 검색"
              />
              {matches.slice(page * 50, (page + 1) * 50).map((p) => (
                <View
                  key={p.barcode}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderBottomWidth: 1,
                    borderColor: '#EEE',
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{p.name}</Text>
                    <Text style={{ fontSize: 12, color: '#686373' }}>
                      기록상 {p.stock}개 · {p.category || '미분류'}
                    </Text>
                  </View>
                  <TextInput
                    accessibilityLabel={`${p.name} 실제 수량`}
                    style={[field, { width: 85 }]}
                    keyboardType="number-pad"
                    value={counts[p.barcode] ?? ''}
                    onChangeText={(v) => setCounts((c) => ({ ...c, [p.barcode]: v }))}
                    placeholder="실제 수량"
                  />
                </View>
              ))}
              {matches.length > 50 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pressable disabled={!page} onPress={() => setPage((p) => p - 1)}>
                    <Text style={{ padding: 10, color: C.primary }}>이전</Text>
                  </Pressable>
                  <Text>
                    {page + 1} / {Math.ceil(matches.length / 50)}
                  </Text>
                  <Pressable disabled={(page + 1) * 50 >= matches.length} onPress={() => setPage((p) => p + 1)}>
                    <Text style={{ padding: 10, color: C.primary }}>다음</Text>
                  </Pressable>
                </View>
              )}
              <Pressable onPress={review} style={{ padding: 16, backgroundColor: C.primary, borderRadius: 14 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                  입력 {selected.length}개 · 차이 확인
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>
                입력 {selected.length}개 중 차이 {differences.length}개
              </Text>
              {differences.map((p) => (
                <View key={p.barcode} style={{ padding: 14, backgroundColor: '#F4F2FA', borderRadius: 12 }}>
                  <Text style={{ fontWeight: '700' }}>{p.name}</Text>
                  <Text>
                    {p.stock} → {counts[p.barcode]}개 ({Number(counts[p.barcode]) - p.stock > 0 ? '+' : ''}
                    {Number(counts[p.barcode]) - p.stock})
                  </Text>
                </View>
              ))}
              {!differences.length && <Text>기록과 실제 수량이 모두 같아요. 확인 기록만 남겨요.</Text>}
              <TextInput
                style={field}
                value={reason}
                onChangeText={setReason}
                placeholder="실사 사유 (필수)"
                maxLength={300}
              />
              <Pressable
                disabled={busy || !reason.trim()}
                style={{
                  padding: 16,
                  backgroundColor: C.primary,
                  borderRadius: 14,
                  opacity: busy || !reason.trim() ? 0.5 : 1,
                }}
                onPress={async () => {
                  if (lock.current) return;
                  lock.current = true;
                  setBusy(true);
                  setError('');
                  try {
                    const body = {
                      reason: reason.trim(),
                      items: selected.map((p) => ({
                        barcode: p.barcode,
                        expectedStock: p.stock,
                        counted: Number(counts[p.barcode]),
                      })),
                    };
                    const next = JSON.stringify(body);
                    if (signature.current && signature.current !== next)
                      request.current = `stocktake-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    signature.current = next;
                    await api('POST', `/api/stores/${storeId}/stocktakes`, { ...body, clientKey: request.current });
                    onSaved();
                    onClose();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '저장 실패');
                  } finally {
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                  {busy ? '저장 중…' : '확인한 실사 결과 한 번에 저장'}
                </Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => setPreview(false)}>
                <Text style={{ padding: 12, color: C.primary }}>수량 다시 입력</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
