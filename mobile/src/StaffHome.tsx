// 직원 홈 화면 (출근 전/후, 업무, 인수인계)과 하단 탭 연결
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BarcodeFlow from './BarcodeFlow';
import InventoryTab from './InventoryTab';
import Notifications from './Notifications';
import Scanner from './Scanner';
import TaskList from './TaskList';
import WorkRecords from './WorkRecords';
import { Handover, listHandovers, resolveHandover, writeHandover } from './handover';
import { useTasks } from './tasks';
import { C, TabBar, TabItem } from './ui';
import { clockIn, clockOut, currentShift, hhmm, hoursByDay, listSessions, WAGE, won } from './work';

// TODO: 근무 시간은 샘플 데이터. 근무 일정 기능을 만들 때 서버 값으로 교체
const SHIFT = '14:00 – 20:00';
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

export default function StaffHome({ storeId, storeName, userName, renderMy, onSwitchStore: onProfile }: { storeId: number; storeName: string; userName: string; renderMy: (onBell: () => void, onRecords: () => void) => ReactNode; onSwitchStore: () => void }) {
  const ME = userName;
  const [clockedAt, setClockedAt] = useState<Date | null>(null);
  const [ready, setReady] = useState(false); // 서버에서 출근 상태를 받아온 뒤에 화면을 그린다
  const [scanning, setScanning] = useState(false);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [earn, setEarn] = useState(0); // 이번 달 예상 급여
  const [tasksOpen, setTasksOpen] = useState(false);
  const { tasks, done: taskDone, toggle: toggleTask, reload: reloadTasks } = useTasks(storeId);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [writing, setWriting] = useState<'urgent' | 'memo' | null>(null);
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const onBell = () => setNotifOpen(true);
  const [now, setNow] = useState(Date.now());

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '요청을 처리하지 못했어요');
  const refreshEarn = () => {
    const d = new Date();
    listSessions(storeId, d.getFullYear(), d.getMonth() + 1).then(
      (l) => setEarn(Object.values(hoursByDay(l)).reduce((a, h) => a + h, 0) * WAGE),
      fail,
    );
  };

  useEffect(() => {
    currentShift(storeId).then(setClockedAt, fail).finally(() => setReady(true));
    refreshEarn();
  }, [storeId]);

  // 근무 중 메인 화면으로 돌아올 때마다 업무(재고 기준)와 인수인계를 새로 받는다
  useEffect(() => {
    if (!clockedAt || tab !== 0 || tasksOpen) return;
    reloadTasks();
    listHandovers(storeId).then(setHandovers, fail);
  }, [clockedAt, tab, tasksOpen, storeId]);

  const sendMemo = () => {
    if (!writing || !draft.trim()) return;
    writeHandover(storeId, draft.trim(), writing === 'urgent').then((h) => {
      setHandovers((c) => [h, ...c]);
      setDraft('');
      setWriting(null);
    }, fail);
  };
  const toggleUrgent = (h: Handover) =>
    resolveHandover(storeId, h.id, !h.resolved).then((n) => setHandovers((c) => c.map((x) => (x.id === n.id ? n : x))), fail);

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

  if (notifOpen) return <Notifications storeId={storeId} onBack={() => setNotifOpen(false)} />;
  if (recordsOpen) return <WorkRecords storeId={storeId} onBack={() => setRecordsOpen(false)} />;
  if (!ready) return <View style={s.root} />;

  // 근무 시간 전
  if (!clockedAt) {
    // 스캔한 값이 이 매장의 출근 QR인지는 서버가 확인한다
    if (scanning) {
      return (
        <Scanner
          title="출근 QR 스캔"
          onClose={() => setScanning(false)}
          onScan={setQr}
          manualEntry="text"
          tag="스캔이 완료되었어요"
          name={storeName}
          confirmLabel="출근하기"
          confirmIcon="log-in-outline"
          onConfirm={async () => {
            try {
              setError('');
              setClockedAt(await clockIn(storeId, qr));
              setNow(Date.now());
              refreshEarn();
            } catch (e) {
              fail(e);
            }
            setScanning(false);
          }}
        />
      );
    }
    // 출근 전에는 MY 탭만 열 수 있고, 다른 탭을 누르면 출근 전 화면으로 돌아간다
    if (tab === 3) {
      return (
        <View style={s.root}>
          {renderMy(onBell, () => setRecordsOpen(true))}
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
            <Ionicons name="location-outline" size={14} color="#fff" />
            <Text style={s.locText}>매장 반경 안에 있어요</Text>
          </View>
          <Pressable style={s.clockIn} onPress={() => { setError(''); setScanning(true); }}>
            <Ionicons name="log-in-outline" size={18} color={C.text} />
            <Text style={s.clockInText}>출근하기</Text>
          </Pressable>
          {!!error && <Text style={s.error}>{error}</Text>}
        </View>
      </View>
    );
  }

  // 메인 화면에 보일 요약: 긴급 인수인계(24시간 이내), 이전 근무자 메모, 업무 건수
  const urgent = handovers.filter((h) => h.urgent && now - h.createdAt.getTime() < 24 * 3600000);
  const prev = handovers.find((h) => !h.urgent && !h.mine);
  const soon = tasks.filter((t) => t.kind !== 'low').length;
  const low = tasks.filter((t) => t.kind === 'low').length;
  const homeTasks = [
    ...(soon ? [{ title: '유통기한 임박 상품 확인', icon: 'time-outline' as const, tag: `${soon}개 품목`, warn: true }] : []),
    ...(low ? [{ title: '재고 부족 상품 보충', icon: 'clipboard-outline' as const, tag: `${low}개 품목`, warn: true }] : []),
    { title: '좌석 정리', icon: 'checkmark-circle-outline' as const, tag: '일반', warn: false },
  ];

  if (tasksOpen) {
    return (
      <TaskList tasks={tasks} done={taskDone} onToggle={toggleTask} onBack={() => setTasksOpen(false)} />
    );
  }

  // 바코드 입고는 탭바 없이 전체 화면으로 열린다
  if (tab === 1) return <BarcodeFlow store={storeId} userName={userName} onExit={() => setTab(0)} />;

  return (
    <View style={s.root}>
      {tab === 0 ? (
        <ScrollView contentContainerStyle={s.scroll}>
          {header(true)}
          <Text style={s.hello}>{ME.slice(1)}님, 오늘도 파이팅!</Text>
          <Text style={s.earn}>이번달 {won(earn)}원 벌었어요</Text>

          <View style={s.status}>
            <View style={{ flex: 1 }}>
              <View style={s.statusHead}>
                <View style={s.dot} />
                <Text style={s.statusLabel}>근무 중</Text>
              </View>
              <Text style={s.statusTime}>{elapsed(clockedAt, now)}</Text>
            </View>
            <Pressable
              style={s.clockOut}
              onPress={() => {
                setError('');
                clockOut(storeId).then(() => { setClockedAt(null); refreshEarn(); }, fail);
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={C.primary} />
              <Text style={s.clockOutText}>퇴근</Text>
            </Pressable>
          </View>
          {!!error && <Text style={[s.error, { color: '#D93025' }]}>{error}</Text>}

          {!!urgent.length && (
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
              {urgent.map((u) => (
                <View key={u.id} style={s.urgentRow}>
                  <Text style={[s.rowTitle, { flex: 1, marginRight: 8 }]} numberOfLines={2}>{u.content}</Text>
                  <Pressable style={[s.doneBtn, u.resolved && { opacity: 0.45 }]} onPress={() => toggleUrgent(u)}>
                    <Text style={s.doneText}>완료</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Pressable style={s.sectionRow} onPress={() => setTasksOpen(true)}>
            <Text style={s.sectionInRow}>업무</Text>
            <Ionicons name="chevron-forward" size={18} color={C.text} />
          </Pressable>
          <View style={s.card}>
            {homeTasks.map((t, i) => (
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
            {prev ? (
              <>
                <View style={s.memoHead}>
                  <View style={s.mini}>
                    <Text style={s.miniText}>{prev.author.slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{prev.author}</Text>
                    <Text style={s.memoTime}>{hhmm(prev.createdAt)} 작성</Text>
                  </View>
                  {now - prev.createdAt.getTime() < 12 * 3600000 && (
                    <View style={[s.tag, { backgroundColor: '#ECEAF7' }]}>
                      <Text style={[s.tagText, { color: C.primary }]}>새 메모</Text>
                    </View>
                  )}
                </View>
                <Text style={s.memoBody}>{prev.content}</Text>
              </>
            ) : (
              <Text style={s.emptyText}>남겨진 인수인계가 없어요</Text>
            )}
          </View>

          <Text style={s.section}>인수인계 사항 작성</Text>
          <View style={[s.card, s.write]}>
            <View style={s.mini}>
              <Text style={s.miniText}>{ME.slice(0, 1)}</Text>
            </View>
            <Text style={[s.rowTitle, { flex: 1 }]}>{ME}</Text>
            <Pressable style={[s.writeBtn, writing === 'urgent' && s.writeOn]} onPress={() => setWriting(writing === 'urgent' ? null : 'urgent')}>
              <Text style={s.writeText}>긴급 메모 작성</Text>
            </Pressable>
            <Pressable style={[s.writeBtn, writing === 'memo' && s.writeOn]} onPress={() => setWriting(writing === 'memo' ? null : 'memo')}>
              <Text style={s.writeText}>메모 작성</Text>
            </Pressable>
          </View>
          {!!writing && (
            <View style={[s.card, { padding: 12, marginTop: 8 }]}>
              <TextInput
                style={s.memoInput}
                value={draft}
                onChangeText={setDraft}
                placeholder={writing === 'urgent' ? '교대 전에 꼭 확인해야 할 내용' : '다음 근무자에게 남길 내용'}
                placeholderTextColor="#A3A1B0"
                multiline
                maxLength={500}
              />
              <Pressable style={[s.memoSend, !draft.trim() && { opacity: 0.4 }]} disabled={!draft.trim()} onPress={sendMemo}>
                <Text style={s.memoSendText}>등록</Text>
              </Pressable>
            </View>
          )}
          {!!error && <Text style={[s.error, { color: '#D93025' }]}>{error}</Text>}
        </ScrollView>
      ) : tab === 2 ? (
        <InventoryTab store={storeId} onProfile={onProfile} onBell={onBell} />
      ) : tab === 3 ? (
        renderMy(onBell, () => setRecordsOpen(true))
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
  error: { fontSize: 12, color: '#fff', marginTop: 10, textAlign: 'center' },
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
  writeOn: { backgroundColor: '#DAD6F0' },
  memoInput: { minHeight: 72, fontSize: 13.5, color: C.text, textAlignVertical: 'top', padding: 0 },
  memoSend: { alignSelf: 'flex-end', backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8, marginTop: 8 },
  memoSendText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#828282' },
});
