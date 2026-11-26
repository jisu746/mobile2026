import BulkStocktake from './BulkStocktake';
import CategoryManager, { getCategories } from './CategoryManager';
import NotificationBell from './NotificationBell';
import { api, errorText } from './api';
// 재고/발주 탭 화면 (상품 목록, 수정, 폐기) - 사장님·직원 공통
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { Ionicons } from '@expo/vector-icons';
import {
  Product,
  daysLeft,
  deleteProduct,
  discardExpired,
  isLowStock,
  listProducts,
  productLowStockThreshold,
  updateProduct,
} from './inventory';
import { DEFAULT_STORE_SETUP_SETTINGS, getStoreSetupSettingsOrDefault } from './storeSetupRepository';
import type { StoreSetupSettings } from './storeSetupRepository';
import { C, Stepper } from './ui';
import StockBatches from './StockBatches';
import InventoryTools from './InventoryTools';
import ProductPhotoCapture, { ProductPhotoButton } from './ProductPhotoCapture';

type Tag = { label: string; bg: string; fg: string };
const RED = { bg: '#FEECEB', fg: '#E53935' };
const ORANGE = { bg: '#FFF4E5', fg: '#D97706' };
const GREEN = { bg: '#EDFAF2', fg: '#10B981' };

// 상품 상태: 재고 부족 / 유통기한 임박 / 폐기 사항(유통기한 지남)
function status(p: Product, settings: StoreSetupSettings) {
  const d = settings.expiryEnabled === false ? null : daysLeft(p.expiry);
  const low = isLowStock(p.stock, productLowStockThreshold(p.min, settings.lowStockThresholdCount));
  const expired = d !== null && d < 0;
  const imminent = d !== null && d >= 0 && d <= settings.expirationAlertDays;
  const tags: Tag[] = [{ label: `재고 ${p.stock}개`, ...(low ? RED : GREEN) }];
  if (imminent) tags.push({ label: d === 0 ? 'D-day 임박' : `D-${d} 임박`, ...ORANGE });
  if (expired) tags.push({ label: '폐기 사항 있음', ...RED });
  return { tags, low, imminent, expired };
}

export default function InventoryTab({
  store,
  onProfile,
  onBell,
  focusBarcode,
}: {
  store: number;
  onProfile: () => void;
  onBell: () => void;
  focusBarcode?: string;
}) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [alertSettings, setAlertSettings] = useState(DEFAULT_STORE_SETUP_SETTINGS);
  const [q, setQ] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [canDelete, setCanDelete] = useState(false),
    [canAdjust, setCanAdjust] = useState(false),
    [canPlan, setCanPlan] = useState(false),
    [stocktake, setStocktake] = useState(false);
  useEffect(() => {
    api<{ owner: boolean; deleteProducts: boolean; adjustStock: boolean; saveOrderPlans: boolean }>(
      'GET',
      `/api/stores/${store}/inventory-capabilities`,
    ).then(
      (v) => {
        setIsOwner(v.owner);
        setCanDelete(v.owner || v.deleteProducts);
        setCanAdjust(v.owner || v.adjustStock);
        setCanPlan(v.owner || v.saveOrderPlans);
      },
      () => {},
    );
  }, [store]);
  const [focused, setFocused] = useState(focusBarcode);
  const [open, setOpen] = useState<{ barcode: string; mode: 'edit' | 'discard' } | null>(null);
  const [editName, setEditName] = useState('');
  const [editStock, setEditStock] = useState(0);
  const [editMin, setEditMin] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [photoTarget, setPhotoTarget] = useState<Product | null>(null);
  const [tools, setTools] = useState<{ barcode?: string; mode: 'details' | 'history' | 'orders' } | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'expiry'>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [categoryManager, setCategoryManager] = useState(false);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  useEffect(() => {
    getCategories(store).then(
      (v) => setCategoryNames(v.categories),
      () => {},
    );
  }, [store]);
  const [alertsOnly, setAlertsOnly] = useState(false);
  useEffect(() => {
    if (!alertsOnly) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setAlertsOnly(false);
      setFilter('all');
      return true;
    });
    return () => back.remove();
  }, [alertsOnly]);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteBusy = useRef(false);
  const remove = async () => {
    if (!deleteTarget || deleteBusy.current) return;
    deleteBusy.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteProduct(store, deleteTarget.barcode, deleteTarget.stock);
      setProducts((current) => current?.filter((p) => p.barcode !== deleteTarget.barcode) ?? null);
      if (open?.barcode === deleteTarget.barcode) setOpen(null);
      if (focused === deleteTarget.barcode) setFocused(undefined);
      setDeleteTarget(null);
      void reload();
    } catch (e) {
      setDeleteError(errorText(e, '상품을 삭제하지 못했어요.'));
      void reload();
    } finally {
      deleteBusy.current = false;
      setDeleting(false);
    }
  };
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const tops = useRef<Record<string, number>>({}); // 상품 카드별 세로 위치 (자동 스크롤용)

  const [error, setError] = useState('');
  const fail = (e: unknown) => setError(errorText(e, '요청을 처리하지 못했어요'));
  const reload = () =>
    listProducts(store).then((l) => {
      setProducts(l);
      if (open) {
        const current = l.find((p) => p.barcode === open.barcode);
        if (current) setEditStock(current.stock);
      }
      setError('');
    }, fail);
  useEffect(() => {
    reload();
  }, [store]);
  useEffect(() => {
    let active = true;
    getStoreSetupSettingsOrDefault(store)
      .then((settings) => {
        if (active) setAlertSettings(settings);
      })
      .catch(fail);
    return () => {
      active = false;
    };
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
    .filter(
      (p) =>
        (category === null || (p.category || '미분류') === category) &&
        (!alertsOnly || status(p, alertSettings).low || status(p, alertSettings).imminent),
    )
    .filter(
      (p) =>
        (!focused || p.barcode === focused) &&
        (p.name.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.specification ?? '').toLowerCase().includes(query)) &&
        (filter === 'all' ||
          (filter === 'low' && status(p, alertSettings).low) ||
          (filter === 'expiry' && (status(p, alertSettings).imminent || status(p, alertSettings).expired))),
    )
    .sort((a, b) => {
      const aStatus = status(a, alertSettings);
      const bStatus = status(b, alertSettings);
      // 폐기/유통기한 임박 상품을 가장 먼저, 발주 필요 상품, 나머지 상품 순으로 둔다.
      const priority = (st: ReturnType<typeof status>) => (st.expired || st.imminent ? 0 : st.low ? 1 : 2);
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

  return (
    <>
      {stocktake && (
        <BulkStocktake
          storeId={store}
          products={all}
          onClose={() => setStocktake(false)}
          onSaved={() => void reload()}
        />
      )}
      {categoryManager && (
        <CategoryManager
          storeId={store}
          onClose={() => setCategoryManager(false)}
          onSaved={(names) => {
            setCategoryNames(names);
            setCategory(null);
            void reload();
          }}
        />
      )}
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          {alertsOnly && (
            <Pressable
              accessibilityLabel="전체 재고로 돌아가기"
              onPress={() => {
                setAlertsOnly(false);
                setFilter('all');
              }}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={24} color={C.text} />
            </Pressable>
          )}
          <Text style={[s.title, { flex: 1 }]}>{alertsOnly ? '발주·유통기한 알림' : '재고 및 발주'}</Text>
          <Pressable onPress={onBell} hitSlop={8}>
            <NotificationBell storeId={store} />
          </Pressable>
          <Pressable style={s.avatar} onPress={onProfile}>
            <Ionicons name="person" size={18} color="#fff" />
          </Pressable>
        </View>

        {!alertsOnly && (
          <Pressable
            style={s.hero}
            onPress={() => {
              setAlertsOnly(true);
              setFilter('all');
              setCategory(null);
              setQ('');
              setFocused(undefined);
              scroll.current?.scrollTo({ y: 0, animated: true });
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.heroLabel}>발주 관리 현황</Text>
              <Text style={s.heroText}>
                발주 필요 {needOrder}건 · 유통기한 D-{alertSettings.expirationAlertDays} 이내 {imminent}건
              </Text>
              <Text style={s.heroHint}>
                상품별 기준 우선 · 미설정 상품은 {alertSettings.lowStockThresholdCount}개 이하
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        )}

        {alertsOnly && (
          <View style={{ paddingVertical: 14, gap: 10 }}>
            <Text>
              발주 필요 {needOrder}건 · 유통기한 임박 {imminent}건
            </Text>
            <Text>확인이 필요한 상품만 모았어요.</Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        >
          {[
            null,
            ...Array.from(new Set([...categoryNames, ...all.map((p) => p.category || '미분류')])).sort((a, b) =>
              a.localeCompare(b, 'ko'),
            ),
          ].map((value) => (
            <Pressable
              key={value ?? 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected: category === value }}
              onPress={() => setCategory(value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: category === value ? C.primary : '#F1F0F5',
              }}
            >
              <Text style={{ color: category === value ? 'white' : C.primary }}>{value ?? '전체 카테고리'}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {isOwner && (
          <Pressable onPress={() => setCategoryManager(true)} style={{ paddingVertical: 8, alignSelf: 'flex-end' }}>
            <Text style={{ color: C.primary, fontSize: 13, fontWeight: '700' }}>＋ 카테고리 추가·관리</Text>
          </Pressable>
        )}
        <View style={s.search}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={s.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder="상품명·바코드·규격 검색"
            placeholderTextColor="#999"
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingVertical: 10 }}>
          {(
            [
              ['all', '전체'],
              ['low', '재고 부족'],
              ['expiry', '유통기한'],
            ] as const
          ).map(([id, label]) => (
            <Pressable key={id} onPress={() => setFilter(id)}>
              <Text style={{ color: C.primary, fontWeight: filter === id ? '700' : '400' }}>{label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setTools({ mode: 'history' })}>
            <Text style={{ color: C.primary }}>입출고·이력·발주 관리 〉</Text>
          </Pressable>
        </View>
        {canAdjust && (
          <Pressable onPress={() => setStocktake(true)} style={{ paddingVertical: 12 }}>
            <Text style={{ color: C.primary, fontWeight: '700' }}>여러 상품 한 번에 실사 〉</Text>
          </Pressable>
        )}
        {!!focused && (
          <View style={{ paddingVertical: 12, gap: 8 }}>
            <Text style={{ color: C.primary, fontWeight: '700' }}>알림 대상 상품</Text>
            <Pressable
              onPress={() => {
                setFocused(undefined);
                setQ('');
              }}
            >
              <Text style={{ color: C.primary }}>전체 상품 보기</Text>
            </Pressable>
          </View>
        )}

        {!!error && <Text style={[s.empty, { color: '#D93025', paddingVertical: 12 }]}>{error}</Text>}
        {products === null && !error && <Text style={s.empty}>불러오는 중이에요</Text>}
        {products !== null && !list.length && (
          <Text style={s.empty}>
            {focused
              ? '알림 대상 상품을 찾을 수 없어요. 전체 상품 보기를 눌러 확인해 주세요.'
              : q
                ? '검색 결과가 없어요'
                : filter !== 'all' || category !== null || alertsOnly
                  ? '선택한 조건에 해당하는 상품이 없어요'
                  : '등록된 상품이 없어요'}
          </Text>
        )}

        {list.map((p) => {
          const st = status(p, alertSettings);
          const isOpen = open?.barcode === p.barcode;
          return (
            <View key={p.barcode} style={s.item} onLayout={(e) => (tops.current[p.barcode] = e.nativeEvent.layout.y)}>
              <View style={[s.card, isOpen && s.cardHot]}>
                <View style={s.top}>
                  <ProductPhotoButton storeId={store} product={p} onPress={() => setPhotoTarget(p)} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View style={s.tags}>
                      {st.tags.map((t) => (
                        <View key={t.label} style={[s.tag, { backgroundColor: t.bg }]}>
                          <Text style={[s.tagText, { color: t.fg }]}>{t.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  {canDelete && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${p.name} 삭제`}
                      hitSlop={6}
                      onPress={() => {
                        setDeleteError('');
                        setDeleteTarget(p);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Ionicons name="trash-outline" size={21} color="#8B839A" />
                    </Pressable>
                  )}
                </View>
                <View style={s.btns}>
                  <Pressable style={[s.btn, s.btnLine]} onPress={() => toggle(p, 'edit')}>
                    <Text style={s.btnLineText}>수정</Text>
                  </Pressable>
                  <Pressable
                    style={[s.btn, s.btnFill]}
                    onPress={() => setTools({ barcode: p.barcode, mode: canPlan ? 'orders' : 'details' })}
                  >
                    <Text style={s.btnFillText}>{canPlan ? '발주' : '상세'}</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setTools({ barcode: p.barcode, mode: 'details' })}>
                  <Text style={{ fontSize: 13, color: C.primary, paddingTop: 12 }}>
                    상품 상세 · 출고 · 변동 이력 〉
                  </Text>
                </Pressable>
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
                  <Text style={s.note}>{editStock}개 · 수량 변경은 상품 상세의 출고·실사 조정을 이용해주세요.</Text>
                  <Text style={[s.label, { marginTop: 16 }]}>적정 재고 알림 기준</Text>
                  <Stepper value={editMin} onChange={setEditMin} big min={0} />
                  <StockBatches
                    storeId={store}
                    barcode={p.barcode}
                    onChange={() => {
                      void reload();
                    }}
                  />
                  <Text style={s.note}>
                    재고가 {productLowStockThreshold(editMin, alertSettings.lowStockThresholdCount)}개 이하일 때 발주
                    필요로 표시돼요. 0은 매장 기본 기준을 따라요.
                  </Text>
                  <Pressable
                    disabled={!editName.trim()}
                    style={[s.panelBtn, !editName.trim() && { opacity: 0.4 }]}
                    onPress={() =>
                      save(
                        updateProduct(store, p.barcode, {
                          name: editName.trim(),
                          stock: editStock,
                          min: editMin,
                          expectedStock: p.stock,
                        }),
                      )
                    }
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
                  <Text style={s.note}>
                    유통기한이 지난 묶음의 남은 수량만 폐기해요. 날짜를 모르는 재고와 아직 유통기한이 남은 묶음은
                    유지돼요.
                  </Text>
                  <StockBatches
                    storeId={store}
                    barcode={p.barcode}
                    onChange={() => {
                      void reload();
                    }}
                  />
                  <Text style={s.note}>아래 버튼으로 유통기한이 지난 묶음을 한 번에 폐기할 수 있어요.</Text>
                  <Pressable style={s.panelBtn} onPress={() => save(discardExpired(store, p.barcode))}>
                    <Text style={s.panelBtnText}>폐기 사항 확인 완료</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      {tools && (
        <InventoryTools
          storeId={store}
          products={all}
          barcode={tools.barcode}
          initialMode={tools.mode}
          onClose={() => setTools(null)}
          onChange={() => {
            void reload();
          }}
        />
      )}
      {photoTarget && (
        <ProductPhotoCapture
          storeId={store}
          product={photoTarget}
          onClose={() => {
            setPhotoTarget(null);
            void reload();
          }}
          onSaved={(version) => {
            setProducts(
              (current) =>
                current?.map((p) => (p.barcode === photoTarget.barcode ? { ...p, photoVersion: version } : p)) ?? null,
            );
          }}
        />
      )}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 22, gap: 14 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: C.text }}>상품을 삭제할까요?</Text>
            <Text style={{ fontSize: 15, lineHeight: 23, color: C.text }}>{deleteTarget?.name}</Text>
            <Text style={{ fontSize: 13, lineHeight: 21, color: '#686373' }}>
              목록에서 삭제하고 남은 재고 {deleteTarget?.stock ?? 0}개와 입고 묶음의 수량을 0개로 정리해요. 기존
              입고·재고 변동 이력은 남아요. 같은 바코드를 다시 입고하면 새 수량으로 등록돼요.
            </Text>
            {!!deleteError && <Text style={{ fontSize: 13, lineHeight: 20, color: '#B3261E' }}>{deleteError}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                disabled={deleting}
                onPress={() => setDeleteTarget(null)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#D8D3E8',
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: C.primary, fontWeight: '700' }}>취소</Text>
              </Pressable>
              <Pressable
                disabled={deleting || !!deleteError}
                onPress={() => void remove()}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: '#C83232',
                  borderRadius: 12,
                  opacity: deleting || deleteError ? 0.5 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{deleting ? '삭제 중…' : '삭제'}</Text>
              </Pressable>
            </View>
            {!!deleteError && (
              <Text style={{ fontSize: 12, color: '#686373' }}>취소 후 최신 목록을 확인하고 다시 시도해주세요.</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: C.text },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginTop: 14,
  },
  heroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  heroText: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 6 },
  heroHint: { fontSize: 10, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1EFF6',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: C.text, paddingVertical: 0 },
  empty: { textAlign: 'center', color: '#828282', paddingVertical: 40 },
  item: { marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, backgroundColor: '#fff', padding: 12 },
  panel: {
    borderWidth: 1,
    borderColor: '#E4E2EC',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#5E5C6B', marginBottom: 8 },
  input: {
    height: 52,
    borderWidth: 1.6,
    borderColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    fontSize: 15,
    color: C.text,
  },
  readonly: { fontSize: 15, color: C.text },
  discardQty: { fontSize: 26, fontWeight: '700', color: C.text },
  discardUnit: { fontSize: 13, fontWeight: '400', color: '#5E5C6B' },
  note: { fontSize: 11.5, color: '#828282', marginTop: 8 },
  panelBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
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
  discard: {
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  discardText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
