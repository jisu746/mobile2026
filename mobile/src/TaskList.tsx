// 업무 목록 화면 (재고 기반 업무 + 일반 업무)
import { useEffect } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './font';
import { Ionicons } from '@expo/vector-icons';
import { Task } from './tasks';
import { C } from './ui';

// 재고에서 만든 업무 뒤에 붙는 일반 업무 (완료 표시가 없다)
type Item = { id: string, kind: Task['kind'] | 'general'; title: string, sub?: string; icon: keyof typeof Ionicons.glyphMap };
const GENERAL: Item[] = [
  { id: 'general:seat', kind: 'general', title: '좌석 정리', icon: 'checkmark-circle-outline' },
];

const SECTIONS: {kind: Item['kind']; title: string; accent: string }[] = [
  { kind: 'expired', title: '폐기 처리', accent: '#671d57' },
  { kind: 'soon', title: '유통기한 확인', accent: '#671d57' },
  { kind: 'low', title: '발주 필요', accent: C.primary },
  { kind: 'custom', title: '추가 업무', accent: C.primary },
  { kind: 'general', title: '일반 업무', accent: '#5E5C6B' }
];
type Props = { tasks: Task[]; done: string[]; onToggle: (id: string) => void; onBack: () => void };

export default function TaskList({ tasks, done, onToggle, onBack }: Props) {
  const all: Item[] = [...tasks, ...GENERAL];
  const groups = SECTIONS
    .map((sec) => ({ ...sec, items: all.filter((t) => t.kind === sec.kind) }))
    .filter((sec) => sec.items.length > 0);
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
        {groups.map((group, gi) => (
          <View key={group.kind} style={gi > 0 && s.sectionGap}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>{group.title}</Text>
              <Text style={[s.sectionCount, { color: group.accent }]}>{group.items.length}</Text>
            </View>
          <View style={s.card}>
            {group.items.map((t, i) => {
              const d = done.includes(t.id);
              return (
                <View key={t.id} style={[s.row, i > 0 && s.line]}>
                  <View style={s.icon}>
                    <Ionicons name={t.icon} size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0}}>
                    <Text style={[s.name, d && s.nameDone]} numberOfLines={2} textBreakStrategy="balanced" lineBreakStrategyIOS="hangul-word">{t.title}</Text>
                    {!!t.sub && <Text style={s.sub} numberOfLines={1}>{t.sub}</Text>}
                  </View>
                  {t.kind !== 'general' ? (
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
        </View>
        ))}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 60, paddingVertical: 12},
  line: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F1FA', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, lineHeight: 19,fontWeight: '700', color: C.text, ...(Platform.OS === 'web'? ({ wordBreak: 'keep-all' } as object) : {})},
  nameDone: { color: '#A3A1B0', textDecorationLine: 'line-through' },
  sub: { fontSize: 11, color: '#828282', marginTop: 3 },
  doneBtn: { backgroundColor: C.primary, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 6 },
  doneText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  tag: { backgroundColor: '#F1F0F5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 10.5, fontWeight: '700', color: '#5E5C6B' },
  sectionGap: { marginTop: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 2},
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  sectionCount: { fontSize: 13.5, fontWeight: '800' },
});
