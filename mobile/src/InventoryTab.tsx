// 재고/발주 탭 화면 (상품 목록, 수정, 폐기) - 사장님·직원 공통
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { Ionicons } from '@expo/vector-icons';
import { Product, daysLeft, discardExpired, isLowStock, listProducts, productLowStockThreshold, updateProduct } from './inventory';
import { DEFAULT_STORE_SETUP_SETTINGS, getStoreSetupSettingsOrDefault } from './storeSetupRepository';
import type { StoreSetupSettings } from './storeSetupRepository';
import { C, Stepper } from './ui';

const ORDER_URL = 'https://www.coupang.com'; // 발주 버튼이 여는 주문 페이지

type Tag = { label: string; bg: string; fg: string };
const RED = { bg: '#FEECEB', fg: '#E53935' };
const ORANGE = { bg: '#FFF4E5', fg: '#D97706' };
const GREEN = { bg: '#EDFAF2', fg: '#10B981' };

// 상품 상태: 재고 부족 / 유통기한 임박 / 폐기 사항(유통기한 지남)
function status(p: Product, settings: StoreSetupSettings) {
  const d = daysLeft(p.expiry);
  const low = isLowStock(p.stock, productLowStockThreshold(p.min, settings.lowStockThresholdCount));
  const expired = d !== null && d < 0;
  const imminent = d !== null && d >= 0 && d <= settings.expirationAlertDays;
  const tags: Tag[] = [{ label: `재고 ${p.stock}개`, ...(low ? RED : GREEN) }];
  if (imminent) tags.push({ label: d === 0 ? 'D-day 임박' : `D-${d} 임박`, ...ORANGE });
  if (expired) tags.push({ label: '폐기 사항 있음', ...RED });
  return { tags, low, imminent, expired };
}

export default function InventoryTab({ store, onProfile, onBell }: { store: number; onProfile: () => void; onBell: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [alertSettings, setAlertSettings] = useState(DEFAULT_STORE_SETUP_SETTINGS);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<{ barcode: string; mode: 'edit' | 'discard' } | null>(null);
  const [editName, setEditName] = useState('');
  const [editStock, setEditStock] = useState(0);
  const [editMin, setEditMin] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const tops = useRef<Record<string, number>>({}); // 상품 카드별 세로 위치 (자동 스크롤용)

  const [error, setError] = useState('');
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '요청을 처리하지 못했어요');
  const reload = () => listProducts(store).then((l) => { setProducts(l); setError(''); }, fail);
  useEffect(() => {
    reload();
  }, [store]);
  useEffect(() => {
    let active = true;
    getStoreSetupSettingsOrDefault(store).then((settings) => {
      if (active) setAlertSettings(settings);
    }).catch(fail);
    return () => { active = false; };
  }, [store]);

  // 같은 카드의 같은 패널을 다시 누르면 접는다
  const toggle = (p: Product, mode: 'edit' | 'discard') => {
    if (open?.barcode === p.barcode && open.mode === mode) return setOpen(null);
    setOpen({ barcode: p.barcode, mode });
    setEditName(p.name);
    setEditStock(p.stock);
    setEditMin(p.min);
  };
  const save = async (job: Promise<unknown>) => {
    try {
      await job;
      setOpen(null);
      reload();
    } catch (e) {
      fail(e);
    }
  };

  const all = products ?? [];
  const needOrder = all.filter((p) => status(p, alertSettings).low).length;
  const imminent = all.filter((p) => status(p, alertSettings).imminent).length;
  const query = q.trim().toLowerCase();
  const list = all
    .filter((p) => p.name.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStatus = status(a, alertSettings);
      const bStatus = status(b, alertSettings);
      // 폐기/유통기한 임박 상품을 가장 먼저, 발주 필요 상품, 나머지 상품 순으로 둔다.
      const priority = (st: ReturnType<typeof status>) => st.expired || st.imminent ? 0 : st.low ? 1 : 2;
      const groupDiff = priority(aStatus) - priority(bStatus);
      if (groupDiff !== 0) return groupDiff;

      if ((aStatus.expired || aStatus.imminent) && (bStatus.expired || bStatus.imminent)) {
        // 유통기한이 지난 상품(음수)이 먼저, 이어서 임박 일수가 적은 순으로 둔다.
        const aDays = daysLeft(a.expiry) ?? Number.POSITIVE_INFINITY;
        const bDays = daysLeft(b.expiry) ?? Number.POSITIVE_INFINITY;
        return aDays - bDays || a.name.localeCompare(b.name, 'ko');
      }

      if (aStatus.low && bStatus.low) {
        // 발주 필요 상품은 재고가 가장 적은 상품이 위에 오도록 한다.
        return a.stock - b.stock || a.name.localeCompare(b.name, 'ko');
      }

      // 일반 상품은 재고가 적은 순, 재고가 같으면 유통기한이 가까운 순으로 둔다.
      const aDays = daysLeft(a.expiry) ?? Number.POSITIVE_INFINITY;
      const bDays = daysLeft(b.expiry) ?? Number.POSITIVE_INFINITY;
      return a.stock - b.stock || aDays - bDays || a.name.localeCompare(b.name, 'ko');
    });

  // "발주 관리 현황"을 누르면 발주·유통기한 알림 상품 중 목록 맨 위의 건으로 스크롤한다
  const goFirstAlert = () => {
    const first = list.find((p) => {
      const st = status(p, alertSettings);
      return st.low || st.imminent || st.expired;
    });
    const y = first && tops.current[first.barcode];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  return (
    <ScrollView
      ref={scroll}
      showsVerticalScrollIndicator={Platform.OS !== 'web'}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.header}>
        <Text style={s.title}>재고 및 발주</Text>
        <Pressable onPress={onBell} hitSlop={8}>
          <Ionicons name="notifications-outline" size={26} color={C.primary} />
        </Pressable>
        <Pressable style={s.avatar} onPress={onProfile}>
          <Ionicons name="person" size={18} color="#fff" />
        </Pressable>
      </View>

      <Pressable style={s.hero} onPress={goFirstAlert}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>발주 관리 현황</Text>
          <Text style={s.heroText}>발주 필요 {needOrder}건 · 유통기한 D-{alertSettings.expirationAlertDays} 이내 {imminent}건</Text>
          <Text style={s.heroHint}>상품별 기준 우선 · 미설정 상품은 {alertSettings.lowStockThresholdCount}개 이하</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </Pressable>

      <View style={s.search}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="목록 검색" placeholderTextColor="#999" />
      </View>

      {!!error && <Text style={[s.empty, { color: '#D93025', paddingVertical: 12 }]}>{error}</Text>}
      {products === null && !error && <Text style={s.empty}>불러오는 중이에요</Text>}
      {products !== null && !list.length && <Text style={s.empty}>{q ? '검색 결과가 없어요' : '등록된 상품이 없어요'}</Text>}

      {list.map((p) => {
        const st = status(p, alertSettings);
        const isOpen = open?.barcode === p.barcode;
        return (
          <View key={p.barcode} style={s.item} onLayout={(e) => (tops.current[p.barcode] = e.nativeEvent.layout.y)}>
            <View style={[s.card, isOpen && s.cardHot]}>
              <View style={s.top}>
                <View style={s.img} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                  <View style={s.tags}>
                    {st.tags.map((t) => (
                      <View key={t.label} style={[s.tag, { backgroundColor: t.bg }]}>
                        <Text style={[s.tagText, { color: t.fg }]}>{t.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              <View style={s.btns}>
                <Pressable style={[s.btn, s.btnLine]} onPress={() => toggle(p, 'edit')}>
                  <Text style={s.btnLineText}>수정</Text>
                </Pressable>
                <Pressable style={[s.btn, s.btnFill]} onPress={() => Linking.openURL(ORDER_URL).catch(() => {})}>
                  <Text style={s.btnFillText}>발주</Text>
                </Pressable>
              </View>
              {st.expired && (
                <Pressable style={s.discard} onPress={() => toggle(p, 'discard')}>
                  <Text style={s.discardText}>폐기 사항 확인</Text>
                </Pressable>
              )}
            </View>

            {isOpen && open.mode === 'edit' && (
              <View style={s.panel}>
                <Text style={s.label}>상품명</Text>
                <TextInput style={s.input} value={editName} onChangeText={setEditName} />
                <Text style={[s.label, { marginTop: 16 }]}>재고 수량</Text>
                <Stepper value={editStock} onChange={setEditStock} big min={0} />
                <Text style={[s.label, { marginTop: 16 }]}>적정 재고 알림 기준</Text>
                <Stepper value={editMin} onChange={setEditMin} big min={0} />
                <Text style={s.note}>재고가 {productLowStockThreshold(editMin, alertSettings.lowStockThresholdCount)}개 이하일 때 발주 필요로 표시돼요. 0은 매장 기본 기준을 따라요.</Text>
                <Pressable
                  disabled={!editName.trim()}
                  style={[s.panelBtn, !editName.trim() && { opacity: 0.4 }]}
                  onPress={() => save(updateProduct(store, p.barcode, { name: editName.trim(), stock: editStock, min: editMin }))}
                >
                  <Text style={s.panelBtnText}>수정 완료</Text>
                </Pressable>
              </View>
            )}

            {isOpen && open.mode === 'discard' && (
              <View style={s.panel}>
                <Text style={s.label}>폐기 사항</Text>
                <View style={s.input}>
                  <Text style={s.readonly}>{p.name}</Text>
                </View>
                <Text style={[s.label, { marginTop: 16 }]}>폐기 수량</Text>
                <Text style={s.discardQty}>{p.stock}<Text style={s.discardUnit}> 개</Text></Text>
                <Text style={s.note}>유통기한이 지난 상품은 자동으로 재고 수량에서 제외합니다</Text>
                <Pressable style={s.panelBtn} onPress={() => save(discardExpired(store, p.barcode))}>
                  <Text style={s.panelBtnText}>폐기 사항 확인 완료</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: C.text },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 20, marginTop: 14 },
  heroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  heroText: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 6 },
  heroHint: { fontSize: 10, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, borderRadius: 20, backgroundColor: '#F1EFF6', paddingHorizontal: 16, marginTop: 16, marginBottom: 14 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: C.text, paddingVertical: 0 },
  empty: { textAlign: 'center', color: '#828282', paddingVertical: 40 },
  item: { marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, backgroundColor: '#fff', padding: 12 },
  panel: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, backgroundColor: '#fff', padding: 16, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#5E5C6B', marginBottom: 8 },
  input: { height: 52, borderWidth: 1.6, borderColor: C.primary, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', fontSize: 15, color: C.text },
  readonly: { fontSize: 15, color: C.text },
  discardQty: { fontSize: 26, fontWeight: '700', color: C.text },
  discardUnit: { fontSize: 13, fontWeight: '400', color: '#5E5C6B' },
  note: { fontSize: 11.5, color: '#828282', marginTop: 8 },
  panelBtn: { height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  panelBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cardHot: { borderColor: C.primary },
  top: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  img: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F1F0F5' },
  name: { fontSize: 13, fontWeight: '700', color: '#191F28' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 },
  tagText: { fontSize: 10, fontWeight: '700' },
  btns: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  btnLine: { borderWidth: 1, borderColor: '#CFCCDB', backgroundColor: '#fff' },
  btnLineText: { fontSize: 14, fontWeight: '600', color: C.primary },
  btnFill: { backgroundColor: C.primary },
  btnFillText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  discard: { height: 28, borderRadius: 6, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  discardText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
