import {buildInventoryAlerts} from './inventoryNotificationAlerts';
import LinkedTasks from './LinkedTasks';
// 알림 목록 화면 (서버 알림, 사장님·직원 공통)
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './font';
import { Ionicons } from '@expo/vector-icons';
import NotificationSettings from './NotificationSettings';
import InventoryTab from './InventoryTab';
import { OwnerStaffRequests } from './OwnerStaff';
import { listNotifs, markRead, Notif } from './notifs';
import { daysLeft, listProducts } from './inventory';
import type { Product } from './inventory';
import { DEFAULT_STORE_SETUP_SETTINGS, getStoreSetupSettingsOrDefault } from './storeSetupRepository';
import { C } from './ui';
import { hhmm } from './work';

type Icon = keyof typeof Ionicons.glyphMap;
type Look = { icon: Icon; bg: string; fg: string; outline?: boolean };

const GREEN = { bg: '#EAF5EE', fg: '#2F7A4E' };
const GRAY = { bg: '#F1F0F5', fg: '#5E5C6B' };
const PURPLE = { bg: '#F5F4FB', fg: C.primary };
const ORANGE = { bg: '#FFF4E5', fg: '#D97706' };
const RED = { bg: '#FEECEB', fg: '#E53935' };

type DisplayNotif = Notif & { rowKey: string; localKey?: string; order?: number; targetBarcode?: string };
type InventoryAlert = Notif & { localKey: string; order: number; targetBarcode: string };

// 서버 알림 종류별 아이콘과 색
const LOOK: Record<string, Look> = {
  receipt: { icon: 'download-outline', ...GREEN },
  clockin: { icon: 'log-in-outline', ...GRAY, outline: true },
  join: { icon: 'person-add', ...PURPLE, outline: true },
  handover: { icon: 'swap-horizontal', ...PURPLE, outline: true },
  expiry: { icon: 'time-outline', ...ORANGE },
  stock: { icon: 'cube-outline', ...RED },
};
const DEFAULT_LOOK: Look = { icon: 'notifications-outline', ...GRAY };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const inventoryReadKey = (userId: string, storeId: number) => `inventoryNotificationReads:${userId}:${storeId}`;


export default function Notifications({ storeId, userId, isOwner = false, storeName = '현재 매장', inviteCode, onBack }: { storeId: number; userId: string; isOwner?: boolean; storeName?: string; inviteCode?: string; onBack: () => void }) {
  const [list, setList] = useState<Notif[] | null>(null);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[] | null>(isOwner ? null : []);
  const [inventoryReadKeys, setInventoryReadKeys] = useState<Set<string>>(new Set());
  const [inventoryError, setInventoryError] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [destination, setDestination] = useState<
    { type: 'tasks'; taskId?:number|null } | { type: 'inventory'; barcode?: string } | { type: 'requests' } | { type: 'detail'; item: DisplayNotif } | null
  >(null);

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '요청을 처리하지 못했어요');
  useEffect(() => {
    listNotifs(storeId).then(setList, (e) => {
      setList([]);
      fail(e);
    });
  }, [storeId, reloadVersion]);

  useEffect(() => {
    if (!isOwner) {
      setInventoryAlerts([]);
      return;
    }
    let active = true;
    Promise.all([
      listProducts(storeId),
      getStoreSetupSettingsOrDefault(storeId),
      AsyncStorage.getItem(inventoryReadKey(userId, storeId)),
    ]).then(([products, storeSettings, rawReadKeys]) => {
      if (!active) return;
      let readKeys = new Set<string>();
      try {
        const parsed = rawReadKeys ? JSON.parse(rawReadKeys) : [];
        if (Array.isArray(parsed)) readKeys = new Set(parsed.filter((key): key is string => typeof key === 'string'));
      } catch {
        readKeys = new Set();
      }
      setInventoryReadKeys(readKeys);
      setInventoryAlerts(buildInventoryAlerts(
        products,
        storeSettings.expiryEnabled===false?-1:storeSettings.expirationAlertDays,
        storeSettings.lowStockThresholdCount,
        true,
        true,
        readKeys,
      ));
      setInventoryError('');
    }).catch((e) => {
      if (!active) return;
      setInventoryAlerts([]);
      setInventoryError(e instanceof Error ? e.message : '재고 알림을 불러오지 못했어요');
    });
    return () => { active = false; };
  }, [storeId, userId, isOwner, reloadVersion]);

  // 안드로이드 뒤로가기로 알림 화면만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (destination) setDestination(null);
      else onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack, destination]);

  if (settings) return <NotificationSettings userId={userId} storeId={storeId} onBack={() => { setSettings(false); setReloadVersion((value) => value + 1); }} />;

  const read = (items: DisplayNotif[]) => {
    if (!items.length) return;
    const serverIds = items.filter((item) => !item.localKey).map((item) => item.id);
    const localKeys = items.flatMap((item) => item.localKey ? [item.localKey] : []);
    if (serverIds.length) {
      setList((current) => current && current.map((item) => (serverIds.includes(item.id) ? { ...item, read: true } : item)));
      markRead(storeId, serverIds).catch(fail);
    }
    if (localKeys.length) {
      const next = new Set(inventoryReadKeys);
      localKeys.forEach((key) => next.add(key));
      setInventoryReadKeys(next);
      setInventoryAlerts((current) => current && current.map((item) => (localKeys.includes(item.localKey) ? { ...item, read: true } : item)));
      AsyncStorage.setItem(inventoryReadKey(userId, storeId), JSON.stringify([...next])).catch(fail);
    }
  };

  const open = (item: DisplayNotif) => {
    if (!item.read) read([item]);
    if(item.kind==='task')setDestination({type:'tasks',taskId:item.targetId});
    else if (item.targetBarcode || item.kind === 'receipt') setDestination({ type: 'inventory', barcode: item.targetBarcode });
    else if (item.kind === 'join' && isOwner) setDestination({ type: 'requests' });
    else setDestination({ type: 'detail', item });
  };

  if(destination?.type==='tasks')return <LinkedTasks storeId={storeId} taskId={destination.taskId} owner={isOwner} onBack={()=>setDestination(null)}/>;
  if (destination?.type === 'requests') return <OwnerStaffRequests storeId={storeId} storeName={storeName} inviteCode={inviteCode} onBack={() => setDestination(null)} />;
  if (destination?.type === 'inventory') return <View style={s.root}>
    <View style={s.header}><Pressable accessibilityLabel="알림으로 돌아가기" hitSlop={12} onPress={() => setDestination(null)}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable><Text style={s.title}>알림 관련 재고</Text></View>
    <InventoryTab key={`${storeId}:${destination.barcode ?? 'all'}`} store={storeId} focusBarcode={destination.barcode} onProfile={() => setDestination(null)} onBell={() => setDestination(null)} />
  </View>;
  if (destination?.type === 'detail') return <View style={s.root}>
    <View style={s.header}><Pressable accessibilityLabel="알림으로 돌아가기" hitSlop={12} onPress={() => setDestination(null)}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable><Text style={s.title}>알림 상세</Text></View>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{destination.item.title}</Text>
      <Text style={s.rowSub}>{destination.item.sub}</Text>
      <Text style={s.rowSub}>{destination.item.createdAt.toLocaleString('ko-KR')}</Text>
    </ScrollView>
  </View>;

  const serverItems: DisplayNotif[] = (list ?? []).map((item) => ({ ...item, rowKey: `server:${item.id}` }));
  const localItems: DisplayNotif[] = (inventoryAlerts ?? []).map((item) => ({ ...item, rowKey: `inventory:${item.localKey}` }));
  const all = [...serverItems, ...localItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.order ?? 0) - (b.order ?? 0));
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const groups = [
    { label: '오늘', items: all.filter((n) => dayKey(n.createdAt) === dayKey(today)) },
    { label: '어제', items: all.filter((n) => dayKey(n.createdAt) === dayKey(yesterday)) },
    { label: '이전', items: all.filter((n) => dayKey(n.createdAt) !== dayKey(today) && dayKey(n.createdAt) !== dayKey(yesterday)) },
  ];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>알림</Text>
        <Pressable onPress={() => read(all.filter((n) => !n.read))} hitSlop={8}>
          <Text style={s.readAll}>모두 읽음</Text>
        </Pressable>
        <Pressable onPress={() => setSettings(true)} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color={C.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {!!error && <Text style={[s.footer, { color: '#D93025' }]}>{error}</Text>}
        {!!inventoryError && <Text style={[s.footer, { color: '#D93025' }]}>{inventoryError}</Text>}
        {(list === null || inventoryAlerts === null) && !error && <Text style={s.footer}>불러오는 중이에요</Text>}
        {list !== null && inventoryAlerts !== null && !all.length && !error && !inventoryError && <Text style={s.footer}>새 알림이 없어요</Text>}
        {groups.filter((g) => g.items.length).map((g) => (
          <Section key={g.label} label={g.label} items={g.items} onRead={open} />
        ))}
        <Text style={s.footer}>최근 30일 알림까지 보관돼요</Text>
      </ScrollView>
    </View>
  );
}

function Section({ label, items, onRead }: { label: string; items: DisplayNotif[]; onRead: (item: DisplayNotif) => void }) {
  return (
    <>
      <Text style={s.section}>{label}</Text>
      <View style={s.list}>
        {items.map((i) => {
          const look = LOOK[i.kind] ?? DEFAULT_LOOK;
          const unread = !i.read;
          return (
            <Pressable key={i.rowKey} style={[s.row, unread && s.rowUnread]} onPress={() => onRead(i)}>
              {unread && <View style={s.dot} />}
              <View style={[s.icon, { backgroundColor: look.bg }, look.outline && s.iconOutline]}>
                <Ionicons name={look.icon} size={19} color={look.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{i.title}</Text>
                {!!i.sub && <Text style={s.rowSub} numberOfLines={2}>{i.sub}</Text>}
              </View>
              <Text style={s.time}>{label === '이전' ? `${i.createdAt.getMonth() + 1}.${i.createdAt.getDate()}` : hhmm(i.createdAt)}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, height: 56 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text },
  readAll: { fontSize: 13.5, fontWeight: '700', color: C.primary },
  body: { paddingBottom: 30 },
  section: { fontSize: 13, fontWeight: '700', color: '#5E5C6B', marginHorizontal: 20, marginTop: 14, marginBottom: 10 },
  list: { borderTopWidth: 1, borderTopColor: '#E4E2EC' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#E4E2EC' },
  rowUnread: { backgroundColor: '#F5F4FB' },
  dot: { position: 'absolute', left: 8, top: 22, width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconOutline: { borderWidth: 1, borderColor: '#CFCCDB' },
  rowTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 11, lineHeight: 15, color: '#5E5C6B', marginTop: 4 },
  time: { fontSize: 12, color: '#5E5C6B', alignSelf: 'flex-start', marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 12.5, color: '#5E5C6B', marginTop: 26 },
});
