import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import BarcodeFlow from './BarcodeFlow';
import InventoryTab from './InventoryTab';
import Notifications from './Notifications';
import TabBar from './TabBar';
import { C } from './ui';

type Icon = keyof typeof Ionicons.glyphMap;

// TODO: 아래 수치·목록은 샘플 데이터. API 연동 단계에서 서버 값으로 교체
const PROGRESS = { done: 13, total: 21 };
const STATS: { label: string; value: string; icon: Icon; color: string }[] = [
  { label: '유통기한 임박', value: '5개', icon: 'time-outline', color: '#E8590C' },
  { label: '재고 부족', value: '3개', icon: 'clipboard-outline', color: '#D93025' },
  { label: '근무 중', value: '4명', icon: 'people-outline', color: '#1E8E3E' },
];
const TODOS: { title: string; sub: string; icon: Icon; tag: string; kind: 'action' | 'urgent' | 'normal' }[] = [
  { title: '컵라면(신라면) 발주 필요', sub: '재고 4 / 적정 20 · 3일 연속 부족', icon: 'cube-outline', tag: '발주', kind: 'action' },
  { title: '서울우유 1L 폐기 처리', sub: '홍지수 님에게 폐기 업무 배정됨', icon: 'time-outline', tag: 'D-day', kind: 'urgent' },
  { title: '좌석 정리', sub: '', icon: 'checkmark-circle-outline', tag: '일반', kind: 'normal' },
];
const STAFF = [
  { name: '정채원', info: '14:00 ~ 20:00 · 13:58 출근' },
  { name: '민보람', info: '14:00 ~ 20:00 · 14:01 출근' },
];
const TABS: { label: string; icon: Icon }[] = [
  { label: '업무/직원', icon: 'checkbox-outline' },
  { label: '바코드 입고', icon: 'barcode-outline' },
  { label: '재고/발주', icon: 'file-tray-full-outline' },
  { label: 'MY', icon: 'person' },
];

// 사장님 홈: 메인, 바코드 입고, 재고, MY(프로필)까지 직원 화면과 같은 컴포넌트를 쓴다. 그 밖의 상세 화면은 아직 연결하지 않았다.
export default function OwnerHome({ store, userName, renderMy, onSwitchStore: onProfile }: { store: { name: string; type: string }; userName: string; renderMy: (onBell: () => void) => ReactNode; onSwitchStore: () => void }) {
  const [tab, setTab] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const onBell = () => setNotifOpen(true);

  if (notifOpen) return <Notifications role="owner" onBack={() => setNotifOpen(false)} />;

  // 바코드 입고는 탭바 없이 전체 화면으로 열린다
  if (tab === 1) return <BarcodeFlow store={store.name} userName={userName} onExit={() => setTab(0)} />;

  return (
    <View style={s.root}>
      {tab === 0 ? <Dashboard store={store} onProfile={onProfile} onBell={onBell} /> : tab === 2 ? <InventoryTab store={store.name} onProfile={onProfile} onBell={onBell} /> : tab === 3 ? renderMy(onBell) : <View style={s.empty}><Text style={s.emptyText}>{TABS[tab].label} 화면은 준비 중이에요</Text></View>}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </View>
  );
}

function Dashboard({ store, onProfile, onBell }: { store: { name: string; type: string }; onProfile: () => void; onBell: () => void }) {
  const pct = Math.round((PROGRESS.done / PROGRESS.total) * 100);

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={s.header}>
        <Ionicons name="storefront" size={34} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={s.mode}>관리자 모드</Text>
        </View>
        <Pressable onPress={onBell} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} color={C.primary} />
        </Pressable>
        <Pressable style={s.avatar} onPress={onProfile}>
          <Ionicons name="person" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={s.storeRow}>
        <Ionicons name="storefront-outline" size={16} color={C.primary} />
        <Text style={s.storeRowName}>{store.name}</Text>
        {!!store.type && <Text style={s.storeRowType}>{store.type}</Text>}
      </View>

      <Pressable style={s.hero}>
        <Ring pct={pct} />
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>오늘 업무 진행률</Text>
          <Text style={s.heroValue}>{PROGRESS.done} / {PROGRESS.total} 완료</Text>
          <Text style={s.heroSub}>재고 데이터 기반 업무 자동 생성</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <View style={s.stats}>
        {STATS.map((x) => (
          <View key={x.label} style={[s.stat, { borderColor: x.color + '55' }]}>
            <View style={s.statHead}>
              <Ionicons name={x.icon} size={14} color={x.color} />
              <Text style={[s.statLabel, { color: x.color }]}>{x.label}</Text>
            </View>
            <Text style={s.statValue}>{x.value}</Text>
          </View>
        ))}
      </View>

      <View style={s.sectionHead}>
        <Text style={s.section}>확인 필요 <Text style={{ color: C.primary }}>{TODOS.length}</Text></Text>
        <Text style={s.more}>전체 &gt;</Text>
      </View>
      <View style={s.card}>
        {TODOS.map((t, i) => (
          <View key={t.title} style={[s.todo, i > 0 && s.line]}>
            <Ionicons name={t.icon} size={22} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.todoTitle}>{t.title}</Text>
              {!!t.sub && <Text style={s.todoSub}>{t.sub}</Text>}
            </View>
            <Tag kind={t.kind} label={t.tag} />
          </View>
        ))}
      </View>

      <Pressable style={[s.card, s.detail]}>
        <Text style={s.todoTitle}>상세 업무 확인 및 등록</Text>
        <Ionicons name="chevron-forward" size={20} color={C.text} />
      </Pressable>

      <Text style={[s.section, { marginTop: 26, marginBottom: 12 }]}>근무 현황</Text>
      {STAFF.map((p) => (
        <View key={p.name} style={[s.card, s.staff]}>
          <View style={s.staffAvatar}>
            <Text style={s.staffInitial}>{p.name[0]}</Text>
          </View>
          <View>
            <Text style={s.todoTitle}>{p.name}</Text>
            <Text style={s.todoSub}>{p.info}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Ring({ pct }: { pct: number }) {
  const size = 62, stroke = 6, r = (size - stroke) / 2, len = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#fff"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(len * pct) / 100} ${len}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={s.ringText}>{pct}%</Text>
    </View>
  );
}

function Tag({ kind, label }: { kind: 'action' | 'urgent' | 'normal'; label: string }) {
  const st = {
    action: { bg: C.primary, fg: '#fff' },
    urgent: { bg: '#FDECEA', fg: '#D93025' },
    normal: { bg: '#F1F0F5', fg: '#5E5C6B' },
  }[kind];
  return (
    <View style={[s.tag, { backgroundColor: st.bg }]}>
      <Text style={[s.tagText, { color: st.fg }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { fontSize: 15, fontWeight: '700', color: C.text },
  mode: { fontSize: 10.5, fontWeight: '600', color: C.primary, marginTop: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  storeRowName: { fontSize: 14, fontWeight: '700', color: C.text },
  storeRowType: { fontSize: 11, color: '#828282' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.primary, borderRadius: 18, padding: 16, marginTop: 12 },
  heroLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
  heroValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroSub: { fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  ringText: { position: 'absolute', fontSize: 13, fontWeight: '800', color: '#fff' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#fff' },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 10.5, fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 6, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  section: { fontSize: 16, fontWeight: '800', color: C.text },
  more: { fontSize: 12, color: '#5E5C6B' },
  card: { borderWidth: 1, borderColor: '#E6E4EE', borderRadius: 14, backgroundColor: '#fff' },
  todo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  line: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  todoTitle: { fontSize: 13.5, fontWeight: '700', color: C.text },
  todoSub: { fontSize: 11, color: '#828282', marginTop: 2 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  tagText: { fontSize: 11.5, fontWeight: '700' },
  detail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 54, marginTop: 14 },
  staff: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  staffAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  staffInitial: { fontSize: 15, fontWeight: '700', color: C.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#828282' },
});
