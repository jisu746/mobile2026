// 공통 색상과 화면 부품 (알약, 입력칸, 버튼, 수량 조절, 하단 탭)
import { useEffect, useState } from 'react';
import { Image, Keyboard, Platform, Pressable, StyleSheet, TextInputProps, View } from 'react-native';
import { Text, TextInput } from './font';
import { Ionicons } from '@expo/vector-icons';

export const C = {
  primary: '#4A418D',
  border: '#CFCCDB',
  pill: '#F6F6F6',
  text: '#1C1B22',
  placeholder: '#828282',
};

export function Pill({
  label,
  active,
  onPress,
  fontFamily,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  fontFamily?: string;
}) {
  return (
    <Pressable onPress={onPress} style={[s.pill, active ? s.pillOn : s.pillOff]}>
      <Text style={[s.pillText, fontFamily ? { fontFamily } : undefined, { color: active ? '#fff' : C.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  return (
    <TextInput placeholderTextColor={C.placeholder} autoCapitalize="none" {...props} style={[s.field, props.style]} />
  );
}

export function Button({
  label,
  onPress,
  disabled,
  fontFamily,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  fontFamily?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.button, disabled && { opacity: 0.4 }]}>
      <Text style={[s.buttonText, fontFamily ? { fontFamily } : undefined]}>{label}</Text>
    </Pressable>
  );
}

// 회원가입 상단: 앱 아이콘을 연하게 깔고 워드마크를 겹쳐 배치
export function SignupHeader() {
  return (
    <View pointerEvents="none" style={s.header}>
      <Image
        source={require('../assets/storemate-store-icon.png')}
        style={s.headerLogo}
        resizeMode="contain"
        accessibilityLabel="StoreMate 앱 로고"
      />
      <Text style={s.headerText}>StoreMate</Text>
    </View>
  );
}

// 수량 증감 (− 12 개 +)
export function Stepper({
  value,
  onChange,
  big,
  min = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  big?: boolean;
  min?: number;
}) {
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
  const [keyboardVisible, setKeyboardVisible] = useState(() => Platform.OS === 'android' && Keyboard.isVisible());
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboardVisible) return null;
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

export function BellButton({ onPress, unread, size = 24 }: { onPress: () => void; unread?: boolean; size?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ position: 'relative' }}>
      <Ionicons name="notifications-outline" size={size} color={C.primary} />
      {!!unread && <View style={s.bellDot} />}
    </Pressable>
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
  header: {
    width: 112,
    height: 76,
    marginLeft: -12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: { position: 'absolute', width: 104, height: 104, top: -20, opacity: 0.12 },
  headerText: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: C.primary,
    fontFamily: 'NotoSansKR',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  qtyBig: {
    lineHeight: 34,
    includeFontPadding: false,
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    minWidth: 64,
    textAlign: 'center',
  },
  qty: {
    lineHeight: 24,
    includeFontPadding: false,
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    minWidth: 44,
    textAlign: 'center',
  },
  unit: { fontSize: 14, fontWeight: '400', color: '#5E5C6B' },
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEEDF3',
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: '#ECEAF7' },
  tabText: { fontSize: 10.5, color: '#8A8896' },
  bellDot: {
    position: 'absolute',
    top: 0.5,
    right: 0.5,
    width: 6,
    height: 6,
    borderRadius: 3.5,
    backgroundColor: '#671d57',
  },
});
