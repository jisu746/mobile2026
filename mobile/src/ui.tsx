import { ReactNode } from 'react';
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

export function Logo({ size, children }: { size: number; children?: ReactNode }) {
  return <Ionicons name="storefront" size={size} color={C.primary} />;
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
});
