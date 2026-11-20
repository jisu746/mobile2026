// 프로필 아이콘에서 열리는 매장 변경 시트 (사장님·직원 공통)
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from './auth';
import { C } from './ui';

type Props = { acc: Account; onSelect: (i: number) => void; onAdd: () => void; onClose: () => void };

export default function StoreSwitcher({ acc, onSelect, onAdd, onClose }: Props) {
  const owner = acc.role === 'owner';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.title}>매장 변경</Text>
        {acc.stores.map((st, i) => (
          <Pressable key={i} style={s.row} onPress={() => onSelect(i)}>
            <Ionicons name="storefront-outline" size={20} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{st.name}</Text>
              {!!st.type && <Text style={s.type}>{st.type}</Text>}
            </View>
            {i === acc.current ? <Ionicons name="checkmark-circle" size={22} color={C.primary} /> : <View style={s.radio} />}
          </Pressable>
        ))}
        <Pressable style={[s.row, s.add]} onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={20} color={C.primary} />
          <Text style={[s.name, { color: C.primary }]}>{owner ? '새 매장 등록하기' : '다른 매장에 참여하기'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,27,34,0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E1DFEA', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  add: { borderTopWidth: 1, borderTopColor: '#EEEDF3', marginTop: 4 },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  type: { fontSize: 11.5, color: '#828282', marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D5D3DF' },
});
