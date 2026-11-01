import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Button, C, Field } from './ui';

type Step = 1 | 2 | 3;
// onBack은 매장을 추가로 등록할 때만 전달된다
type Props = { step: Step; onStep: (n: Step) => void; onBack?: () => void; onDone: (store: { name: string; type: string }) => void };

const TYPES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: '카페', icon: 'cafe-outline' },
  { label: '만화카페', icon: 'book-outline' },
  { label: '소매점', icon: 'bag-handle-outline' },
  { label: '음식점', icon: 'restaurant-outline' },
  { label: '기타', icon: 'ellipsis-horizontal' },
];
const PARTS = [
  { name: '오전 파트', time: '10:00 ~ 14:00' },
  { name: '오후 파트', time: '14:00 ~ 20:00' },
  { name: '마감 파트', time: '18:00 ~ 24:00' },
];
const TIME_RE = /^([01]\d|2[0-3]|24):[0-5]\d$/;

// 임시 코드: 실제 초대코드는 서버에서 발급(API 연동 단계)
const makeCode = () =>
  Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('') +
  '-' +
  String(Math.floor(1000 + Math.random() * 9000));

export default function StoreSetup({ step, onStep, onBack, onDone }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [branch, setBranch] = useState('');
  const [addr, setAddr] = useState('');
  const [addr2, setAddr2] = useState('');
  const [open, setOpen] = useState('10:00');
  const [close, setClose] = useState('24:00');
  const [code] = useState(makeCode);

  const ok = step === 1 ? !!name.trim() && !!type && !!addr.trim() : step === 2 ? TIME_RE.test(open) && TIME_RE.test(close) : true;
  const storeName = `${name}${branch ? ' ' + branch : ''}`;

  return (
    <View style={s.root}>
      {onBack && step === 1 && (
        <Pressable onPress={onBack} hitSlop={12} style={s.back}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
      )}
      <Ionicons name="storefront" size={44} color={C.primary} style={s.logo} />
      <View style={s.bars}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[s.bar, n <= step && { backgroundColor: C.primary }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            <Text style={s.title}>매장 정보를 입력해 주세요</Text>
            <Text style={s.label}>매장 이름</Text>
            <Field placeholder="예) 민수네 카페" value={name} onChangeText={setName} style={name ? s.active : undefined} />

            <Text style={s.label}>업종</Text>
            <View style={s.chips}>
              {TYPES.map((t) => {
                const on = type === t.label;
                return (
                  <Pressable key={t.label} onPress={() => setType(t.label)} style={[s.chip, on && s.chipOn]}>
                    <Ionicons name={t.icon} size={18} color={on ? '#fff' : '#5E5C6B'} />
                    <Text style={[s.chipText, on && { color: '#fff' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.label}>지점명 (선택)</Text>
            <Field placeholder="예) 강남점" value={branch} onChangeText={setBranch} />

            <Text style={s.label}>매장 주소</Text>
            <View style={s.search}>
              <Ionicons name="search" size={20} color="#5E5C6B" />
              <Field placeholder="주소를 검색하세요" value={addr} onChangeText={setAddr} style={s.searchInput} />
            </View>

            <Text style={s.label}>상세 주소</Text>
            <Field placeholder="예) 3층" value={addr2} onChangeText={setAddr2} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.title}>운영 방식을 알려주세요</Text>
            <Text style={s.desc}>근무 파트와 알림 기준은 업무 자동 생성에 사용돼요.</Text>

            <Text style={s.label}>영업 시간</Text>
            <View style={s.hours}>
              <Field value={open} onChangeText={setOpen} style={s.time} maxLength={5} />
              <Text style={s.dash}>-</Text>
              <Field value={close} onChangeText={setClose} style={s.time} maxLength={5} />
            </View>

            <View style={s.rowHead}>
              <Text style={s.label}>근무 파트 (지금 꼭 입력할 필요는 없어요)</Text>
              <Text style={s.add}>+ 추가</Text>
            </View>
            <View style={s.card}>
              {PARTS.map((p, i) => (
                <View key={p.name} style={[s.row, i > 0 && s.rowLine]}>
                  <Text style={s.rowTitle}>{p.name}</Text>
                  <Text style={s.rowSub}>{p.time} &gt;</Text>
                </View>
              ))}
            </View>

            <Text style={[s.label, { marginTop: 20 }]}>알림 기준</Text>
            <View style={s.card}>
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <Ionicons name="time-outline" size={18} color={C.primary} />
                  <Text style={s.rowTitle}>유통기한 임박 알림</Text>
                </View>
                <Text style={s.rowValue}>D-3</Text>
              </View>
              <View style={[s.row, s.rowLine]}>
                <View style={s.rowLeft}>
                  <Ionicons name="clipboard-outline" size={18} color={C.primary} />
                  <Text style={s.rowTitle}>재고 부족 기준</Text>
                </View>
                <Text style={s.rowValue}>적정 재고의 30%</Text>
              </View>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.title}>{'매장 등록이 완료됐어요.\n직원을 초대해 보세요'}</Text>
            <Text style={s.desc}>직원이 이 QR을 찍거나 초대 코드를 입력하면 참여 요청이 와요.</Text>

            <View style={s.invite}>
              <View style={s.storeRow}>
                <Ionicons name="storefront" size={14} color={C.primary} />
                <Text style={s.storeName}>{storeName}</Text>
              </View>
              <View style={s.qr}>
                <QRCode value={code} size={150} color="#1C1B22" backgroundColor="transparent" />
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
              {/* TODO: QR 이미지 저장은 미디어 권한이 필요해 이후 구현 */}
              <Pressable style={[s.action, s.actionLine]}>
                <Ionicons name="download-outline" size={16} color={C.primary} />
                <Text style={s.actionText}>QR 저장</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <View style={s.bottom}>
        <Button
          label={step === 3 ? '확인했어요' : '다음'}
          disabled={!ok}
          onPress={() => (step === 3 ? onDone({ name: storeName, type }) : onStep((step + 1) as Step))}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  back: { marginLeft: 16, marginTop: 14, width: 32 },
  logo: { marginLeft: 20, marginTop: 16 },
  bars: { flexDirection: 'row', gap: 6, marginHorizontal: 20, marginTop: 14 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#ECEAF7' },
  body: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16 },
  title: { fontSize: 22.5, fontWeight: '700', color: C.text, lineHeight: 32, letterSpacing: -0.6, marginBottom: 8 },
  desc: { fontSize: 12.5, color: '#5E5C6B', marginBottom: 6 },
  label: { fontSize: 12.3, fontWeight: '600', color: '#5E5C6B', marginTop: 16, marginBottom: 8 },
  active: { borderColor: C.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13.2, fontWeight: '600', color: C.text },
  search: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingLeft: 14 },
  searchInput: { flex: 1, minWidth: 0, borderWidth: 0, height: 50 },
  hours: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { flex: 1, minWidth: 0, paddingHorizontal: 4, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  dash: { color: '#828282' },
  rowHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  add: { fontSize: 12, fontWeight: '600', color: C.primary, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#E6E4EE', borderRadius: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 48 },
  rowLine: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 13.5, fontWeight: '600', color: C.text },
  rowSub: { fontSize: 12, color: '#828282' },
  rowValue: { fontSize: 12.5, fontWeight: '700', color: C.primary },
  invite: { borderWidth: 1, borderColor: '#E6E4EE', borderRadius: 16, alignItems: 'center', paddingVertical: 18, marginTop: 14 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 13, fontWeight: '700', color: C.text },
  qr: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: '#F6F6F8' },
  codeLabel: { fontSize: 10, color: '#828282', marginTop: 14 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  code: { fontSize: 26, fontWeight: '800', letterSpacing: 3, color: C.primary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionLine: { borderWidth: 1, borderColor: '#E6E4EE', backgroundColor: '#fff' },
  actionText: { fontSize: 13, fontWeight: '600', color: C.primary },
  bottom: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
});
