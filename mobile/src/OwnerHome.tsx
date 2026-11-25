import ShiftSummary from './ShiftSummary';
import NotificationBell from './NotificationBell';
import {api} from './api';
// 사장님 홈 화면 (업무 진행률, 근무 현황)과 하단 탭 연결
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextProps, View } from 'react-native';
import { Text as AppText } from './font';

function Text(props: TextProps) { return <AppText {...props} style={[Platform.OS === 'android' && { fontFamily: 'sans-serif', includeFontPadding: false }, props.style]} />; }
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import BarcodeFlow from './BarcodeFlow';
import InventoryTab from './InventoryTab';
import Notifications from './Notifications';
import WorkRecords from './WorkRecords';
import OwnerTaskRegistration from './OwnerTaskRegistration';
import HandoverBoard from './HandoverBoard';
import { OwnerStaffManagement, OwnerStaffRequests } from './OwnerStaff';
import OwnerPayroll from './OwnerPayroll';
import OwnerContracts from './OwnerContracts';
import { Task, useTasks } from './tasks';

import { C, TabBar } from './ui';
import { activeStaff, hhmm } from './work';

type Icon = keyof typeof Ionicons.glyphMap;

const TABS: { label: string; icon: Icon }[] = [
  { label: '업무/직원', icon: 'checkbox-outline' },
  { label: '바코드 입고', icon: 'barcode-outline' },
  { label: '재고/발주', icon: 'file-tray-full-outline' },
  { label: 'MY', icon: 'person' },
];

// 사장님 홈: 메인, 바코드 입고, 재고, MY(프로필)까지 직원 화면과 같은 컴포넌트를 쓴다. 그 밖의 상세 화면은 아직 연결하지 않았다.
export default function OwnerHome({ store, userId, userName, renderMy, onSwitchStore: onProfile }: { store: { id?: number; name: string; type: string; inviteCode?: string }; userId: string; userName: string; renderMy: (onBell: () => void, onRecords: () => void, unread?: boolean, onEmployeeRequests?: () => void, onEmployees?: () => void, onPayroll?: () => void, onContracts?: () => void) => ReactNode; onSwitchStore: () => void }) {
  const [tab, setTab] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [staffPage, setStaffPage] = useState<'requests' | 'employees' | null>(null);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);
  const onBell = () => setNotifOpen(true);

  if (staffPage === 'requests') return <OwnerStaffRequests storeId={store.id ?? 0} inviteCode={store.inviteCode} storeName={store.name} onBack={() => setStaffPage(null)} />;
  if (staffPage === 'employees') return <OwnerStaffManagement storeId={store.id ?? 0} onBack={() => setStaffPage(null)} />;
  if (payrollOpen) return <OwnerPayroll storeId={store.id ?? 0} onClose={() => setPayrollOpen(false)} />;
  if (contractsOpen) return <OwnerContracts storeId={store.id ?? 0} onBack={() => setContractsOpen(false)} />;
  if (notifOpen) return <Notifications storeId={store.id ?? 0} userId={userId} isOwner storeName={store.name} inviteCode={store.inviteCode} onBack={() => setNotifOpen(false)} />;
  if (recordsOpen) return <WorkRecords storeId={store.id ?? 0} onBack={() => setRecordsOpen(false)} />;

  // 바코드 입고는 탭바 없이 전체 화면으로 열린다
  if (tab === 1) return <BarcodeFlow store={store.id ?? 0} userName={userName} onExit={() => setTab(0)} />;

  return (
    <View style={s.root}>
      {tab === 0 ? <Dashboard storeId={store.id ?? 0} store={store} onProfile={onProfile} onBell={onBell} /> : tab === 2 ? <InventoryTab store={store.id ?? 0} onProfile={onProfile} onBell={onBell} /> : tab === 3 ? renderMy(onBell, () => setRecordsOpen(true), undefined, () => setStaffPage('requests'), () => setStaffPage('employees'), () => setPayrollOpen(true), () => setContractsOpen(true)) : <View style={s.empty}><Text style={s.emptyText}>{TABS[tab].label} 화면은 준비 중이에요</Text></View>}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </View>
  );
}

function Dashboard({ storeId, store, onProfile, onBell }: { storeId: number; store: { name: string; type: string }; onProfile: () => void; onBell: () => void }) {
  const { tasks, done, error, reload } = useTasks(storeId);
  const [detail, setDetail] = useState<'pending' | 'register' | 'handovers' | 'staff' | 'summary' | null>(null);
  const onEntriesChange = useCallback(() => reload(), [reload]);
  const [planned,setPlanned]=useState<{memberId:number;name:string;start:string;end:string;working:boolean}[]>([]);
  const [taskFilter,setTaskFilter]=useState<'all'|'low'|'expiry'>('all');
  useEffect(()=>{api<typeof planned>('GET',`/api/stores/${storeId}/dashboard/scheduled`).then(setPlanned,()=>{});},[storeId]);
  const [staff, setStaff] = useState<{ name: string; clockIn: Date }[]>([]);
  useEffect(() => {
    activeStaff(storeId).then(setStaff, () => {});
  }, [storeId]);

  const allTasks = tasks;
  const doneCount = allTasks.filter((t) => done.includes(t.id)).length;
  const pct = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;
  const todos = allTasks.filter((t) => (taskFilter!=='all'||!done.includes(t.id))&&(taskFilter==='all'||taskFilter==='low'&&t.kind==='low'||taskFilter==='expiry'&&(t.kind==='soon'||t.kind==='expired')));
  const STATS: { label: string; value: string; icon: Icon; color: string }[] = [
    { label: '유통기한 임박', value: `${tasks.filter((t) => t.kind === 'expired' || t.kind === 'soon').length}개`, icon: 'time-outline', color: C.primary },
    { label: '재고 부족', value: `${tasks.filter((t) => t.kind === 'low').length}개`, icon: 'clipboard-outline', color: C.primary },
    { label: '근무 중', value: `${staff.length}명`, icon: 'people-outline', color: C.primary },
  ];

  return (
    <>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={`매장 변경, 현재 매장 ${store.name}`} accessibilityHint="매장 목록을 열어요" onPress={onProfile} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
            <Image source={require('../assets/storemate-store-icon.png')} style={{ width: 34, height: 34 }} resizeMode="contain" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.storeName, { flexShrink: 1 }]} numberOfLines={1}>{store.name}</Text>
                <Ionicons name="chevron-down" size={18} color={C.primary} />
              </View>
              <Text style={s.mode}>관리자 모드</Text>
            </View>
          </Pressable>
          <Pressable onPress={onBell} hitSlop={8}>
            <NotificationBell storeId={storeId}/>
          </Pressable>
        </View>

        <View style={s.storeRow}>
          <Image source={require('../assets/storemate-store-icon.png')} style={{ width: 16, height: 16 }} resizeMode="contain" accessibilityLabel="StoreMate" />
          <Text style={s.storeRowName}>{store.name}</Text>
          {!!store.type && <Text style={s.storeRowType}>{store.type}</Text>}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="오늘 업무 진행률" style={s.hero} onPress={() => {setTaskFilter('all');setDetail('pending');}}>
          <Ring pct={pct} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.heroLabel}>오늘 업무 진행률</Text>
            <Text style={s.heroValue}>{doneCount} / {allTasks.length} 완료</Text>
            <Text style={s.heroSub}>재고 데이터 기반 업무 자동 생성</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </Pressable>

        <View style={s.stats}>
          {STATS.map((x) => (
            <Pressable key={x.label} onPress={()=>{setTaskFilter(x.label==='재고 부족'?'low':x.label==='유통기한 임박'?'expiry':'all');setDetail(x.label==='근무 중'?'staff':'pending');}} style={[s.stat, { borderColor: x.color + '55' }]}>
              <View style={s.statHead}>
                <Ionicons name={x.icon} size={14} color={x.color} />
                <Text style={[s.statLabel, { color: x.color }]}>{x.label}</Text>
              </View>
              <Text style={s.statValue}>{x.value}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" style={[s.card, s.detail]} onPress={() => setDetail('register')}>
          <Text style={s.todoTitle}>업무 등록</Text>
          <Ionicons name="chevron-forward" size={20} color={C.text} />
        </Pressable>

        <Pressable style={[s.card,s.detail]} onPress={()=>setDetail('summary')}><Text style={s.todoTitle}>교대 요약</Text><Ionicons name="chevron-forward" size={20} color={C.text}/></Pressable>
        <Pressable style={[s.card, s.detail]} onPress={() => setDetail('handovers')}><Text style={s.todoTitle}>인수인계 목록·관리</Text><Ionicons name="chevron-forward" size={20} color={C.text}/></Pressable>
        <Text style={[s.section, { marginTop: 26, marginBottom: 12 }]}>오늘 근무 예정 {planned.length}명 · 근무 현황</Text>{planned.map(p=><Text key={p.memberId} style={s.todoSub}>{p.name} · {p.start}~{p.end} · {p.working?'근무 중':'출근 전/퇴근 완료'}</Text>)}
        {!staff.length && <Text style={[s.todoSub, { marginBottom: 10 }]}>지금 근무 중인 직원이 없어요</Text>}
        {staff.map((p, i) => (
          <View key={i} style={[s.card, s.staff]}>
            <View style={s.staffAvatar}>
              <Ionicons name="person-outline" size={24} color={C.primary}/>
            </View>
            <View>
              <Text style={s.todoTitle}>{p.name}</Text>
              <Text style={s.todoSub}>{hhmm(p.clockIn)} 출근</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    <Modal visible={detail !== null} animationType="slide" onRequestClose={() => setDetail(null)}>
      <View style={s.root}>
        <View style={s.modalFrame}>
          {detail === 'summary'?<ShiftSummary storeId={storeId} owner onBack={()=>setDetail(null)}/>:detail === 'staff'?<View style={s.root}><View style={s.pendingHeader}><Pressable onPress={()=>setDetail(null)} accessibilityLabel="뒤로"><Ionicons name="arrow-back" size={24}/></Pressable><Text style={s.section}>현재 근무 중 {staff.length}명</Text></View><ScrollView contentContainerStyle={s.scroll}>{!staff.length&&<Text>현재 근무 중인 직원이 없어요.</Text>}{staff.map((p,i)=><View key={i} style={[s.card,s.staff]}><Ionicons name="person-outline" size={24} color={C.primary}/><View><Text style={s.todoTitle}>{p.name}</Text><Text style={s.todoSub}>{hhmm(p.clockIn)} 출근</Text></View></View>)}</ScrollView></View>:detail === 'handovers' ? <HandoverBoard storeId={storeId} onBack={() => setDetail(null)} /> : detail === 'register' ? <OwnerTaskRegistration key={storeId} storeId={storeId} onBack={() => setDetail(null)} onEntriesChange={onEntriesChange} /> : (
            <View style={s.root}>
              <View style={s.pendingHeader}>
                <Pressable accessibilityRole="button" accessibilityLabel="뒤로" hitSlop={12} onPress={() => setDetail(null)}>
                  <Ionicons name="arrow-back" size={24} color={C.text} />
                </Pressable>
                <Text style={s.section}>{taskFilter==='low'?'재고 부족 상품':taskFilter==='expiry'?'유통기한 확인 상품':'오늘 업무 진행률'}</Text>
              </View>
              <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.sectionHead}>
                  <Text style={s.section}>확인 필요 <Text style={{ color: C.primary }}>{todos.length}</Text></Text>
                </View>
                <View style={s.card}>
                  {!!error && <Text style={[s.todoSub, { padding: 14, color: C.primary }]}>{error}</Text>}
                  {!error && !todos.length && <Text style={[s.todoSub, { padding: 14 }]}>확인할 업무가 없어요</Text>}
                  {todos.map((t, i) => (
                    <View key={t.id} style={[s.todo, i > 0 && s.line]}>
                      <Ionicons name={t.icon} size={22} color={C.primary} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.todoTitle}>{t.title}</Text>
                        {!!t.sub && <Text style={s.todoSub}>{t.sub}</Text>}
                      </View>
                      <Tag kind={t.tone} label={t.tag} onPress={t.kind === 'low' ? () => Linking.openURL('https://www.coupang.com/') : undefined} />
                    </View>
                  ))}
                </View>

              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
    </>
  );
}

function Ring({ pct }: { pct: number }) {
  const size = Platform.OS === 'android' ? 52 : 62, stroke = 5, r = (size - stroke) / 2, len = 2 * Math.PI * r;
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

function Tag({ kind, label, onPress }: { kind: 'action' | 'urgent' | 'normal'; label: string; onPress?: () => void }) {
  const st = {
    action: { bg: C.primary, fg: '#fff' },
    urgent: { bg: '#ECEAF7', fg: C.primary },
    normal: { bg: '#F1F0F5', fg: '#5E5C6B' },
  }[kind];
  const contents = <Text style={[s.tagText, { color: st.fg }]}>{label}</Text>;
  if (onPress) {
    return (
      <Pressable accessibilityRole="link" accessibilityLabel="쿠팡에서 발주하기" onPress={onPress} style={[s.tag, { backgroundColor: st.bg }]}>
        {contents}
      </Pressable>
    );
  }
  return <View style={[s.tag, { backgroundColor: st.bg }]}>{contents}</View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  modalFrame: { flex: 1, width: '100%', maxWidth: 360, alignSelf: 'center' },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 32, height: 88 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { lineHeight: 22, fontSize: 15, fontWeight: '700', color: C.text },
  mode: { lineHeight: 16, fontSize: 10.5, fontWeight: '600', color: C.primary, marginTop: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  storeRowName: { fontSize: 14, fontWeight: '700', color: C.text },
  storeRowType: { fontSize: 11, color: '#828282' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.primary, borderRadius: 18, padding: 14, marginTop: 12 },
  heroLabel: { lineHeight: 17, fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
  heroValue: { lineHeight: 28, fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroSub: { lineHeight: 16, fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  ringText: { position: 'absolute', lineHeight: 18, fontSize: 13, fontWeight: '800', color: '#fff' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, minWidth: 0, minHeight: 98, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, backgroundColor: '#fff', justifyContent: 'center' },
  statHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  statLabel: { fontSize: 10.5, fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 6, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  section: { fontSize: 16, fontWeight: '800', color: C.text },
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
