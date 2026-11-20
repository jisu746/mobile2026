// 바코드 입고 화면 (스캔 → 입고 목록 확인 → 완료 결과)
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { Ionicons } from '@expo/vector-icons';
import { BarcodeType } from 'expo-camera';
import Scanner from './Scanner';
import { Product, getProduct, isLowStock, receive } from './inventory';
import { DEFAULT_STORE_SETUP_SETTINGS, getStoreSetupSettingsOrDefault } from './storeSetupRepository';
import { C, Field, Stepper } from './ui';

type Item = { barcode: string; name: string; category: string; before: number; min: number; qty: number; expiry: string };
type Result = { name: string; before: number; after: number; min: number };
type Props = { store: number; userName: string; onExit: () => void };

const BARCODES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 숫자만 입력해도 2026.10.11 형식으로 맞춘다
const fmtDate = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return d.length > 6 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}` : d.length > 4 ? `${d.slice(0, 4)}.${d.slice(4)}` : d;
};
const parseDate = (s: string) => {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d : null;
};
const alertText = (d: Date, days: number) => {
  const a = new Date(d);
  a.setDate(a.getDate() - days);
  return `${a.getFullYear()}.${a.getMonth() + 1}.${a.getDate()}(D-${days})에 임박 알림을 보내요`;
};

export default function BarcodeFlow({ store, userName, onExit }: Props) {
  const [step, setStep] = useState<'scan' | 'review' | 'done'>('scan');
  const [items, setItems] = useState<Item[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [scanKey, setScanKey] = useState(0);
  const [error, setError] = useState('');
  const [alertSettings, setAlertSettings] = useState(DEFAULT_STORE_SETUP_SETTINGS);

  useEffect(() => {
    let active = true;
    getStoreSetupSettingsOrDefault(store).then((settings) => {
      if (active) setAlertSettings(settings);
    }).catch((e) => setError(e instanceof Error ? e.message : '매장 설정을 불러오지 못했어요.'));
    return () => { active = false; };
  }, [store]);

  const add = (item: Item) => {
    setItems((cur) =>
      cur.some((x) => x.barcode === item.barcode)
        ? cur.map((x) => (x.barcode === item.barcode ? { ...x, qty: x.qty + item.qty } : x))
        : [...cur, item]
    );
    setStep('review');
  };

  // 서버에 입고를 반영하고, 서버가 계산한 입고 전후 재고를 결과 화면에 보여준다
  const complete = async () => {
    setError('');
    try {
      const res = await receive(store, items);
      setResults(res.map((r) => ({ name: r.name, before: r.before, after: r.after, min: r.min })));
      setItems([]);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '입고하지 못했어요');
    }
  };

  if (step === 'scan') {
    return (
      <Scanner
        key={scanKey}
        title="바코드 입고"
        onClose={onExit}
        types={BARCODES}
        hint="상품 바코드를 프레임 안에 맞춰주세요"
        manualEntry="text"
        sheet={(code, rescan) => <ProductSheet store={store} code={code} expirationAlertDays={alertSettings.expirationAlertDays} onRescan={rescan} onAdd={add} />}
      />
    );
  }

  if (step === 'review') return <Review items={items} setItems={setItems} userName={userName} error={error} onBack={() => { setScanKey((k) => k + 1); setStep('scan'); }} onComplete={complete} />;

  return (
    <View style={s.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.doneBody}>
        <View style={s.doneRing}>
          <View style={s.doneCircle}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
        </View>
        <Text style={s.doneTitle}>입고를 완료했어요</Text>
        <Text style={s.doneSub}>{results.length}개 품목 · {results.reduce((a, r) => a + (r.after - r.before), 0)}개가 재고에 반영됐어요</Text>

        <Text style={s.sectionTitle}>재고 변화</Text>
        <View style={s.card}>
          {results.map((r, i) => {
            const fixed = isLowStock(r.before, r.min, alertSettings.lowStockThresholdPercent)
              && !isLowStock(r.after, r.min, alertSettings.lowStockThresholdPercent);
            return (
              <View key={r.name + i} style={[s.changeRow, i > 0 && s.line]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{r.name}</Text>
                  {fixed && (
                    <View style={s.autoRow}>
                      <Ionicons name="checkmark-circle-outline" size={12} color="#2F7A4E" />
                      <Text style={s.autoText}>재고 부족 업무가 자동 완료됐어요</Text>
                    </View>
                  )}
                </View>
                <Text style={s.change}>{r.before} → <Text style={s.changeNew}>{r.after}</Text></Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.doneBtns}>
        <Pressable style={[s.btn, s.btnLine, { flex: 1 }]} onPress={() => { setScanKey((k) => k + 1); setStep('scan'); }}>
          <Ionicons name="barcode-outline" size={18} color={C.primary} />
          <Text style={s.btnLineText}>계속 스캔</Text>
        </Pressable>
        <Pressable style={[s.btn, s.btnFill, { flex: 1.5 }]} onPress={onExit}>
          <Text style={s.btnFillText}>업무로 돌아가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProductSheet({ store, code, expirationAlertDays, onRescan, onAdd }: { store: number; code: string; expirationAlertDays: number; onRescan: () => void; onAdd: (i: Item) => void }) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined); // undefined = 조회 중
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [expiry, setExpiry] = useState('');

  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getProduct(store, code).then(setProduct, (e) => setLoadError(e instanceof Error ? e.message : '상품을 불러오지 못했어요'));
  }, [code]);

  if (loadError)
    return (
      <View>
        <Text style={[s.loading, { color: '#D93025' }]}>{loadError}</Text>
        <Pressable style={[s.sheetBtn, s.sheetBtnLine]} onPress={onRescan}>
          <Text style={s.sheetBtnLineText}>다시 스캔</Text>
        </Pressable>
      </View>
    );
  if (product === undefined) return <Text style={s.loading}>상품을 찾는 중이에요</Text>;

  const known = product !== null;
  const before = product?.stock ?? 0;
  const date = parseDate(expiry);
  const valid = (known || !!name.trim()) && (expiry === '' || !!date);

  return (
    <View>
      <View style={s.head}>
        <View style={s.img}><Text style={s.imgText}>IMG</Text></View>
        <View style={{ flex: 1 }}>
          {known ? (
            <>
              <View style={s.tag}>
                <Ionicons name="checkmark-circle" size={16} color="#2F7A4E" />
                <Text style={s.tagText}>등록된 상품이에요</Text>
              </View>
              <Text style={s.pName}>{product.name}</Text>
              <Text style={s.pSub}>{product.barcode} · {product.category}</Text>
            </>
          ) : (
            <>
              <Text style={s.pName}>등록되지 않은 상품이에요</Text>
              <Text style={s.pSub}>바코드 {code}</Text>
            </>
          )}
        </View>
      </View>

      {!known && (
        <>
          <View style={s.info}>
            <Ionicons name="alert-circle-outline" size={18} color="#B4561F" />
            <Text style={s.infoText}>정보를 입력하면 관리자에게 등록 알림이 가요.</Text>
          </View>
          <Text style={s.label}>상품명</Text>
          <Field placeholder="예) 빙그레 바나나맛우유 240ml" value={name} onChangeText={setName} style={s.nameInput} />
        </>
      )}

      <Text style={s.label}>입고 수량</Text>
      <Stepper value={qty} onChange={setQty} big />

      <Text style={s.label}>유통기한</Text>
      <View style={s.dateBox}>
        <Ionicons name="calendar-outline" size={22} color={C.text} />
        <TextInput
          style={s.dateInput}
          value={expiry}
          onChangeText={(t) => setExpiry(fmtDate(t))}
          placeholder="YYYY.MM.DD"
          placeholderTextColor="#A3A1B0"
          keyboardType="number-pad"
          maxLength={10}
        />
        {!!date && <Text style={s.weekday}>({DAYS[date.getDay()]})</Text>}
        <View style={{ flex: 1 }} />
        {/* TODO: 촬영 인식(OCR)은 이후 구현 */}
        <Pressable style={s.ocr}>
          <Ionicons name="camera-outline" size={16} color={C.primary} />
          <Text style={s.ocrText}>촬영 인식</Text>
        </Pressable>
      </View>
      {!!date && (
        <View style={s.alert}>
          <Ionicons name="time-outline" size={16} color="#B3261E" />
          <Text style={s.alertText}>{alertText(date, expirationAlertDays)}</Text>
        </View>
      )}

      {known && (
        <View style={s.stock}>
          <View>
            <Text style={s.stockLabel}>현재 재고</Text>
            <Text style={s.stockNum}>{before}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.stockLabel}>입고 후</Text>
            <Text style={s.stockNum}>{before + qty}</Text>
          </View>
        </View>
      )}

      <View style={s.sheetBtns}>
        <Pressable style={[s.sheetBtn, s.sheetBtnLine, { flex: 130 }]} onPress={onRescan}>
          <Text style={s.sheetBtnLineText}>다시 스캔</Text>
        </Pressable>
        <Pressable
          disabled={!valid}
          style={[s.sheetBtn, s.sheetBtnFill, { flex: 176 }, !valid && { opacity: 0.4 }]}
          onPress={() =>
            onAdd({
              barcode: code,
              name: product?.name ?? name.trim(),
              category: product?.category ?? '기타',
              before,
              min: product?.min ?? 0,
              qty,
              expiry,
            })
          }
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.sheetBtnFillText}>목록에 추가</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Review({ items, setItems, userName, error, onBack, onComplete }: { items: Item[]; setItems: (f: (c: Item[]) => Item[]) => void; userName: string; error: string; onBack: () => void; onComplete: () => void }) {
  const total = items.reduce((a, i) => a + i.qty, 0);
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const when = `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAYS[now.getDay()]}요일 · ${p2(now.getHours())}:${p2(now.getMinutes())} · ${userName}`;

  return (
    <View style={s.root}>
      <View style={s.reviewHead}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.reviewTitle}>입고 확인</Text>
      </View>

      <ScrollView contentContainerStyle={s.reviewBody}>
        <Text style={s.when}>{when}</Text>
        <Text style={s.big}>
          <Text style={{ color: C.primary }}>{items.length}개 품목</Text>, {total}개를{'\n'}입고할게요
        </Text>

        <View style={s.card}>
          {items.map((i, idx) => (
            <View key={i.barcode} style={[s.reviewItem, idx > 0 && s.line]}>
              <View style={s.itemTop}>
                <View style={[s.img, { width: 48, height: 48 }]}><Text style={s.imgText}>IMG</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{i.name}</Text>
                  <Text style={s.pSub}>재고 {i.before} → {i.before + i.qty}</Text>
                </View>
                <Pressable hitSlop={10} onPress={() => setItems((cur) => cur.filter((x) => x.barcode !== i.barcode))}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#5E5C6B" />
                </Pressable>
              </View>
              <View style={{ alignSelf: 'flex-end' }}>
                <Stepper value={i.qty} onChange={(q) => setItems((cur) => cur.map((x) => (x.barcode === i.barcode ? { ...x, qty: q } : x)))} />
              </View>
            </View>
          ))}
          {!items.length && <Text style={s.empty}>입고할 상품이 없어요</Text>}
        </View>
      </ScrollView>

      <View style={s.reviewBottom}>
        {!!error && <Text style={s.errorText}>{error}</Text>}
        <Pressable disabled={!items.length} style={[s.btn, s.btnFill, !items.length && { opacity: 0.4 }]} onPress={onComplete}>
          <Ionicons name="clipboard-outline" size={18} color="#fff" />
          <Text style={s.btnFillText}>입고 완료 · {total}개</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  loading: { textAlign: 'center', color: '#828282', paddingVertical: 40 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  img: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F1F0F5', borderWidth: 1, borderColor: '#E4E2EC', alignItems: 'center', justifyContent: 'center' },
  imgText: { fontSize: 9, color: '#A3A1B0' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontSize: 12.5, fontWeight: '700', color: '#2F7A4E' },
  pName: { fontSize: 19, fontWeight: '700', color: C.text, marginTop: 2 },
  pSub: { fontSize: 12.5, color: '#5E5C6B', marginTop: 2 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  infoText: { flex: 1, fontSize: 12, color: '#B4561F' },
  label: { fontSize: 13, fontWeight: '700', color: '#5E5C6B', marginTop: 16, marginBottom: 8 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, borderWidth: 1.6, borderColor: C.primary, borderRadius: 12, paddingLeft: 12, paddingRight: 10 },
  dateInput: { outlineWidth: 0, width: 104, fontSize: 15.5, color: C.text, paddingVertical: 0 },
  weekday: { fontSize: 15.5, color: C.text, marginLeft: -4 },
  nameInput: { height: 50, borderColor: C.primary, borderWidth: 1.6, borderRadius: 12, fontSize: 15.5 },
  sheetBtns: { flexDirection: 'row', gap: 14, marginTop: 20 },
  sheetBtn: { height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  sheetBtnLine: { borderWidth: 0.72, borderColor: '#CFCCDB', backgroundColor: '#fff' },
  sheetBtnLineText: { fontSize: 13.5, fontWeight: '700', color: C.primary },
  sheetBtnFill: { backgroundColor: C.primary },
  sheetBtnFillText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  ocr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, width: 86, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.primary, backgroundColor: '#fff' },
  ocrText: { fontSize: 12.5, fontWeight: '700', color: C.primary },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  alertText: { fontSize: 12.5, color: '#B3261E' },
  stock: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14, marginTop: 16 },
  stockLabel: { fontSize: 12, color: '#fff' },
  stockNum: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 2 },
  btn: { height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnLine: { borderWidth: 1, borderColor: '#CFCCDB', backgroundColor: '#fff' },
  btnLineText: { fontSize: 14.5, fontWeight: '700', color: C.primary },
  btnFill: { backgroundColor: C.primary },
  btnFillText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 56 },
  reviewTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  reviewBody: { paddingHorizontal: 16, paddingBottom: 20 },
  when: { fontSize: 14, color: '#5E5C6B', marginTop: 4 },
  big: { fontSize: 24, fontWeight: '700', color: C.text, lineHeight: 33, marginTop: 4, marginBottom: 18 },
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 14, backgroundColor: '#fff' },
  line: { borderTopWidth: 1, borderTopColor: '#E4E2EC' },
  reviewItem: { padding: 14, gap: 4 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { fontSize: 15, fontWeight: '700', color: C.text },
  empty: { textAlign: 'center', color: '#828282', paddingVertical: 28 },
  errorText: { fontSize: 12.5, color: '#D93025', marginBottom: 8, textAlign: 'center' },
  reviewBottom: { padding: 16, paddingBottom: 24 },

  doneBody: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 20 },
  doneRing: { alignSelf: 'center', width: 92, height: 92, borderRadius: 46, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  doneCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 24, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: 18 },
  doneSub: { fontSize: 14.5, color: '#5E5C6B', textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 34, marginBottom: 12 },
  changeRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  autoText: { fontSize: 11.5, color: '#2F7A4E' },
  change: { fontSize: 14, color: '#5E5C6B' },
  changeNew: { fontWeight: '800', color: C.primary },
  doneBtns: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 24 },
});
