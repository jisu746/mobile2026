import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { C, Field } from './ui';

type Entry = { id: string; title: string; description: string; urgent: boolean };
type Props = { storeId: number; onBack: () => void; onEntriesChange: (entries: Entry[]) => void };

// 직접 등록하는 업무 API가 생기면 이 로컬 저장소를 서버 연동으로 바꾼다.
export default function OwnerTaskRegistration({ storeId, onBack, onEntriesChange }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const key = `ownerTasks:${storeId}`;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then((raw) => {
      const value: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(value) || !value.every((entry) => entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.description === 'string' && typeof entry.urgent === 'boolean')) {
        throw new Error('저장된 업무 목록을 확인해 주세요.');
      }
      if (active) {
        setEntries(value);
        onEntriesChange(value);
        setReady(true);
      }
    }).catch(() => { if (active) setError('업무 목록을 불러오지 못했어요. 화면을 다시 열어주세요.'); });
    return () => { active = false; };
  }, [key, onEntriesChange]);

  const save = async (next: Entry[]) => {
    setSaving(true);
    setError('');
    try {
      await AsyncStorage.setItem(key, JSON.stringify(next));
      setEntries(next);
      onEntriesChange(next);
      return true;
    } catch {
      setError('저장하지 못했어요. 다시 시도해 주세요.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    if (!title.trim() || !ready || saving) return;
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: title.trim(), description: description.trim(), urgent };
    if (await save([...entries, entry])) {
      setTitle('');
      setDescription('');
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>상세 업무 확인 및 등록</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.description}>{'유통기한 확인 및 발주 이외의 업무를 등록할 수 있어요.\n추가된 업무 목록은 일반 업무로 등록돼요.'}</Text>
        <Text style={s.section}>업무 등록</Text>
        <View style={s.form}>
          <Text style={s.label}>업무 명 (필수)</Text>
          <Field accessibilityLabel="업무 명" placeholder="터치하여 입력" value={title} onChangeText={setTitle} maxLength={100} style={s.input} />
          <Text style={[s.label, s.detailLabel]}>상세 설명 (선택)</Text>
          <Field accessibilityLabel="상세 설명" placeholder="터치하여 입력" value={description} onChangeText={setDescription} maxLength={500} style={s.input} />
          <View style={s.choices}>
            {[true, false].map((value) => (
              <Pressable key={String(value)} accessibilityRole="radio" accessibilityState={{ checked: urgent === value }} onPress={() => setUrgent(value)} style={[s.choice, urgent === value && s.choiceOn]}>
                <Text style={[s.choiceText, urgent === value && s.choiceTextOn]}>{value ? '긴급' : '일반'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={!title.trim() || !ready || saving} onPress={add} style={[s.add, (!title.trim() || !ready || saving) && s.disabled]}>
            <Text style={s.addText}>{saving ? '저장 중...' : '+ 업무 목록 추가'}</Text>
          </Pressable>
        </View>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Text style={[s.section, s.listTitle]}>업무 목록</Text>
        {ready && entries.length === 0 && <Text style={s.empty}>등록된 업무가 없어요.</Text>}
        {entries.map((entry) => (
          <View key={entry.id} style={s.entry}>
            <View style={s.entryBody}>
              <View style={s.entryHeading}>
                <Text style={s.entryTitle}>{entry.title}</Text>
                <View style={[s.badge, entry.urgent ? s.urgentBadge : s.normalBadge]}><Text style={[s.badgeText, entry.urgent ? s.urgentBadgeText : s.normalBadgeText]}>{entry.urgent ? '긴급' : '일반'}</Text></View>
              </View>
              {!!entry.description && <Text style={s.entryDescription}>{entry.description}</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${entry.title} 삭제`} hitSlop={8} disabled={saving} onPress={() => save(entries.filter((item) => item.id !== entry.id))}>
              <Text style={s.delete}>삭제</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, height: 48, marginTop: 32 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 20, paddingBottom: 28 },
  description: { marginLeft: 11, fontSize: 11.9, lineHeight: 15, color: '#5E5C6B' },
  section: { marginTop: 22, marginLeft: 4, marginBottom: 10, fontSize: 15.9, fontWeight: '700', color: C.text },
  form: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 10, paddingBottom: 14 },
  label: { marginLeft: 8, marginBottom: 5, color: '#5E5C6B', fontSize: 12.4, fontWeight: '600', lineHeight: 15 },
  detailLabel: { marginTop: 7 },
  input: { height: 36, fontSize: 14.5, paddingHorizontal: 12, outlineWidth: 0 },
  choices: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 8 },
  choice: { height: 32, borderRadius: 24, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: C.primary, borderColor: C.primary },
  choiceText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  choiceTextOn: { color: '#fff' },
  add: { minHeight: 44, borderRadius: 12, backgroundColor: C.primary, paddingHorizontal: 12, justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  listTitle: { marginTop: 26, marginBottom: 20 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 43, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, marginBottom: 10 },
  entryBody: { flex: 1 },
  entryHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  entryTitle: { fontSize: 17, color: C.text, flexShrink: 1 },
  entryDescription: { fontSize: 11.9, lineHeight: 16, color: '#5E5C6B', marginTop: 4 },
  badge: { borderRadius: 16, paddingHorizontal: 8, paddingVertical: 3 },
  urgentBadge: { backgroundColor: '#ECEAF7' },
  normalBadge: { backgroundColor: '#F1F0F5' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  urgentBadgeText: { color: C.primary },
  normalBadgeText: { color: '#5E5C6B' },
  delete: { color: '#474550', fontSize: 12 },
  empty: { color: '#5E5C6B', fontSize: 13, paddingHorizontal: 4 },
  error: { color: '#D93025', fontSize: 12, marginTop: 10 },
});
