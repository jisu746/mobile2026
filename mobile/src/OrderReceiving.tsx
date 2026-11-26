import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from './font';
import { api, errorText } from './api';
import { C } from './ui';
type Plan = {
  id: number;
  status: string;
  revision: number;
  orderedAt: string | null;
  items: { barcode: string; name: string; quantity: number; received: number }[];
};
type Delivery = {
  id: number;
  actor: string;
  createdAt: string;
  items: { barcode: string; name: string; quantity: number; expiry: string | null; before: number; after: number }[];
};
export const orderStatus = (value: string) =>
  ({ DRAFT: '발주 전', ORDERED: '발주 완료', PARTIAL: '일부 입고', DELIVERED: '입고 완료' })[value] ?? '발주 전';
export default function OrderReceiving({
  storeId,
  planId,
  canSubmit,
  onClose,
  onChange,
}: {
  storeId: number;
  planId: number;
  canSubmit: boolean;
  onClose: () => void;
  onChange: () => void;
}) {
  const [plan, setPlan] = useState<Plan | null>(null),
    [history, setHistory] = useState<Delivery[]>([]),
    [counts, setCounts] = useState<Record<string, string>>({}),
    [dates, setDates] = useState<Record<string, string>>({}),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false);
  const lock = useRef(false),
    key = useRef(`delivery-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    signature = useRef('');
  const root = `/api/stores/${storeId}/order-plans/${planId}`;
  useEffect(() => {
    let alive = true;
    Promise.all([api<Plan>('GET', root), api<Delivery[]>('GET', root + '/deliveries')]).then(
      ([p, h]) => {
        if (alive) {
          setPlan(p);
          setHistory(h);
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
  }, [root, version]);
  const submit = async () => {
    if (!plan || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api('POST', root + '/submit', { revision: plan.revision });
      setVersion((v) => v + 1);
      onChange();
    } catch (e) {
      setError(errorText(e, '저장 실패'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const selected = plan?.items.filter((i) => counts[i.barcode]?.trim() && Number(counts[i.barcode]) > 0) ?? [];
  const review = () => {
    if (!plan) return;
    if (
      !selected.length ||
      plan.items.some((i) => counts[i.barcode]?.trim() && !/^\d+$/.test(counts[i.barcode])) ||
      selected.some((i) => Number(counts[i.barcode]) > i.quantity - i.received)
    ) {
      setError('남은 수량 안에서 실제 입고 수량을 입력해주세요.');
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
          <Text style={{ padding: 18, color: C.primary, fontSize: 18, fontWeight: '700' }}>
            〈 발주 #{planId} · 입고 확인
          </Text>
        </Pressable>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }}
        >
          {!!error && (
            <Text style={{ color: '#B3261E', lineHeight: 22 }}>
              {error}
              <Text
                onPress={() => {
                  setPreview(false);
                  setCounts({});
                  setVersion((v) => v + 1);
                }}
              >
                {'\n'}최신 계획 다시 불러오기 (입력 초기화)
              </Text>
            </Text>
          )}
          {plan && (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: C.primary }}>{orderStatus(plan.status)}</Text>
              {plan.status === 'DRAFT' && (
                <>
                  <Text style={{ lineHeight: 23 }}>
                    주문을 직접 마친 뒤 아래 버튼으로 표시해요. 이 버튼이 외부 업체에 주문을 보내지는 않아요.
                  </Text>
                  {canSubmit ? (
                    <Pressable
                      disabled={busy}
                      onPress={() => void submit()}
                      style={{ padding: 16, backgroundColor: C.primary, borderRadius: 12 }}
                    >
                      <Text style={{ color: 'white', textAlign: 'center' }}>실제 주문을 마쳤어요 · 발주 완료 표시</Text>
                    </Pressable>
                  ) : (
                    <Text>발주 권한이 있는 직원이나 사장님이 발주 완료로 표시할 수 있어요.</Text>
                  )}
                </>
              )}
              {plan.items.map((i) => (
                <View
                  key={i.barcode}
                  style={{ padding: 14, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 14, gap: 8 }}
                >
                  <Text style={{ fontWeight: '700' }}>{i.name}</Text>
                  <Text style={{ fontSize: 13 }}>
                    주문 {i.quantity} · 누적 입고 {i.received} · 남음 {i.quantity - i.received}개
                  </Text>
                  {plan.status !== 'DRAFT' && plan.status !== 'DELIVERED' && i.quantity > i.received && !preview && (
                    <>
                      <TextInput
                        accessibilityLabel={`${i.name} 이번 입고 수량`}
                        style={{
                          height: 44,
                          borderWidth: 1,
                          borderColor: '#D8D3E8',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          color: C.text,
                        }}
                        value={counts[i.barcode] ?? ''}
                        onChangeText={(v) => setCounts((c) => ({ ...c, [i.barcode]: v }))}
                        keyboardType="number-pad"
                        placeholder="이번에 실제 들어온 수량 (빈칸은 건너뛰기)"
                      />
                      <TextInput
                        style={{
                          height: 44,
                          borderWidth: 1,
                          borderColor: '#D8D3E8',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          color: C.text,
                        }}
                        value={dates[i.barcode] ?? ''}
                        onChangeText={(v) => setDates((c) => ({ ...c, [i.barcode]: v }))}
                        placeholder="유통기한 YYYY-MM-DD (선택)"
                      />
                    </>
                  )}
                </View>
              ))}
              {plan.status !== 'DRAFT' &&
                plan.status !== 'DELIVERED' &&
                (!preview ? (
                  <Pressable onPress={review}>
                    <Text style={{ padding: 14, color: C.primary, fontWeight: '700' }}>입고 수량 확인</Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 14 }}>
                    <Text style={{ fontWeight: '700' }}>재고에 반영할 입고</Text>
                    {selected.map((i) => (
                      <Text key={i.barcode}>
                        {i.name} · {counts[i.barcode]}개 · {dates[i.barcode] || '날짜 미확인'}
                      </Text>
                    ))}
                    <Pressable
                      disabled={busy}
                      style={{ padding: 16, backgroundColor: C.primary, borderRadius: 12 }}
                      onPress={async () => {
                        if (lock.current) return;
                        lock.current = true;
                        setBusy(true);
                        setError('');
                        try {
                          const body = {
                            revision: plan.revision,
                            items: selected.map((i) => ({
                              barcode: i.barcode,
                              name: i.name,
                              category: null,
                              qty: Number(counts[i.barcode]),
                              expiry: dates[i.barcode]?.trim() || null,
                            })),
                          };
                          const next = JSON.stringify(body);
                          if (signature.current && signature.current !== next)
                            key.current = `delivery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                          signature.current = next;
                          await api('POST', root + '/deliveries', { ...body, clientKey: key.current });
                          key.current = `delivery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                          signature.current = '';
                          setCounts({});
                          setDates({});
                          setPreview(false);
                          setVersion((v) => v + 1);
                          onChange();
                        } catch (e) {
                          setError(errorText(e, '입고 실패'));
                        } finally {
                          lock.current = false;
                          setBusy(false);
                        }
                      }}
                    >
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                        {busy ? '반영 중…' : '확인한 수량을 재고에 반영'}
                      </Text>
                    </Pressable>
                    <Pressable disabled={busy} onPress={() => setPreview(false)}>
                      <Text style={{ color: C.primary }}>다시 입력</Text>
                    </Pressable>
                  </View>
                ))}
              <Text style={{ fontSize: 17, fontWeight: '700', marginTop: 12 }}>입고 기록 (최근 50회)</Text>
              {!history.length && <Text>아직 입고한 기록이 없어요.</Text>}
              {history.map((h) => (
                <View key={h.id} style={{ padding: 14, backgroundColor: '#F4F2FA', borderRadius: 12, gap: 6 }}>
                  <Text>
                    {h.actor} · {h.createdAt.replace('T', ' ')}
                  </Text>
                  {h.items.map((i, n) => (
                    <Text key={n} style={{ fontSize: 13, lineHeight: 22 }}>
                      {i.name} {i.quantity}개 · {i.expiry ?? '날짜 미확인'} · 재고 {i.before}→{i.after}
                    </Text>
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
