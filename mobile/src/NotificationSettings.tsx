// 알림 설정 화면 (알림 화면의 톱니바퀴에서 열린다)
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './ui';

// TODO: 알림 설정은 기기 저장소에만 보관한다. API 연동 단계에서 계정 설정으로 저장
const KEY = 'notificationSettings';
const KINDS = [
  { id: 'task', title: '업무 배정 · 승인', sub: '새 업무, 완료 승인/반려' },
  { id: 'expiry', title: '유통기한 임박', sub: '매장 기준 D-3 · 오전 9시' },
  { id: 'stock', title: '재고 부족', sub: '적정 재고의 30% 이하' },
  { id: 'memo', title: '인수인계 메모', sub: '내 근무 직전 파트의 메모' },
  { id: 'pay', title: '근무표 · 급여', sub: '근무표 확정, 급여 명세서 도착' },
];
const DEFAULTS: Record<string, boolean> = { push: true, task: true, expiry: true, stock: true, memo: true, pay: true, quiet: false };

export default function NotificationSettings({ onBack }: { onBack: () => void }) {
  const [on, setOn] = useState(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => raw && setOn({ ...DEFAULTS, ...JSON.parse(raw) }));
  }, []);

  // 안드로이드 뒤로가기로 설정 화면만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const toggle = (id: string, v: boolean) => {
    const next = { ...on, [id]: v };
    setOn(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>알림 설정</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.card}>
          <Row title="푸시 알림 받기" sub="꺼도 알림 목록에는 계속 쌓여요" value={on.push} onChange={(v) => toggle('push', v)} />
        </View>

        <Text style={s.section}>받을 알림</Text>
        <View style={s.card}>
          {KINDS.map((k, i) => (
            <Row key={k.id} line={i > 0} title={k.title} sub={k.sub} value={on[k.id]} onChange={(v) => toggle(k.id, v)} />
          ))}
        </View>

        <Text style={s.section}>방해 금지</Text>
        <View style={s.card}>
          <Row title="근무 외 시간 알림 끄기" sub="근무 시작 30분 전부터 다시 받아요" value={on.quiet} onChange={(v) => toggle('quiet', v)} />
          {/* TODO: 방해 금지 시간 설정 화면 연결 */}
          <Pressable style={[s.row, s.line]}>
            <View style={s.moon}>
              <Ionicons name="moon-outline" size={18} color={C.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>방해 금지 시간</Text>
              <Text style={s.rowSub}>23:00 – 08:00</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#5E5C6B" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ title, sub, value, onChange, line }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void; line?: boolean }) {
  return (
    <View style={[s.row, line && s.line]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

// 시안의 스위치 (켜짐: 보라색 트랙 + 흰 손잡이, 꺼짐: 회색 테두리 + 작은 회색 손잡이)
// 켜고 끌 때 스프링으로 손잡이가 살짝 튀어 오르며 움직인다
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, bounciness: 0, speed: 16, useNativeDriver: false }).start();
  }, [value]);

  const size = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 24] });
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)}>
      <Animated.View
        style={[
          s.track,
          {
            backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#E6E0E9', '#6750A4'] }),
            borderColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#79747E', '#6750A4'] }),
          },
        ]}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: 12,
            left: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 22] }),
            top: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 2] }),
            backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#79747E', '#FFFFFF'] }),
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 16, borderWidth: 2 },
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 56 },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 20, paddingBottom: 30 },
  card: { borderWidth: 0.8, borderColor: '#E4E2EC', borderRadius: 12, backgroundColor: '#fff', marginTop: 8 },
  section: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 22, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 58, paddingVertical: 8 },
  line: { borderTopWidth: 1, borderTopColor: '#E4E2EC' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 12.5, color: '#5E5C6B', marginTop: 3 },
  moon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F0F5', alignItems: 'center', justifyContent: 'center' },
});
