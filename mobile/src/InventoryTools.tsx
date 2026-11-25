import OrderReceiving, { orderStatus } from './OrderReceiving';
import { CategoryChoices } from './CategoryManager';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from './font';
import { api } from './api';
import { C } from './ui';
import type { Product } from './inventory';
type Mode = 'outbound' | 'adjustment' | 'history' | 'details' | 'orders';
type Batch = { id: number; quantity: number; expiry: string | null; revision: number };
type History = {
  id: number;
  barcode: string;
  name: string;
  type: string;
  before: number;
  after: number;
  actor: string;
  at: string;
  reason: string | null;
};
type Row = { barcode: string; name: string; stock: number; minimum: number; target: number; quantity: number };
type Plan = {
  id: number;
  actor: string;
  createdAt: string;
  status: string;
  revision: number;
  items: (Row & { received: number })[];
};
const input = {
    height: 44,
    borderWidth: 1,
    borderColor: '#D8D3E8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 0,
    marginVertical: 7,
    fontSize: 14,
    color: C.text,
  },
  note = { fontSize: 12, lineHeight: 21, color: '#686373' },
  action = { fontSize: 14, lineHeight: 22, color: C.primary, paddingVertical: 10, fontWeight: '700' as const },
  card = { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 14, padding: 13, marginTop: 12 };
const key = () => `inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export default function InventoryTools({
  storeId,
  products,
  barcode,
  initialMode = 'outbound',
  onClose,
  onChange,
}: {
  storeId: number;
  products: Product[];
  barcode?: string;
  initialMode?: Mode;
  onClose: () => void;
  onChange: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode),
    [selected, setSelected] = useState(barcode ?? products[0]?.barcode ?? ''),
    [owner, setOwner] = useState(false),
    [canAdjust, setCanAdjust] = useState(false),
    [canPlan, setCanPlan] = useState(false),
    [receiving, setReceiving] = useState<number | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [quantity, setQuantity] = useState('1'),
    [reason, setReason] = useState(''),
    [batches, setBatches] = useState<Batch[]>([]),
    [batchId, setBatchId] = useState<number | null>(null),
    [history, setHistory] = useState<History[]>([]),
    [from, setFrom] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toLocaleDateString('sv-SE');
    }),
    [to, setTo] = useState(() => new Date().toLocaleDateString('sv-SE')),
    [page, setPage] = useState(0),
    [category, setCategory] = useState(''),
    [specification, setSpecification] = useState(''),
    [target, setTarget] = useState('0'),
    [rows, setRows] = useState<Row[]>([]),
    [counts, setCounts] = useState<Record<string, string>>({}),
    [plans, setPlans] = useState<Plan[]>([]);
  const working = useRef(false),
    request = useRef(key()),
    payloadKey = useRef('');
  const root = `/api/stores/${storeId}`,
    product = products.find((p) => p.barcode === selected);
  useEffect(() => {
    api<{ owner: boolean; adjustStock: boolean; saveOrderPlans: boolean }>(
      'GET',
      root + '/inventory-capabilities',
    ).then(
      (v) => {
        setOwner(v.owner);
        setCanAdjust(v.owner || v.adjustStock);
        setCanPlan(v.owner || v.saveOrderPlans);
      },
      (e) => setError(e.message),
    );
  }, [root]);
  useEffect(() => {
    let alive = true;
    setError('');
    if (mode === 'history')
      api<History[]>(
        'GET',
        `${root}/inventory-history?from=${from}&to=${to}&page=${page}${barcode ? `&barcode=${encodeURIComponent(barcode)}` : ''}`,
      ).then(
        (v) => {
          if (alive) setHistory(v);
        },
        (e) => {
          if (alive) setError(e.message);
        },
      );
    else if (mode === 'orders')
      Promise.all([
        canPlan ? api<Row[]>('GET', root + '/order-recommendations') : Promise.resolve([] as Row[]),
        api<Plan[]>('GET', root + '/order-plans'),
      ]).then(
        ([r, p]) => {
          if (alive) {
            setRows(r);
            setCounts(Object.fromEntries(r.map((x) => [x.barcode, String(x.quantity)])));
            setPlans(p);
          }
        },
        (e) => {
          if (alive) setError(e.message);
        },
      );
    else if (selected)
      Promise.all([
        api<Batch[]>('GET', `${root}/products/${encodeURIComponent(selected)}/batches`),
        api<{ category: string | null; specification: string | null; targetStock: number }>(
          'GET',
          `${root}/products/${encodeURIComponent(selected)}/details`,
        ),
      ]).then(
        ([b, d]) => {
          if (alive) {
            setBatches(b);
            setCategory(d.category ?? '');
            setSpecification(d.specification ?? '');
            setTarget(String(d.targetStock));
            setBatchId(null);
          }
        },
        (e) => {
          if (alive) setError(e.message);
        },
      );
    return () => {
      alive = false;
    };
  }, [root, selected, mode, version, page, canPlan]);
  const run = async (path: string, body: unknown, method: 'POST' | 'PUT' = 'POST') => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const signature = JSON.stringify({ path, body });
      if (signature !== payloadKey.current) {
        payloadKey.current = signature;
        request.current = key();
      }
      await api(method, root + path, { ...(body as object), clientKey: request.current });
      request.current = key();
      payloadKey.current = '';
      setMessage('저장했어요.');
      onChange();
      if (mode === 'outbound' || mode === 'adjustment') onClose();
      else setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  if (receiving !== null)
    return (
      <OrderReceiving
        storeId={storeId}
        planId={receiving}
        canSubmit={canPlan}
        onClose={() => {
          setReceiving(null);
          setVersion((v) => v + 1);
        }}
        onChange={onChange}
      />
    );
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 36 }}>
        <Pressable onPress={onClose} style={{ padding: 18 }}>
          <Text style={action}>〈 재고 상세 관리</Text>
        </Pressable>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(
              [
                ['details', '상품 정보'],
                ['outbound', '출고'],
                ...(canAdjust ? [['adjustment', '실사 조정']] : []),
                ['history', '변동 이력'],
                ['orders', '발주·입고 계획'],
              ] as [Mode, string][]
            ).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => {
                  setMode(id);
                  setPage(0);
                  setMessage('');
                }}
                style={{
                  borderWidth: 1,
                  borderColor: C.primary,
                  borderRadius: 12,
                  padding: 10,
                  backgroundColor: mode === id ? C.primary : '#fff',
                }}
              >
                <Text style={{ color: mode === id ? '#fff' : C.primary, fontSize: 13 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {!!error && <Text style={{ ...note, color: '#B3261E' }}>{error}</Text>}
          {!!message && <Text style={{ ...note, color: '#237A47' }}>{message}</Text>}
          {!['history', 'orders'].includes(mode) && (
            <>
              <Text style={{ ...note, marginTop: 12 }}>대상 상품</Text>
              <ScrollView horizontal>
                {products.map((p) => (
                  <Pressable
                    key={p.barcode}
                    onPress={() => {
                      setSelected(p.barcode);
                      setReason('');
                    }}
                    style={{
                      padding: 9,
                      marginRight: 5,
                      borderWidth: 1,
                      borderColor: p.barcode === selected ? C.primary : '#DDD',
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: C.primary }}>{p.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={note}>
                현재 재고 {product?.stock ?? 0}개 · {selected}
              </Text>
            </>
          )}
          {mode === 'details' && (
            <View style={card}>
              <Text>분류</Text>
              <CategoryChoices storeId={storeId} value={category} onChange={setCategory} />
              <TextInput
                style={input}
                value={category}
                onChangeText={setCategory}
                maxLength={20}
                placeholder="분류 이름 직접 입력 (선택)"
              />
              <Text>규격 (예: 240ml · 1개입)</Text>
              <TextInput style={input} value={specification} onChangeText={setSpecification} maxLength={100} />
              {owner && (
                <>
                  <Text>목표 재고 (0이면 최소 기준의 3배)</Text>
                  <TextInput style={input} value={target} onChangeText={setTarget} keyboardType="number-pad" />
                </>
              )}
              <Pressable
                disabled={busy || !product}
                onPress={() => {
                  if (!/^\d+$/.test(target)) {
                    setError('목표 재고를 정수로 입력해주세요.');
                    return;
                  }
                  void run(
                    `/products/${encodeURIComponent(selected)}/details`,
                    { category, specification, targetStock: Number(target) },
                    'PUT',
                  );
                }}
              >
                <Text style={action}>상품 정보 저장</Text>
              </Pressable>
            </View>
          )}
          {(mode === 'outbound' || mode === 'adjustment') && (
            <View style={card}>
              <Text>{mode === 'outbound' ? '출고 수량' : '실제로 확인한 전체 수량'}</Text>
              <TextInput style={input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
              <Text>처리 사유 (필수)</Text>
              <TextInput
                style={input}
                value={reason}
                onChangeText={setReason}
                maxLength={300}
                placeholder="판매 · 폐기 · 실사 차이 등"
              />
              {mode === 'outbound' && (
                <>
                  <Text style={note}>출고 묶음 (미선택 시 유통기한 빠른 순)</Text>
                  <Pressable onPress={() => setBatchId(null)}>
                    <Text style={action}>{batchId === null ? '● ' : ''}자동 선택</Text>
                  </Pressable>
                  {batches.map((b) => (
                    <Pressable key={b.id} onPress={() => setBatchId(b.id)}>
                      <Text style={action}>
                        {batchId === b.id ? '● ' : ''}
                        {b.expiry ?? '유통기한 미확인'} · {b.quantity}개
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
              <Text style={note}>
                변경 전 {product?.stock ?? 0}개 → 변경 후{' '}
                {mode === 'adjustment' ? quantity : Math.max(0, (product?.stock ?? 0) - Number(quantity) || 0)}개
              </Text>
              <Pressable
                disabled={busy || !product || !reason.trim()}
                onPress={() => {
                  if (!/^\d+$/.test(quantity)) {
                    setError('수량을 정수로 입력해주세요.');
                    return;
                  }
                  const batch = batches.find((b) => b.id === batchId);
                  void run(`/products/${encodeURIComponent(selected)}/${mode}`, {
                    quantity: Number(quantity),
                    expectedStock: product?.stock,
                    reason,
                    batchId: mode === 'outbound' ? batchId : null,
                    batchRevision: batch?.revision ?? null,
                  });
                }}
              >
                <Text style={action}>{busy ? '저장 중…' : '확인한 수량으로 저장'}</Text>
              </Pressable>
            </View>
          )}
          {mode === 'history' && (
            <>
              <Text style={{ ...note, marginTop: 14 }}>상품·기간별 변동 이력 (50개씩, 최대 1년)</Text>
              <TextInput style={input} value={from} onChangeText={setFrom} placeholder="시작 YYYY-MM-DD" />
              <TextInput style={input} value={to} onChangeText={setTo} placeholder="종료 YYYY-MM-DD" />
              <Pressable
                onPress={() => {
                  setPage(0);
                  setVersion((v) => v + 1);
                }}
              >
                <Text style={action}>기간 조회</Text>
              </Pressable>
              {history.map((h) => (
                <View key={h.id} style={card}>
                  <Text style={{ fontWeight: '700' }}>
                    {h.name} ·{' '}
                    {(
                      { IN: '입고', OUT: '출고', ADJUST: '조정', DISCARD: '폐기', DELETE: '상품 삭제' } as Record<
                        string,
                        string
                      >
                    )[h.type] ?? h.type}
                  </Text>
                  <Text style={note}>
                    {h.before} → {h.after}개 ({h.after - h.before > 0 ? '+' : ''}
                    {h.after - h.before}){'\n'}
                    {h.actor} · {h.at.replace('T', ' ')}
                    {'\n'}
                    {h.reason ?? '기존 처리 기록'}
                  </Text>
                </View>
              ))}
              {!history.length && !error && <Text style={note}>조회한 기간에 변동 이력이 없어요.</Text>}
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <Pressable disabled={!page} onPress={() => setPage((p) => p - 1)}>
                  <Text style={action}>이전</Text>
                </Pressable>
                <Text style={action}>{page + 1}쪽</Text>
                <Pressable disabled={history.length < 50} onPress={() => setPage((p) => p + 1)}>
                  <Text style={action}>다음</Text>
                </Pressable>
              </View>
            </>
          )}
          {mode === 'orders' && (
            <>
              <Text style={{ ...note, marginTop: 12 }}>
                규칙 기반 추천 = 목표 재고 − 현재 재고. 목표 미설정 시 최소 기준의 3배를 사용해요. 계획 저장은 실제
                주문·입고와 다르며 재고는 바뀌지 않아요.
              </Text>
              {rows.map((r) => (
                <View key={r.barcode} style={card}>
                  <Text style={{ fontWeight: '700' }}>{r.name}</Text>
                  <Text style={note}>
                    현재 {r.stock} · 최소 {r.minimum} · 목표 {r.target} · 추천 {r.quantity}개
                  </Text>
                  <TextInput
                    style={input}
                    value={counts[r.barcode] ?? '0'}
                    onChangeText={(v) => setCounts((c) => ({ ...c, [r.barcode]: v }))}
                    keyboardType="number-pad"
                  />
                </View>
              ))}
              <Pressable
                disabled={busy || !rows.length || !canPlan}
                onPress={() => {
                  if (Object.values(counts).some((v) => !/^\d+$/.test(v))) {
                    setError('발주 수량을 정수로 입력해주세요.');
                    return;
                  }
                  void run('/order-plans', {
                    items: rows
                      .filter((r) => Number(counts[r.barcode]) > 0)
                      .map((r) => ({
                        barcode: r.barcode,
                        quantity: Number(counts[r.barcode]),
                        expectedStock: r.stock,
                        expectedTarget: r.target,
                      })),
                  });
                }}
              >
                <Text style={action}>검토한 발주 계획 저장</Text>
              </Pressable>
              <Text style={{ fontWeight: '700', marginTop: 12 }}>저장한 발주 계획</Text>
              {plans.map((p) => (
                <View key={p.id} style={card}>
                  <Text>
                    계획 #{p.id} · {p.actor} · {orderStatus(p.status)}
                  </Text>
                  <Pressable onPress={() => setReceiving(p.id)}>
                    <Text style={action}>발주 상태·입고 확인 〉</Text>
                  </Pressable>
                  <Text style={note}>
                    {p.createdAt.replace('T', ' ')}
                    {'\n'}
                    {p.items.map((i) => `${i.name} ${i.quantity}개`).join('\n')}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
