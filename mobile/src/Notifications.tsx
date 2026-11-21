// 알림 목록 화면 (서버 알림, 사장님·직원 공통)
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './font';
import { Ionicons } from '@expo/vector-icons';
import NotificationSettings from './NotificationSettings';
import { listNotifs, markRead, Notif } from './notifs';
import { C } from './ui';
import { hhmm } from './work';

type Icon = keyof typeof Ionicons.glyphMap;
type Look = { icon: Icon; bg: string; fg: string; outline?: boolean };

const GREEN = { bg: '#EAF5EE', fg: '#2F7A4E' };
const GRAY = { bg: '#F1F0F5', fg: '#5E5C6B' };
const PURPLE = { bg: '#F5F4FB', fg: C.primary };

// 서버 알림 종류별 아이콘과 색
const LOOK: Record<string, Look> = {
  receipt: { icon: 'download-outline', ...GREEN },
  clockin: { icon: 'log-in-outline', ...GRAY, outline: true },
  join: { icon: 'person-add', ...PURPLE, outline: true },
  handover: { icon: 'swap-horizontal', ...PURPLE, outline: true },
};
const DEFAULT_LOOK: Look = { icon: 'notifications-outline', ...GRAY };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function Notifications({ storeId, userId, onBack }: { storeId: number; userId: string; onBack: () => void }) {
  const [list, setList] = useState<Notif[] | null>(null);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '요청을 처리하지 못했어요');
  useEffect(() => {
    listNotifs(storeId).then(setList, (e) => {
      setList([]);
      fail(e);
    });
  }, [storeId]);

  // 안드로이드 뒤로가기로 알림 화면만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  if (settings) return <NotificationSettings userId={userId} storeId={storeId} onBack={() => setSettings(false)} />;

  const read = (ids: number[]) => {
    if (!ids.length) return;
    setList((c) => c && c.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    markRead(storeId, ids).catch(fail);
  };

  const all = list ?? [];
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
        <Pressable onPress={() => read(all.filter((n) => !n.read).map((n) => n.id))} hitSlop={8}>
          <Text style={s.readAll}>모두 읽음</Text>
        </Pressable>
        <Pressable onPress={() => setSettings(true)} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color={C.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {!!error && <Text style={[s.footer, { color: '#D93025' }]}>{error}</Text>}
        {list === null && !error && <Text style={s.footer}>불러오는 중이에요</Text>}
        {list !== null && !all.length && !error && <Text style={s.footer}>새 알림이 없어요</Text>}
        {groups.filter((g) => g.items.length).map((g) => (
          <Section key={g.label} label={g.label} items={g.items} onRead={(id) => read([id])} />
        ))}
        <Text style={s.footer}>최근 30일 알림까지 보관돼요</Text>
      </ScrollView>
    </View>
  );
}

function Section({ label, items, onRead }: { label: string; items: Notif[]; onRead: (id: number) => void }) {
  return (
    <>
      <Text style={s.section}>{label}</Text>
      <View style={s.list}>
        {items.map((i) => {
          const look = LOOK[i.kind] ?? DEFAULT_LOOK;
          const unread = !i.read;
          return (
            <Pressable key={i.id} style={[s.row, unread && s.rowUnread]} onPress={() => onRead(i.id)}>
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
