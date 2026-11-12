import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

// 수량 증감 (− 12 개 +)
export default function Stepper({ value, onChange, big, min = 1 }: { value: number; onChange: (n: number) => void; big?: boolean; min?: number }) {
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

const s = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  qtyBig: { fontSize: 26, fontWeight: '700', color: C.text, minWidth: 64, textAlign: 'center' },
  qty: { fontSize: 16, fontWeight: '700', color: C.text, minWidth: 44, textAlign: 'center' },
  unit: { fontSize: 14, fontWeight: '400', color: '#5E5C6B' },
});
