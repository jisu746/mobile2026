// 공통 색상과 화면 부품 (알약, 입력칸, 버튼, 수량 조절, 하단 탭)
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const C = {
  primary: '#4A418D',
  border: '#CFCCDB',
  pill: '#F6F6F6',
  text: '#1C1B22',
  placeholder: '#828282',
};

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.pill, active ? s.pillOn : s.pillOff]}>
      <Text style={[s.pillText, { color: active ? '#fff' : C.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.placeholder} autoCapitalize="none" {...props} style={[s.field, props.style]} />;
}

export function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.button, disabled && { opacity: 0.4 }]}>
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}

// 회원가입 상단: 흐린 로고 + StoreMate 워드마크
export function SignupHeader() {
  return (
    <View style={s.header}>
      <Ionicons name="storefront" size={56} color={C.primary} style={{ opacity: 0.12 }} />
      <Text style={s.headerText}>StoreMate</Text>
    </View>
  );
}

// 수량 증감 (− 12 개 +)
export function Stepper({ value, onChange, big, min = 1 }: { value: number; onChange: (n: number) => void; big?: boolean; min?: number }) {
  const size = big ? 48 : 32;
  const btn = { width: size, height: size, borderRadius: big ? 24 : 10 };
  return (
    <View style={s.stepper}>
      <Pressable style={[s.stepBtn, btn]} onPress={() => onChange(Math.max(min, value - 1))}>
        <Ionicons name="remove" size={big ? 26 : 16} color={C.primary} />
      </Pressable>
      <Text style={big ? s.qtyBig : s.qty}>
        {value}
        <Text style={s.unit}> 개</Text>
      </Text>
      <Pressable style={[s.stepBtn, btn]} onPress={() => onChange(value + 1)}>
        <Ionicons name="add" size={big ? 26 : 16} color={C.primary} />
      </Pressable>
    </View>
  );
}

export type TabItem = { label: string; icon: keyof typeof Ionicons.glyphMap };

// 하단 탭 바 (사장님·직원 홈 공통)
export function TabBar({ tabs, active, onChange }: { tabs: TabItem[]; active: number; onChange: (i: number) => void }) {
  return (
    <View style={s.bar}>
      {tabs.map((t, i) => (
        <Pressable key={t.label} style={s.tab} onPress={() => onChange(i)}>
          <View style={[s.iconWrap, active === i && s.iconWrapOn]}>
            <Ionicons name={t.icon} size={22} color={active === i ? C.primary : '#8A8896'} />
          </View>
          <Text style={[s.tabText, active === i && { color: C.primary, fontWeight: '700' }]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  pillOn: { backgroundColor: C.primary, borderColor: C.primary },
  pillOff: { backgroundColor: '#fff', borderColor: '#E6E6E6' },
  pillText: { fontSize: 14, fontWeight: '500' },
  field: {
    height: 52,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: C.text,
  },
  button: { height: 44, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  headerText: { position: 'absolute', left: 20, top: 24, fontSize: 16, fontWeight: '800', color: C.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  qtyBig: { fontSize: 26, fontWeight: '700', color: C.text, minWidth: 64, textAlign: 'center' },
  qty: { fontSize: 16, fontWeight: '700', color: C.text, minWidth: 44, textAlign: 'center' },
  unit: { fontSize: 14, fontWeight: '400', color: '#5E5C6B' },
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEEDF3', backgroundColor: '#fff', paddingVertical: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: '#ECEAF7' },
  tabText: { fontSize: 10.5, color: '#8A8896' },
});
