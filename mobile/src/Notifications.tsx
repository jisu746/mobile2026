import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

type Icon = keyof typeof Ionicons.glyphMap;
type Item = { id: string; icon: Icon; bg: string; fg: string; title: string; sub: string; time: string; unread?: boolean; outline?: boolean };
type Data = { today: Item[]; yesterday: Item[] };

const RED = { bg: '#FBEDEC', fg: '#D93025' };
const GREEN = { bg: '#EAF5EE', fg: '#2F7A4E' };
const ORANGE = { bg: '#FCF0E8', fg: '#D9661F' };
const GRAY = { bg: '#F1F0F5', fg: '#5E5C6B' };
const PURPLE = { bg: '#F5F4FB', fg: C.primary };

// TODO: 알림 목록은 샘플 데이터. API 연동 단계에서 서버 알림(최근 30일)으로 교체
const DATA: Record<'owner' | 'staff', Data> = {
  staff: {
    today: [
      { id: 's1', icon: 'time-outline', ...RED, title: '서울우유 1L 오늘 만료', sub: '냉장고 2칸 · 2개 · 폐기 업무가 배정됐어요', time: '14:02', unread: true },
      { id: 's2', icon: 'swap-horizontal', ...PURPLE, outline: true, title: '민보람 님이 인수인계를 남겼어요', sub: '3번 룸 에어컨 리모컨 배터리 교체 필요해요. 우유는 오늘 오후 입고...', time: '13:52', unread: true },
      { id: 's3', icon: 'checkmark-circle-outline', ...GREEN, title: '좌석 정리 · 1차 완료가 승인됐어요', sub: '이주영 관리자 · 14:05 완료 보고', time: '14:11' },
      { id: 's4', icon: 'file-tray-full-outline', ...ORANGE, title: '재고 부족 업무가 추가됐어요', sub: '아이스컵 16oz · 현재 1박스 · 창고에서 보충해 주세요', time: '13:58' },
    ],
    yesterday: [
      { id: 's5', icon: 'calendar-outline', ...GRAY, title: '근무 기록 정정이 반영됐어요', sub: '9월 28일 퇴근 20:00 → 20:30 · 이주영 관리자', time: '09:12' },
    ],
  },
  owner: {
    today: [
      { id: 'o1', icon: 'person-add', ...PURPLE, outline: true, title: '정하늘 님이 매장 참여를 요청했어요', sub: '초대 코드 · haneul@mail.com', time: '15:20', unread: true },
      { id: 'o2', icon: 'cube-outline', ...RED, title: '컵라면(신라면) 발주가 필요해요', sub: '재고 4 / 적정 20 · 3일 연속 부족', time: '15:02', unread: true },
      { id: 'o3', icon: 'download-outline', ...GREEN, title: '홍지수 님이 입고를 완료했어요', sub: '3개 품목 · 38개 · 서울우유 홍대 대리점', time: '15:42', unread: true },
      { id: 'o4', icon: 'log-in-outline', ...GRAY, outline: true, title: '홍지수 님이 출근했어요', sub: '13:58 · 오후 파트', time: '13:58' },
    ],
    yesterday: [
      { id: 'o5', icon: 'time-outline', ...ORANGE, title: '유통기한 임박 상품 5개', sub: 'D-3 이내 · 크림빵, 요거트 외 3개', time: '09:00' },
    ],
  },
};

// 알림 목록 (사장님·직원 공통 화면, 내용만 다르다)
export default function Notifications({ role, onBack }: { role: 'owner' | 'staff'; onBack: () => void }) {
  const data = DATA[role];
  const [read, setRead] = useState<string[]>([]);

  // 안드로이드 뒤로가기로 알림 화면만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const markAll = () => setRead([...data.today, ...data.yesterday].map((i) => i.id));

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>알림</Text>
        <Pressable onPress={markAll} hitSlop={8}>
          <Text style={s.readAll}>모두 읽음</Text>
        </Pressable>
        {/* TODO: 알림 설정 화면 연결 */}
        <Ionicons name="settings-outline" size={22} color={C.text} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Section label="오늘" items={data.today} read={read} onRead={(id) => setRead((c) => [...c, id])} />
        <Section label="어제" items={data.yesterday} read={read} onRead={(id) => setRead((c) => [...c, id])} />
        <Text style={s.footer}>최근 30일 알림까지 보관돼요</Text>
      </ScrollView>
    </View>
  );
}

function Section({ label, items, read, onRead }: { label: string; items: Item[]; read: string[]; onRead: (id: string) => void }) {
  return (
    <>
      <Text style={s.section}>{label}</Text>
      <View style={s.list}>
        {items.map((i) => {
          const unread = !!i.unread && !read.includes(i.id);
          return (
            <Pressable key={i.id} style={[s.row, unread && s.rowUnread]} onPress={() => onRead(i.id)}>
              {unread && <View style={s.dot} />}
              <View style={[s.icon, { backgroundColor: i.bg }, i.outline && s.iconOutline]}>
                <Ionicons name={i.icon} size={19} color={i.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{i.title}</Text>
                <Text style={s.rowSub} numberOfLines={2}>{i.sub}</Text>
              </View>
              <Text style={s.time}>{i.time}</Text>
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
