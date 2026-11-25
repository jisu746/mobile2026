import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { C } from './ui';
import { CustomTask, customTasks, TaskPerson, taskStatus } from './customTasks';

export default function CustomTaskCard({
  storeId,
  task,
  owner = false,
  people = [],
  onChange,
}: {
  storeId: number;
  task: CustomTask;
  owner?: boolean;
  people?: TaskPerson[];
  onChange: () => void;
}) {
  const [note, setNote] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [remove, setRemove] = useState(false);
  const working = useRef(false);
  const [editing, setEditing] = useState(false),
    [title, setTitle] = useState(task.title),
    [description, setDescription] = useState(task.description);
  const run = async (action: () => Promise<unknown>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      setNote('');
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : '업무를 처리하지 못했어요.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={s.card}>
      <View style={s.heading}>
        <Text style={s.title}>{task.title}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{task.urgent ? '긴급' : '일반'}</Text>
        </View>
      </View>
      {!!task.description && <Text style={s.text}>{task.description}</Text>}
      <Text style={s.text}>담당: {task.assignee ?? '미지정 · 직원 누구나 보고 가능'}</Text>
      <Text style={s.status}>{taskStatus(task)}</Text>
      {!!task.reporter && (
        <Text style={s.text}>
          보고: {task.reporter} · {task.reportedAt?.replace('T', ' ')}
          {task.reportNote ? `\n${task.reportNote}` : ''}
        </Text>
      )}
      {!!task.reviewNote && <Text style={s.text}>최근 검토: {task.reviewNote}</Text>}
      {!!task.reviewer && (
        <Text style={s.text}>
          검토자: {task.reviewer} · {task.reviewedAt?.replace('T', ' ')}
        </Text>
      )}
      {owner && task.status === 'PENDING' && (
        <>
          {editing ? (
            <>
              <TextInput style={s.input} value={title} onChangeText={setTitle} maxLength={100} placeholder="업무명" />
              <TextInput
                style={s.input}
                value={description}
                onChangeText={setDescription}
                maxLength={500}
                multiline
                placeholder="설명"
              />
              <Pressable
                disabled={busy || !title.trim()}
                onPress={() =>
                  void run(() => customTasks.edit(storeId, task, { title, description, urgent: task.urgent }))
                }
              >
                <Text style={s.delete}>수정 저장</Text>
              </Pressable>
              <Pressable onPress={() => setEditing(false)}>
                <Text style={s.delete}>취소</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => setEditing(true)}>
              <Text style={s.delete}>업무 내용 수정</Text>
            </Pressable>
          )}
          <Text style={s.label}>담당자 변경</Text>
          <View style={s.choices}>
            {[{ memberId: null, name: '미지정' }, ...people].map((p) => (
              <Pressable
                key={String(p.memberId)}
                disabled={busy || p.memberId === task.assignedMemberId}
                style={[s.choice, p.memberId === task.assignedMemberId && s.choiceOn]}
                onPress={() => void run(() => customTasks.assign(storeId, task, p.memberId))}
              >
                <Text style={[s.choiceText, p.memberId === task.assignedMemberId && s.white]}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {((owner && task.status === 'SUBMITTED') || (!owner && task.canReport)) && (
        <>
          <TextInput
            style={s.input}
            value={note}
            onChangeText={setNote}
            maxLength={500}
            multiline
            placeholder={owner ? '검토 내용 (반려 시 필수)' : '완료 보고 내용 (선택)'}
          />
          {owner ? (
            <View style={s.choices}>
              <Pressable
                disabled={busy}
                style={s.button}
                onPress={() => void run(() => customTasks.review(storeId, task, true, note))}
              >
                <Text style={s.white}>승인</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                style={s.choice}
                onPress={() => void run(() => customTasks.review(storeId, task, false, note))}
              >
                <Text style={s.choiceText}>반려</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              disabled={busy}
              style={s.button}
              onPress={() => void run(() => customTasks.report(storeId, task, note))}
            >
              <Text style={s.white}>{busy ? '보고 중…' : '완료 보고'}</Text>
            </Pressable>
          )}
        </>
      )}
      {owner &&
        (remove ? (
          <View>
            <Text style={s.text}>이 업무를 목록에서 삭제할까요?</Text>
            <View style={s.choices}>
              <Pressable
                disabled={busy}
                style={s.choice}
                onPress={() => void run(() => customTasks.remove(storeId, task))}
              >
                <Text style={s.error}>삭제 확인</Text>
              </Pressable>
              <Pressable disabled={busy} style={s.choice} onPress={() => setRemove(false)}>
                <Text style={s.choiceText}>취소</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable disabled={busy} onPress={() => setRemove(true)}>
            <Text style={s.delete}>삭제</Text>
          </Pressable>
        ))}
      {!!error && <Text style={s.error}>{error}</Text>}
      {!!error && (
        <Pressable onPress={onChange}>
          <Text style={s.delete}>최신 상태 불러오기</Text>
        </Pressable>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 14, marginTop: 14 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  badge: {
    minWidth: 56,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F0F5',
  },
  badgeText: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: C.primary },
  text: { fontSize: 12, lineHeight: 20, color: '#686373', marginTop: 6 },
  status: { fontSize: 14, fontWeight: '700', color: C.primary, marginTop: 8 },
  label: { fontSize: 12, color: C.text, marginTop: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9D3E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceOn: { backgroundColor: C.primary },
  choiceText: { fontSize: 12, color: C.primary, fontWeight: '700' },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  white: { color: '#fff', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#D9D3E9',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    minHeight: 48,
    fontSize: 13,
    color: C.text,
  },
  error: { fontSize: 12, lineHeight: 20, color: '#B3261E', marginTop: 8 },
  delete: { fontSize: 12, color: C.primary, marginTop: 12, paddingVertical: 6 },
});
