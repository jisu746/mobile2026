import QrSaveButton from './QrSaveButton';
// 사장님 첫 로그인 매장 등록 화면 (매장 정보 입력 → 초대 QR/코드)
import { useState } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text } from './font';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { C, Field } from './ui';
import type { WorkPartSetting } from './storeSetupRepository';

type Step = 1 | 2 | 3;
// onBack은 매장을 추가로 등록할 때만 전달된다
export type NewStore = { name: string; type: string; branch: string; address: string; addressDetail: string; openTime: string; closeTime: string; workParts: WorkPartSetting[]; expirationAlertDays: number; lowStockThresholdCount: number };
// onCreate는 서버에 매장을 등록하고 초대 코드를 돌려준다
type Props = { step: Step; onStep: (n: Step) => void; onBack?: () => void; onCreate: (s: NewStore) => Promise<string>; onDone: () => void };

const TYPES: { label: string; icon: keyof typeof MaterialIcons.glyphMap; width: number }[] = [
  { label: '카페', icon: 'local-cafe', width: 70 },
  { label: '만화카페', icon: 'menu-book', width: 97 },
  { label: '소매점', icon: 'shopping-basket', width: 81 },
  { label: '음식점', icon: 'restaurant', width: 80 },
  { label: '화장품', icon: 'face', width: 81 },
  { label: '의류점', icon: 'checkroom', width: 81 },
  { label: '기타', icon: 'more-horiz', width: 70 },
];
const DEFAULT_PARTS: WorkPartSetting[] = [
  { id: 'morning', name: '오전 파트', start: '10:00', end: '14:00' },
  { id: 'afternoon', name: '오후 파트', start: '14:00', end: '20:00' },
  { id: 'closing', name: '마감 파트', start: '18:00', end: '24:00' },
];
const TIME_RE = /^([01]\d|2[0-3]|24):[0-5]\d$/;

export default function StoreSetup({ step, onStep, onBack, onCreate, onDone }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [branch, setBranch] = useState('');
  const [addr, setAddr] = useState('');
  const [addr2, setAddr2] = useState('');
  const [open, setOpen] = useState('10:00');
  const [close, setClose] = useState('24:00');
  const [workParts, setWorkParts] = useState<WorkPartSetting[]>(DEFAULT_PARTS.map((part) => ({ ...part })));
  const [expirationAlertDays, setExpirationAlertDays] = useState(3);
  const [lowStockThresholdCount, setLowStockThresholdCount] = useState(3);
  const [code, setCode] = useState(''); // 서버가 발급한 초대 코드 (등록 전에는 비어 있다)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ok = step === 1 ? !!name.trim() && !!type && /^\d{5}$/.test(addr) : step === 2 ? TIME_RE.test(open) && TIME_RE.test(close) && workParts.every((part) => !!part.name.trim() && TIME_RE.test(part.start) && TIME_RE.test(part.end)) : true;
  const storeName = `${name}${branch ? ' ' + branch : ''}`;
  const updateWorkPart = (id: string, values: Partial<WorkPartSetting>) => setWorkParts((current) => current.map((part) => part.id === id ? { ...part, ...values } : part));
  const addWorkPart = () => setWorkParts((current) => [...current, { id: `custom-${Date.now()}-${current.length}`, name: `새 파트 ${current.length + 1}`, start: '10:00', end: '14:00' }]);
  const removeWorkPart = (id: string) => setWorkParts((current) => current.filter((part) => part.id !== id));

  // 2단계에서 다음을 누르면 매장을 등록한다. 이미 등록했다면(뒤로 갔다가 다시 온 경우) 다시 만들지 않는다.
  const next = async () => {
    if (step === 3) return onDone();
    if (step === 2 && !code) {
      setBusy(true);
      setError('');
      try {
        setCode(await onCreate({ name: name.trim(), type, branch: branch.trim(), address: addr.trim(), addressDetail: addr2.trim(), openTime: open, closeTime: close, workParts, expirationAlertDays, lowStockThresholdCount }));
      } catch (e) {
        setError(e instanceof Error ? e.message : '매장을 등록하지 못했어요');
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    onStep((step + 1) as Step);
  };

  return (
    <View style={s.root}>
      {onBack && step === 1 && (
        <Pressable onPress={onBack} hitSlop={12} style={s.back}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
      )}
      <View style={[s.firstHeader, step === 3 && s.completeHeader]}>
        <Image source={require('../assets/storemate-logo.png')} style={s.firstLogo} resizeMode="cover" accessibilityLabel="StoreMate" />
        <View style={[s.firstBars, step === 2 && s.operatingBars, step === 3 && s.completeBars]}>
          {[1, 2, 3].map((n) => <View key={n} style={[s.bar, n <= step && { backgroundColor: C.primary }]} />)}
        </View>
      </View>

      <ScrollView key={step} contentContainerStyle={step === 1 ? s.firstBody : step === 2 ? s.operatingBody : s.completeBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={s.firstForm}>
            <Text style={[s.title, s.firstTitle]}>매장 정보를 입력해 주세요</Text>
            <Text style={[s.label, s.firstLabel]}>매장 이름</Text>
            <Field placeholder="예) 민수네 카페" value={name} onChangeText={setName} style={[s.firstField, name ? s.active : undefined]} />

            <Text style={s.label}>업종</Text>
            <View style={s.chips}>
              {TYPES.map((t) => {
                const on = type === t.label;
                return (
                  <Pressable key={t.label} onPress={() => setType(t.label)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.chip, { width: t.width }, on && s.chipOn]}>
                    <MaterialIcons name={t.icon} size={18} color={on ? '#fff' : '#5E5C6B'} />
                    <Text style={[s.chipText, on && { color: '#fff' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.label}>지점명 (선택)</Text>
            <Field placeholder="예) 강남점" value={branch} onChangeText={setBranch} style={s.firstField} />

            <Text style={s.label}>매장 주소</Text>
            <View style={s.search}>
              <Field placeholder="우편번호 5자리를 입력하세요" value={addr} onChangeText={(value) => setAddr(value.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" maxLength={5} style={[s.searchInput, s.firstField]} />
            </View>

            <Text style={s.label}>상세 주소</Text>
            <Field placeholder="예) 3층" value={addr2} onChangeText={setAddr2} style={s.firstField} />
          </View>
        )}

        {step === 2 && (
          <View style={s.operatingForm}>
            <Text style={[s.title, s.operatingTitle]}>운영 방식을 알려주세요</Text>
            <Text style={[s.desc, s.operatingDesc]}>근무 파트와 알림 기준은 업무 자동 생성에 사용돼요.</Text>

            <Text style={[s.label, s.hoursLabel]}>영업 시간</Text>
            <View style={s.hours}>
              <Field value={open} onChangeText={setOpen} style={[s.time, s.firstField]} maxLength={5} />
              <Text style={s.dash}>–</Text>
              <Field value={close} onChangeText={setClose} style={[s.time, s.firstField]} maxLength={5} />
            </View>

            <View style={s.rowHead}>
              <Text style={[s.label, s.partsLabel]}>근무 파트 (지금 꼭 입력할 필요는 없어요)</Text>
              <Pressable onPress={addWorkPart} hitSlop={8}><Text style={s.add}>+ 추가</Text></Pressable>
            </View>
            <View style={s.card}>
              {workParts.map((part, i) => (
                <View key={part.id} style={[s.partItem, i > 0 && s.rowLine]}>
                  <View style={s.partNameRow}>
                    <Field value={part.name} onChangeText={(value) => updateWorkPart(part.id, { name: value })} placeholder="파트 이름" style={s.partNameInput} maxLength={20} />
                    <Pressable accessibilityRole="button" accessibilityLabel={`${part.name} 삭제`} onPress={() => removeWorkPart(part.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color="#828282" />
                    </Pressable>
                  </View>
                  <View style={s.partTimeRow}>
                    <Text style={s.partTimeLabel}>근무 시간</Text>
                    <Field value={part.start} onChangeText={(value) => updateWorkPart(part.id, { start: value.replace(/[^0-9:]/g, '').slice(0, 5) })} keyboardType="numbers-and-punctuation" maxLength={5} style={s.partTimeInput} />
                    <Text style={s.dash}>–</Text>
                    <Field value={part.end} onChangeText={(value) => updateWorkPart(part.id, { end: value.replace(/[^0-9:]/g, '').slice(0, 5) })} keyboardType="numbers-and-punctuation" maxLength={5} style={s.partTimeInput} />
                  </View>
                </View>
              ))}
              {!workParts.length && <Text style={s.noParts}>근무 파트를 추가해 주세요.</Text>}
            </View>

            <Text style={[s.label, { marginTop: 20, lineHeight: 17 }]}>알림 기준</Text>
            <View style={s.card}>
              <View style={s.settingBlock}>
                <View style={s.rowLeft}>
                  <Ionicons name="time-outline" size={18} color={C.primary} />
                  <Text style={s.rowTitle}>유통기한 임박 알림</Text>
                </View>
                <View style={s.settingChoices}>
                  {[1, 3, 5, 7].map((days) => <Pressable key={days} onPress={() => setExpirationAlertDays(days)} style={[s.choice, expirationAlertDays === days && s.choiceActive]}><Text style={[s.choiceText, expirationAlertDays === days && s.choiceTextActive]}>D-{days}</Text></Pressable>)}
                </View>
              </View>
              <View style={[s.settingBlock, s.rowLine]}>
                <View style={s.rowLeft}>
                  <Ionicons name="clipboard-outline" size={18} color={C.primary} />
                  <Text style={s.rowTitle}>재고 부족 기준</Text>
                </View>
                <View style={s.settingChoices}>
                  {[3, 5, 7, 10].map((count) => <Pressable key={count} onPress={() => setLowStockThresholdCount(count)} style={[s.choice, lowStockThresholdCount === count && s.choiceActive]}><Text style={[s.choiceText, lowStockThresholdCount === count && s.choiceTextActive]}>{count}개 이하</Text></Pressable>)}
                </View>
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <>
            <Text style={s.title}>{'매장 등록이 완료됐어요.\n직원을 초대해 보세요'}</Text>
            <Text style={s.desc}>직원이 이 QR을 찍거나 초대 코드를 입력하면 참여 요청이 와요.</Text>

            <View style={s.invite}>
              <View style={s.storeRow}>
                <Image source={require('../assets/storemate-store-icon.png')} style={s.storeIcon} resizeMode="contain" />
                <Text style={s.storeName}>{storeName}</Text>
              </View>
              <View style={s.qr}>
                <QRCode value={code} size={174} quietZone={12} color="#1C1B22" backgroundColor="#fff" />
              </View>
              <Text style={s.codeLabel}>초대 코드</Text>
              <Pressable style={s.codeRow} onPress={() => Clipboard.setStringAsync(code)}>
                <Text style={s.code}>{code}</Text>
                <Ionicons name="copy-outline" size={16} color={C.primary} />
              </Pressable>
            </View>

            <View style={s.actions}>
              <Pressable
                style={[s.action, { backgroundColor: '#ECEAF7' }]}
                onPress={() => Share.share({ message: `[${storeName}] StoreMate 초대 코드: ${code}` })}
              >
                <Ionicons name="share-social-outline" size={16} color={C.primary} />
                <Text style={s.actionText}>공유하기</Text>
              </Pressable>
              <QrSaveButton code={code}/>
            </View>
          </>
        )}
        <View style={step === 3 ? s.completeBottom : s.firstBottom}>
          {!!error && <Text style={s.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={step === 3 ? '시작하기' : '다음'} disabled={!ok || busy} onPress={next} style={[s.continueButton, (!ok || busy) && { opacity: 0.4 }]}>
            <Text style={s.continueText}>{step === 3 ? '시작하기' : busy ? '등록하는 중...' : '다음'}</Text>
          </Pressable>
        </View>
      </ScrollView>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  back: { marginLeft: 16, marginTop: 14, width: 32 },
  error: { fontSize: 12.5, color: '#D93025', marginBottom: 8 },
  firstHeader: { height: 110 },
  firstLogo: { position: 'absolute', left: 6, top: 25, width: 85, height: 85 },
  firstBars: { flexDirection: 'row', gap: 5, marginLeft: 17, marginRight: 35, marginTop: 106 },
  firstBody: { paddingHorizontal: 14, paddingTop: 23, paddingBottom: 24 },
  firstForm: { minHeight: 660 },
  firstTitle: { marginLeft: 3, lineHeight: 34, marginBottom: 0 },
  firstLabel: { marginTop: 24 },
  firstField: { outlineWidth: 0 },
  firstBottom: { paddingTop: 8 },
  operatingBars: { marginLeft: 23, marginRight: 28, marginTop: 107 },
  operatingBody: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 39 },
  operatingForm: { minHeight: 650 },
  operatingTitle: { marginLeft: 3, lineHeight: 32.4, marginBottom: 8 },
  operatingDesc: { marginLeft: 3, fontSize: 13.8, lineHeight: 21.75, marginBottom: 0 },
  hoursLabel: { marginTop: 16, lineHeight: 17 },
  partsLabel: { marginTop: 22, lineHeight: 17 },
  completeHeader: { height: 107 },
  completeBars: { marginLeft: 27, marginRight: 26, marginTop: 103 },
  completeBody: { paddingHorizontal: 24, paddingTop: 25, paddingBottom: 39 },
  completeBottom: { marginHorizontal: -5, paddingTop: 22 },
  continueButton: { height: 52, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  continueText: { fontSize: 15.1, fontWeight: '600', color: '#fff' },
  storeIcon: { width: 26, height: 26 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#ECEAF7' },
  title: { fontSize: 22.5, fontWeight: '700', color: C.text, lineHeight: 32, letterSpacing: -0.6, marginBottom: 8 },
  desc: { fontSize: 13.8, lineHeight: 21.75, color: '#5E5C6B', marginBottom: 6 },
  label: { fontSize: 12.3, fontWeight: '600', color: '#5E5C6B', marginTop: 16, marginBottom: 8 },
  active: { borderColor: C.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13.2, fontWeight: '600', color: C.text },
  search: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingLeft: 0 },
  searchInput: { flex: 1, minWidth: 0, borderWidth: 0, height: 50 },
  hours: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  time: { height: 54, flex: 1, minWidth: 0, paddingHorizontal: 4, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  dash: { color: '#828282' },
  rowHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  add: { fontSize: 12, fontWeight: '600', color: C.primary, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden' },
  partItem: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  partNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partNameInput: { flex: 1, minWidth: 0, height: 38, fontSize: 14, fontWeight: '700', paddingHorizontal: 10 },
  partTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partTimeLabel: { width: 62, fontSize: 12, color: '#5E5C6B' },
  partTimeInput: { flex: 1, minWidth: 0, height: 38, fontSize: 13, textAlign: 'center', paddingHorizontal: 4 },
  noParts: { padding: 16, color: '#828282', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 49 },
  rowLine: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  settingBlock: { padding: 14, gap: 10 },
  settingChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minWidth: 56, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  choiceActive: { borderColor: C.primary, backgroundColor: C.primary },
  choiceText: { color: C.primary, fontSize: 12.5, fontWeight: '600' },
  choiceTextActive: { color: '#fff' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14.2, fontWeight: '600', color: C.text },
  rowSub: { fontSize: 14, color: '#5E5C6B' },
  rowValue: { fontSize: 13.7, fontWeight: '700', color: C.primary },
  invite: { height: 360, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 20, alignItems: 'center', paddingTop: 24, marginTop: 16 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 15, fontWeight: '700', color: C.text },
  qr: { marginTop: 18, width: 202, height: 202, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', overflow: 'hidden' },
  codeLabel: { fontSize: 11.9, lineHeight: 30, color: '#828282', marginTop: 14 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  code: { fontSize: 26, fontWeight: '800', letterSpacing: 4, color: C.primary },
  actions: { flexDirection: 'row', gap: 6, marginTop: 12 },
  action: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionLine: { borderWidth: 1, borderColor: '#E6E4EE', backgroundColor: '#fff' },
  actionText: { fontSize: 14.1, fontWeight: '600', color: C.primary },
});
