import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from './auth';
import { C } from './ui';

type Props = {
  id: string;
  acc: Account;
  onBack: () => void;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onLogout: () => void;
};

export default function Profile({ id, acc, onBack, onSelect, onAdd, onLogout }: Props) {
  const owner = acc.role === 'owner';

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12} style={s.back}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.headerText}>프로필</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.me}>
          <View style={s.avatar}>
            <Ionicons name="person" size={26} color="#fff" />
          </View>
          <View>
            <Text style={s.name}>{acc.name}</Text>
            <Text style={s.sub}>{id} · {owner ? '사장님' : '직원'}</Text>
          </View>
        </View>

        <Text style={s.section}>소속 매장</Text>
        <View style={s.card}>
          {acc.stores.map((st, i) => {
            const on = i === acc.current;
            return (
              <Pressable key={i} style={[s.row, i > 0 && s.line]} onPress={() => onSelect(i)}>
                <Ionicons name="storefront-outline" size={20} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.storeName}>{st.name}</Text>
                  {!!st.type && <Text style={s.storeType}>{st.type}</Text>}
                </View>
                {on ? <Ionicons name="checkmark-circle" size={22} color={C.primary} /> : <View style={s.radio} />}
              </Pressable>
            );
          })}
          <Pressable style={[s.row, s.line]} onPress={onAdd}>
            <Ionicons name="add-circle-outline" size={20} color={C.primary} />
            <Text style={[s.storeName, { color: C.primary }]}>{owner ? '새 매장 등록하기' : '다른 매장에 참여하기'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={s.bottom}>
        <Pressable style={s.logout} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#D93025" />
          <Text style={s.logoutText}>로그아웃</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { height: 52, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', left: 16 },
  headerText: { fontSize: 16, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: '#828282', marginTop: 2 },
  section: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 10, marginBottom: 10 },
  card: { borderWidth: 1, borderColor: '#E6E4EE', borderRadius: 14, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56 },
  line: { borderTopWidth: 1, borderTopColor: '#EEEDF3' },
  storeName: { fontSize: 14, fontWeight: '700', color: C.text },
  storeType: { fontSize: 11, color: '#828282', marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D5D3DF' },
  bottom: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#F3C9C5', backgroundColor: '#fff' },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#D93025' },
});
