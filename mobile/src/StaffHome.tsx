import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BarcodeFlow from './BarcodeFlow';
import InventoryTab from './InventoryTab';
import Notifications from './Notifications';
import Scanner from './Scanner';
import TaskList from './TaskList';
import TabBar, { TabItem } from './TabBar';
import { C } from './ui';

// TODO: 이름·근무 시간·업무·인수인계는 샘플 데이터. API 연동 단계에서 서버 값으로 교체
const ME = '민보람';
const SHIFT = '14:00 – 20:00';
const URGENT = ['디저트 유통기한 검사', '시럽/소스류 소분'];
const TASKS = [
  { title: '유통기한 임박 상품 확인', icon: 'time-outline' as const, tag: '3개 품목', warn: true },
  { title: '재고 부족 상품 보충', icon: 'clipboard-outline' as const, tag: '2개 품목', warn: true },
  { title: '좌석 정리', icon: 'checkmark-circle-outline' as const, tag: '일반', warn: false },
];
const TABS: TabItem[] = [
  { label: '업무/출퇴근', icon: 'checkbox-outline' },
  { label: '바코드 입고', icon: 'barcode-outline' },
  { label: '재고/발주', icon: 'file-tray-full-outline' },
  { label: 'MY', icon: 'person' },
];

const elapsed = (from: Date, now: number) => {
  const m = Math.max(0, Math.floor((now - from.getTime()) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분째` : `${m}분째`;
};

export default function StaffHome({ storeName, userName, renderMy, onSwitchStore: onProfile }: { storeName: string; userName: string; renderMy: (onBell: () => void) => ReactNode; onSwitchStore: () => void }) {
  const [clockedAt, setClockedAt] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [taskDone, setTaskDone] = useState<string[]>([]);
  const [tab, setTab] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const onBell = () => setNotifOpen(true);
  const [done, setDone] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!clockedAt) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [clockedAt]);

  const header = (avatar: boolean) => (
    <View style={s.header}>
      <Ionicons name="storefront" size={34} color={C.primary} />
      <View style={{ flex: 1 }}>
        <Text style={s.storeName} numberOfLines={1}>{storeName}</Text>
        <Text style={s.role}>직원 | {ME}</Text>
      </View>
      {avatar && (
        <>
          {/* TODO: 알림 목록 화면 연결 */}
          <Pressable onPress={onBell} hitSlop={8}>
            <Ionicons name="notifications-outline" size={24} color={C.primary} />
          </Pressable>
          <Pressable style={s.avatar} onPress={onProfile}>
            <Ionicons name="person" size={18} color="#fff" />
          </Pressable>
        </>
      )}
    </View>
  );

  if (notifOpen) return <Notifications role="staff" onBack={() => setNotifOpen(false)} />;

  // 근무 시간 전
  if (!clockedAt) {
    // TODO: 스캔한 QR이 이 매장의 출근 QR인지 서버에서 검증 (지금은 어떤 QR이든 통과)
    if (scanning) {
      return (
        <Scanner
          title="출근 QR 스캔"
          onClose={() => setScanning(false)}
          onScan={() => {}}
          tag="스캔이 완료되었어요"
          name={storeName}
          confirmLabel="출근하기"
          confirmIcon="log-in-outline"
          onConfirm={() => {
            setNow(Date.now());
            setClockedAt(new Date());
            setScanning(false);
          }}
        />
      );
    }
    // 출근 전에는 MY 탭만 열 수 있고, 다른 탭을 누르면 출근 전 화면으로 돌아간다
    if (tab === 3) {
      return (
        <View style={s.root}>
          {renderMy(onBell)}
          <TabBar tabs={TABS} active={3} onChange={(i) => setTab(i === 3 ? 3 : 0)} />
        </View>
      );
    }
    return (
      <View style={s.root}>
        <View style={s.pad}>{header(true)}</View>
        <Text style={s.big}>{`${ME.slice(1)}님,\n아직 근무 시간이 아니에요`}</Text>
        <View style={s.shift}>
          <Text style={s.shiftLabel}>근무 시간</Text>
          <Text style={s.shiftTime}>{SHIFT}</Text>
          <View style={s.loc}>
            <Ionicons name="qr-code" size={14} color="#fff" />
            <Text style={s.locText}>QR 코드를 스캔해주세요</Text>
          </View>
          <Pressable style={s.clockIn} onPress={() => setScanning(true)}>
            <Ionicons name="log-in-outline" size={18} color={C.text} />
            <Text style={s.clockInText}>출근하기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (tasksOpen) {
    return (
      <TaskList
        done={taskDone}
        onToggle={(id) => setTaskDone((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))}
        onBack={() => setTasksOpen(false)}
      />
    );
  }

  // 바코드 입고는 탭바 없이 전체 화면으로 열린다
  if (tab === 1) return <BarcodeFlow store={storeName} userName={userName} onExit={() => setTab(0)} />;

  return (
    <View style={s.root}>
      {tab === 0 ? (
        <ScrollView contentContainerStyle={s.scroll}>
          {header(true)}
          <Text style={s.hello}>{ME.slice(1)}님, 오늘도 파이팅!</Text>
          <Text style={s.earn}>이번달 120,230원 벌었어요</Text>

          <View style={s.status}>
            <View style={{ flex: 1 }}>
              <View style={s.statusHead}>
                <View style={s.dot} />
                <Text style={s.statusLabel}>근무 중</Text>
              </View>
              <Text style={s.statusTime}>{elapsed(clockedAt, now)}</Text>
            </View>
            <Pressable style={s.clockOut} onPress={() => setClockedAt(null)}>
              <Ionicons name="log-out-outline" size={16} color={C.primary} />
              <Text style={s.clockOutText}>퇴근</Text>
            </Pressable>
          </View>

          <View style={s.urgent}>
            <View style={s.urgentHead}>
              <View style={s.warn}>
                <Ionicons name="warning" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.urgentTitle}>긴급 인수인계</Text>
                <Text style={s.urgentSub}>교대 전 확인이 필요한 긴급 인수인계 사항입니다.</Text>
              </View>
            </View>
            {URGENT.map((u) => {
              const d = done.includes(u);
              return (
                <View key={u} style={s.urgentRow}>
                  <Text style={s.rowTitle}>{u}</Text>
                  <Pressable
                    style={[s.doneBtn, d && { opacity: 0.45 }]}
                    onPress={() => setDone(d ? done.filter((x) => x !== u) : [...done, u])}
                  >
                    <Text style={s.doneText}>완료</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable style={s.sectionRow} onPress={() => setTasksOpen(true)}>
            <Text style={s.sectionInRow}>업무</Text>
            <Ionicons name="chevron-forward" size={18} color={C.text} />
          </Pressable>
          <View style={s.card}>
            {TASKS.map((t, i) => (
              <Pressable key={t.title} onPress={() => setTasksOpen(true)} style={[s.task, i > 0 && s.line]}>
                <Ionicons name={t.icon} size={22} color={C.primary} />
                <Text style={[s.rowTitle, { flex: 1 }]}>{t.title}</Text>
                <View style={[s.tag, { backgroundColor: t.warn ? '#FDEEE3' : '#F1F0F5' }]}>
                  <Text style={[s.tagText, { color: t.warn ? '#E8590C' : '#5E5C6B' }]}>{t.tag}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={s.section}>이전 근무자 인수인계</Text>
          <View style={[s.card, { padding: 14 }]}>
            <View style={s.memoHead}>
              <View style={s.mini}>
                <Text style={s.miniText}>정</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>정채원</Text>
                <Text style={s.memoTime}>13:52 작성</Text>
              </View>
              <View style={[s.tag, { backgroundColor: '#ECEAF7' }]}>
                <Text style={[s.tagText, { color: C.primary }]}>새 메모</Text>
              </View>
            </View>
            <Text style={s.memoBody}>{'3번 룸 에어컨 리모컨 배터리 교체 필요해요.\n우유는 오늘 오후 입고 예정입니다.'}</Text>
          </View>

          <Text style={s.section}>인수인계 사항 작성</Text>
          <View style={[s.card, s.write]}>
            <View style={s.mini}>
              <Text style={s.miniText}>민</Text>
            </View>
            <Text style={[s.rowTitle, { flex: 1 }]}>{ME}</Text>
            <Pressable style={s.writeBtn}>
              <Text style={s.writeText}>긴급 메모 작성</Text>
            </Pressable>
            <Pressable style={s.writeBtn}>
              <Text style={s.writeText}>메모 작성</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : tab === 2 ? (
        <InventoryTab store={storeName} onProfile={onProfile} onBell={onBell} />
      ) : tab === 3 ? (
        renderMy(onBell)
      ) : (
        <View style={s.empty}>
          <Text style={s.emptyText}>{TABS[tab].label} 화면은 준비 중이에요</Text>
        </View>
      )}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  pad: { paddingHorizontal: 16, paddingTop: 12 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { fontSize: 14, fontWeight: '700', color: C.primary },
  role: { fontSize: 10.5, fontWeight: '600', color: C.primary, marginTop: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 24, fontWeight: '800', color: C.text, lineHeight: 34, marginTop: 36, marginBottom: 20, paddingHorizontal: 16 },
  shift: { backgroundColor: C.primary, borderRadius: 22, padding: 20, marginHorizontal: 16 },
  shiftLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  shiftTime: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  locText: { fontSize: 12, color: '#fff' },
  clockIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 27, backgroundColor: '#fff', marginTop: 20 },
  clockInText: { fontSize: 15, fontWeight: '700', color: C.text },
  hello: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 18 },
  earn: { fontSize: 11.5, color: '#828282', marginTop: 4 },
  status: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F1FA', borderRadius: 18, padding: 16, marginTop: 14 },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  statusLabel: { fontSize: 11, color: '#5E5C6B' },
  statusTime: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2 },
  clockOut: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DFEA' },
  clockOutText: { fontSize: 13, fontWeight: '700', color: C.primary },
  urgent: { backgroundColor: '#F3F1FA', borderRadius: 16, padding: 14, marginTop: 14, gap: 8 },
  urgentHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  warn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#9C93D6', alignItems: 'center', justifyContent: 'center' },
  urgentTitle: { fontSize: 13.5, fontWeight: '700', color: C.text },
  urgentSub: { fontSize: 10.5, color: '#5E5C6B', marginTop: 1 },
  urgentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, paddingLeft: 14, paddingRight: 10, height: 48 },
  rowTitle: { fontSize: 13.5, fontWeight: '700', color: C.text },
  doneBtn: { backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6 },
  doneText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  section: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 24, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionInRow: { fontSize: 16, fontWeight: '800', color: C.text },
  card: { borderWidth: 1, borderColor: '#E6E4EE', borderRadius: 14, backgroundColor: '#fff' },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 56 },
  line: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  tagText: { fontSize: 10.5, fontWeight: '700' },
  memoHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mini: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  miniText: { fontSize: 12, fontWeight: '700', color: C.primary },
  memoTime: { fontSize: 10, color: '#828282' },
  memoBody: { fontSize: 13.5, lineHeight: 21, color: C.text, marginTop: 12 },
  write: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  writeBtn: { backgroundColor: '#ECEAF7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  writeText: { fontSize: 11, fontWeight: '700', color: C.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#828282' },
});
