import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

// TODO: 업무 목록은 샘플 데이터. API 연동 단계에서 재고·유통기한 기준으로 서버가 생성한 값으로 교체
const TASKS: { id: string; title: string; sub?: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 't1', title: '서울우유 1L 폐기 처리', sub: '유통기한 오늘', icon: 'time-outline' },
  { id: 't2', title: '크림빵 유통기한 확인', sub: '유통기한 내일', icon: 'time-outline' },
  { id: 't3', title: '컵라면(신라면) 발주 필요', sub: '현재 4개 · 적정 20개', icon: 'cube-outline' },
  { id: 't4', title: '아이스컵 16oz 발주 필요', sub: '현재 1박스', icon: 'cube-outline' },
  { id: 't5', title: '좌석 정리', icon: 'checkmark-circle-outline' },
];

type Props = { done: string[]; onToggle: (id: string) => void; onBack: () => void };

export default function TaskList({ done, onToggle, onBack }: Props) {
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
