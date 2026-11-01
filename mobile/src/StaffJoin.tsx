import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Scanner from './Scanner';
import { Button, C, Field } from './ui';

type Step = 1 | 2 | 3 | 4;
type Props = { step: Step; onStep: (n: Step) => void; onBack: () => void; onDone: (storeName: string) => void };

const CODE_RE = /^[A-Z]{3}-\d{4}$/;

// TODO: 초대코드로 매장 조회는 API 연동 단계에서 교체 (지금은 샘플 매장)
const findStore = (_code: string) => ({ name: '민수네 카페 강남점', sub: '만화카페 · 사장님 이주영' });

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function StaffJoin({ step, onStep, onBack, onDone }: Props) {
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'QR 스캔' | '코드 입력'>('QR 스캔');
  const [requestedAt, setRequestedAt] = useState('');
  const store = findStore(code);

  const request = (m: typeof method) => {
    setMethod(m);
    setRequestedAt(stamp());
    onStep(3);
  };

  // TODO: 임시 자동 승인. 실제로는 관리자 승인 결과를 서버에서 받아 전환
  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => onStep(4), 3000);
    return () => clearTimeout(t);
  }, [step]);

  if (step === 2)
    return (
      <Scanner
        title="매장 QR 스캔"
        onClose={onBack}
        onScan={setCode}
        tag="매장을 찾았어요"
        name={store.name}
        sub={store.sub}
        confirmLabel="참여 요청 보내기"
        onConfirm={() => request('QR 스캔')}
      />
    );

  return (
    <View style={s.root}>
      <Pressable onPress={onBack} hitSlop={12} style={s.back}>
        <Ionicons name="arrow-back" size={24} color={C.text} />
      </Pressable>
      <View style={s.bars}>
        <View style={[s.bar, { backgroundColor: C.primary }]} />
        <View style={[s.bar, step >= 3 && { backgroundColor: C.primary }]} />
      </View>

      {step === 1 && (
        <View style={s.body}>
          <Text style={s.title}>{'근무할 매장에\n참여해 주세요'}</Text>
          <Text style={s.desc}>사장님께 매장 QR 또는 초대 코드를 받아주세요.</Text>

          <View style={s.scanCard}>
            <View style={s.scanIcon}>
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
            </View>
            <Text style={s.scanTitle}>매장 QR 스캔</Text>
            <Text style={s.scanSub}>사장님 휴대폰이나 매장에 붙은 QR을 찍어요</Text>
            <Pressable style={s.scanBtn} onPress={() => onStep(2)}>
              <Ionicons name="camera-outline" size={18} color={C.primary} />
              <Text style={s.scanBtnText}>QR 스캔하기</Text>
            </Pressable>
          </View>

          <View style={s.divider}>
            <View style={s.line} />
            <Text style={s.or}>또는</Text>
            <View style={s.line} />
          </View>

          <Text style={s.label}>초대 코드 입력</Text>
          <View style={s.codeBox}>
            <Ionicons name="card-outline" size={18} color="#828282" />
            <Field
              placeholder="예) DLB-4821"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              style={s.codeInput}
            />
          </View>
          <Pressable
            disabled={!CODE_RE.test(code)}
            onPress={() => request('코드 입력')}
            style={[s.codeBtn, !CODE_RE.test(code) && { opacity: 0.6 }]}
          >
            <Text style={s.codeBtnText}>코드로 참여 요청</Text>
          </Pressable>
        </View>
      )}

      {(step === 3 || step === 4) && (
        <View style={s.body}>
          <Text style={s.title}>{step === 3 ? '사장님의 승인을\n기다리고 있어요' : '승인 됐어요!\n이제 함께 일해요'}</Text>
          <Text style={s.desc}>
            {step === 3 ? '승인되면 알림으로 알려드려요. 이 화면을 닫아도 괜찮아요.' : '배정된 근무 파트와 오늘의 업무를 확인할 수 있어요.'}
          </Text>

          <View style={s.circleWrap}>
            <View style={[s.circle, step === 4 && { borderColor: C.primary, borderWidth: 2 }]}>
              <Ionicons name="storefront" size={64} color={C.primary} />
            </View>
            {step === 4 && (
              <View style={s.check}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </View>
            )}
          </View>

          <View style={s.table}>
            <Row label="매장" value={store.name} />
            <Row label="요청 방식" value={`${method} · ${requestedAt}`} line />
            <Row label="근무 파트" value={step === 3 ? '승인 시 배정' : '오후 파트 (17:00~22:00)'} line />
          </View>

          {step === 4 && (
            <View style={{ marginTop: 16 }}>
              <Button label="확인했어요" onPress={() => onDone(store.name)} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function Row({ label, value, line }: { label: string; value: string; line?: boolean }) {
  return (
    <View style={[s.row, line && s.rowLine]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  back: { marginLeft: 16, marginTop: 14, width: 32 },
  bars: { flexDirection: 'row', gap: 6, marginHorizontal: 20, marginTop: 14 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ECEAF7' },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 22.5, fontWeight: '700', color: C.text, lineHeight: 32, letterSpacing: -0.6 },
  desc: { fontSize: 12.5, color: '#5E5C6B', marginTop: 8 },
  scanCard: { backgroundColor: C.primary, borderRadius: 18, padding: 18, marginTop: 22 },
  scanIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  scanTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 14 },
  scanSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, marginTop: 4 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 23, backgroundColor: '#fff', marginTop: 16 },
  scanBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: '#E6E6E6' },
  or: { fontSize: 12, color: '#828282' },
  label: { fontSize: 12.3, fontWeight: '600', color: '#5E5C6B', marginBottom: 8 },
  codeBox: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingLeft: 14 },
  codeInput: { flex: 1, minWidth: 0, borderWidth: 0, height: 50 },
  codeBtn: { height: 48, borderRadius: 24, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  codeBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
  circleWrap: { alignSelf: 'center', marginVertical: 34 },
  circle: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#F0EEF8', borderWidth: 1, borderColor: '#E3E0F2', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', right: 6, bottom: 6, width: 34, height: 34, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  table: { borderWidth: 1, borderColor: '#E6E4EE', borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', height: 46, paddingHorizontal: 14 },
  rowLine: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  rowLabel: { width: 76, fontSize: 12, color: '#828282' },
  rowValue: { flex: 1, fontSize: 12.5, fontWeight: '700', color: C.text },
});
