// MY 탭 화면 (프로필, 소속 매장, 로그아웃) - 사장님·직원 공통
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from './auth';
import { C } from './ui';
import { hoursByDay, hr, listSessions, useMe } from './work';

type Props = {
  id: string;
  acc: Account;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onLogout: () => void;
  onBell: () => void;
  onRecords: () => void;
};

const dot = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

export default function Profile({ id, acc, onSelect, onAdd, onLogout, onBell, onRecords }: Props) {
  const owner = acc.role === 'owner';
  const [switching, setSwitching] = useState(false);
  const store = acc.stores[acc.current];
  const storeId = store?.id ?? 0;

  // 직원: 이번 달 근무 시간, 예상 급여(사장님이 정한 시급), 근속은 서버 값으로 계산한다
  const me = useMe(storeId);
  const [hours, setHours] = useState(0);
  useEffect(() => {
    if (owner || !storeId) return;
    const d = new Date();
    listSessions(storeId, d.getFullYear(), d.getMonth() + 1).then(
      (l) => setHours(Object.values(hoursByDay(l)).reduce((a, h) => a + h, 0)),
      () => {},
    );
  }, [owner, storeId]);
  const now = new Date();
  const months = me.joinedAt
    ? Math.max(0, (now.getFullYear() - me.joinedAt.getFullYear()) * 12 + now.getMonth() - me.joinedAt.getMonth() - (now.getDate() < me.joinedAt.getDate() ? 1 : 0))
    : 0;

  return (
    <ScrollView contentContainerStyle={s.body}>
      <View style={s.header}>
        <Text style={s.title}>MY</Text>
        <Pressable onPress={onBell} hitSlop={8}>
          <Ionicons name="notifications-outline" size={26} color={C.primary} />
          <View style={s.dot} />
        </Pressable>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color="#fff" />
        </View>
      </View>

      <View style={s.me}>
        <View style={s.initial}>
          <Text style={s.initialText}>{acc.name.slice(0, 1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{acc.name}</Text>
          <Text style={s.sub}>{id}</Text>
        </View>
        {/* TODO: 프로필 수정 화면 연결 */}
        <Pressable style={s.editBtn}>
          <Text style={s.editText}>프로필 수정</Text>
        </Pressable>
      </View>

      <Pressable style={[s.card, s.storeCard]} onPress={() => setSwitching(!switching)}>
        <Ionicons name="storefront" size={34} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.storeName}>{store?.name ?? '소속 매장 없음'}</Text>
          <Text style={s.storeSub}>{owner ? '사장님' : `직원${me.joinedAt ? ` · ${dot(me.joinedAt)} 입사` : ''}`}</Text>
        </View>
        <Ionicons name={switching ? 'chevron-up' : 'chevron-down'} size={20} color="#5E5C6B" />
      </Pressable>

      {switching && (
        <View style={[s.card, { marginTop: 8 }]}>
          {acc.stores.map((st, i) => (
            <Pressable key={i} style={[s.row, i > 0 && s.line]} onPress={() => onSelect(i)}>
              <Text style={[s.rowTitle, { flex: 1 }]}>{st.name}</Text>
              {i === acc.current ? <Ionicons name="checkmark-circle" size={22} color={C.primary} /> : <View style={s.radio} />}
            </Pressable>
          ))}
          <Pressable style={[s.row, s.line]} onPress={onAdd}>
            <Ionicons name="add-circle-outline" size={20} color={C.primary} />
            <Text style={[s.rowTitle, { color: C.primary }]}>{owner ? '새 매장 등록하기' : '다른 매장에 참여하기'}</Text>
          </Pressable>
        </View>
      )}

        {!owner && (
          <View style={s.stats}>
            <Stat label="이번 달 근무">{hr(hours)}<Unit>시간</Unit></Stat>
            <Stat label="예상 급여">{(Math.round((hours * me.wage) / 1000) / 10).toFixed(1)}<Unit>만원</Unit></Stat>
            <Stat label="근속">{months >= 12 && <>{Math.floor(months / 12)}<Unit>년 </Unit></>}{months % 12}<Unit>개월</Unit></Stat>
          </View>
        )}

        <Text style={s.section}>근무 · 급여</Text>
        {/* TODO: 근로계약서 화면 연결 */}
        <View style={s.card}>
          <MenuRow icon="document-text-outline" label="근로계약서" />
          <View style={s.line} />
          <MenuRow icon="calendar-outline" label="근무 기록" onPress={onRecords} />
        </View>

      <Text style={s.section}>앱 설정</Text>
      {/* TODO: 알림 설정 화면 연결 */}
      <View style={s.card}>
        <MenuRow icon="notifications-outline" label="알림 설정" gray />
      </View>

      <Pressable style={s.logout} onPress={onLogout}>
        <Text style={s.logoutText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{children}</Text>
    </View>
  );
}

const Unit = ({ children }: { children: ReactNode }) => <Text style={s.unit}>{children}</Text>;

function MenuRow({ icon, label, gray, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; gray?: boolean; onPress?: () => void }) {
  return (
    <Pressable style={s.menu} onPress={onPress}>
      <View style={[s.menuIcon, gray && { backgroundColor: '#F1F0F5' }]}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>
      <Text style={[s.rowTitle, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#5E5C6B" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: C.text },
  dot: { position: 'absolute', top: 0, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#862CF9' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  initial: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 20, fontWeight: '700', color: C.primary },
  name: { fontSize: 19, fontWeight: '700', color: C.text },
  sub: { fontSize: 13, color: '#5E5C6B', marginTop: 2 },
  editBtn: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: '#CFCCDB', alignItems: 'center', justifyContent: 'center' },
  editText: { fontSize: 13.5, fontWeight: '700', color: C.primary },
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 12, backgroundColor: '#fff' },
  storeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 18 },
  storeName: { fontSize: 15, fontWeight: '700', color: C.text },
  storeSub: { fontSize: 12.5, color: '#5E5C6B', marginTop: 2 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 12, padding: 12 },
  statLabel: { fontSize: 12.5, color: '#5E5C6B' },
  statValue: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },
  unit: { fontSize: 12.5, fontWeight: '400', color: '#5E5C6B' },
  section: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 26, marginBottom: 12 },
  menu: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 60 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5F4FB', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52 },
  line: { borderTopWidth: 1, borderTopColor: '#E4E2EC' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D5D3DF' },
  logout: { alignSelf: 'center', paddingVertical: 22 },
  logoutText: { fontSize: 14, color: '#5E5C6B' },
});
