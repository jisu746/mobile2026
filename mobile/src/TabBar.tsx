import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

export type TabItem = { label: string; icon: keyof typeof Ionicons.glyphMap };

export default function TabBar({ tabs, active, onChange }: { tabs: TabItem[]; active: number; onChange: (i: number) => void }) {
  return (
    <View style={s.bar}>
      {tabs.map((t, i) => (
        <Pressable key={t.label} style={s.tab} onPress={() => onChange(i)}>
          <View style={[s.iconWrap, active === i && s.iconWrapOn]}>
            <Ionicons name={t.icon} size={22} color={active === i ? C.primary : '#8A8896'} />
          </View>
          <Text style={[s.text, active === i && { color: C.primary, fontWeight: '700' }]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEEDF3', backgroundColor: '#fff', paddingVertical: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: '#ECEAF7' },
  text: { fontSize: 10.5, color: '#8A8896' },
});
