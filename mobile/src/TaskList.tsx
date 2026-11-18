// 업무 목록 화면 (재고 기반 업무 + 일반 업무)
import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from './tasks';
import { C } from './ui';

// 재고에서 만든 업무 뒤에 붙는 일반 업무 (완료 표시가 없다)
const GENERAL: { id: string; title: string; sub?: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'general:seat', title: '좌석 정리', icon: 'checkmark-circle-outline' },
];

type Props = { tasks: Task[]; done: string[]; onToggle: (id: string) => void; onBack: () => void };

export default function TaskList({ tasks, done, onToggle, onBack }: Props) {
  const TASKS: { id: string; title: string; sub?: string; icon: keyof typeof Ionicons.glyphMap }[] = [...tasks, ...GENERAL];
  // 안드로이드 뒤로가기로 업무 목록만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>업무</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.card}>
          {TASKS.map((t, i) => {
            const d = done.includes(t.id);
            return (
              <View key={t.id} style={[s.row, i > 0 && s.line]}>
                <View style={s.icon}>
                  <Ionicons name={t.icon} size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, d && s.nameDone]}>{t.title}</Text>
                  {!!t.sub && <Text style={s.sub}>{t.sub}</Text>}
                </View>
                {t.sub ? (
                  <Pressable style={[s.doneBtn, d && { opacity: 0.45 }]} onPress={() => onToggle(t.id)}>
                    <Text style={s.doneText}>완료</Text>
                  </Pressable>
                ) : (
                  <View style={s.tag}>
                    <Text style={s.tagText}>일반</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 56 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderWidth: 1, borderColor: '#E6E4EE', borderRadius: 14, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 60 },
  line: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F1FA', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14.5, fontWeight: '700', color: C.text },
  nameDone: { color: '#A3A1B0', textDecorationLine: 'line-through' },
  sub: { fontSize: 11.5, color: '#828282', marginTop: 2 },
  doneBtn: { backgroundColor: C.primary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  doneText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  tag: { backgroundColor: '#F1F0F5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 10.5, fontWeight: '700', color: '#5E5C6B' },
});
