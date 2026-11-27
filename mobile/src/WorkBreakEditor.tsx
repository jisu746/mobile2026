import { Fragment, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './font';
import { api, errorText } from './api';
import { C } from './ui';
import { ymd } from './work';

type Breaks = {
  revision: number;
  seconds: number;
  clockIn: string;
  clockOut: string | null;
  breaks: { from: string; to: string }[];
};
type Side = 'from' | 'to';
// from·to 는 화면의 HH:mm, saved 는 서버에서 받은 원래 값
export type BreakRow = { key: number; from: string; to: string; saved?: { from: string; to: string } };

const MAX_BREAKS = 20; // 서버 제한
const two = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => two(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => two(i));
const timeOf = (dateTime: string) => dateTime.slice(11, 16);

// 직접 입력한 값을 HH:mm 으로 바꾼다. "9:5", "0930", "930", "9" 를 받고, 시각이 아니면 null
export function parseTime(text: string) {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(text.trim()) ?? /^(\d{1,2}?)(\d{2})?$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]),
    min = Number(m[2] ?? 0);
  return h < 24 && min < 60 ? `${two(h)}:${two(min)}` : null;
}

// 날짜는 출근일 기준. 출근 시각보다 이른 시각은 자정을 넘긴 다음 날로 본다
function toDateTime(time: string, clockIn: string) {
  const start = timeOf(clockIn);
  if (time === start) return clockIn; // 출근한 분과 같으면 초까지 맞춰 근무시간 안에 들게 한다
  const day = new Date(`${clockIn.slice(0, 10)}T12:00:00`);
  if (time < start) day.setDate(day.getDate() + 1);
  return `${ymd(day)}T${time}:00`;
}

// 고치지 않은 시각은 원래 값(날짜·초 포함)을 그대로 보낸다
function valueOf(row: BreakRow, side: Side, clockIn: string) {
  const time = parseTime(row[side]);
  if (!time) return null;
  const saved = row.saved?.[side];
  return saved && timeOf(saved) === time ? saved : toDateTime(time, clockIn);
}

export const toBreakRows = (breaks: { from: string; to: string }[]): BreakRow[] =>
  breaks.map((b, i) => ({ key: i, from: timeOf(b.from), to: timeOf(b.to), saved: b }));

// 화면의 입력을 서버에 보낼 값으로 바꾼다. 시각이 비었거나 틀리면 Error
export function fromBreakRows(rows: BreakRow[], clockIn: string) {
  return rows.map((row, i) => {
    const from = valueOf(row, 'from', clockIn),
      to = valueOf(row, 'to', clockIn);
    if (!from || !to) throw new Error(`휴게 ${i + 1}의 시각을 00:00~23:59 로 입력해주세요.`);
    return { from, to };
  });
}

export default function WorkBreakEditor({
  storeId,
  sessionId,
  onSaved,
}: {
  storeId: number;
  sessionId: number;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<Breaks | null>(null),
    [rows, setRows] = useState<BreakRow[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const path = `/api/stores/${storeId}/work/sessions/${sessionId}/breaks`;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setData(null);
    setRows([]);
    setError('');
    api<Breaks>('GET', path).then(
      (v) => {
        if (alive) {
          setData(v);
          setRows(toBreakRows(v.breaks));
        }
      },
      (e) => {
        if (alive) setError(e.message);
      },
    );
    return () => {
      alive = false;
    };
  }, [path, open]);

  const save = async () => {
    if (!data || busy) return;
    let breaks: { from: string; to: string }[];
    try {
      breaks = fromBreakRows(rows, data.clockIn);
    } catch (e) {
      return setError(errorText(e, '휴게시간을 확인해주세요.'));
    }
    setBusy(true);
    setError('');
    try {
      setData(await api<Breaks>('PUT', path, { revision: data.revision, breaks }));
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(errorText(e, '저장 실패'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={s.toggle}>휴게시간 확인·수정 {open ? '⌄' : '〉'}</Text>
      </Pressable>
      {open && (
        <View>
          {!data && !error && <Text style={s.hint}>휴게시간을 불러오는 중이에요.</Text>}
          {data && (
            <BreakRows
              rows={rows}
              clockIn={data.clockIn}
              onChange={(next) => {
                setRows(next);
                setError('');
              }}
            />
          )}
          {!!error && <Text style={s.error}>{error}</Text>}
          <Pressable disabled={!data || busy} onPress={() => void save()}>
            <Text style={s.save}>{busy ? '저장 중…' : '휴게시간 저장'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// 휴게 구간 입력 줄. 시각은 직접 입력하거나 목록에서 고른다. name 은 한 화면에 여러 개일 때 구분하는 말
export function BreakRows({
  rows,
  clockIn,
  name = '',
  onChange,
}: {
  rows: BreakRow[];
  clockIn: string;
  name?: string;
  onChange: (rows: BreakRow[]) => void;
}) {
  const [picking, setPicking] = useState<{ key: number; side: Side } | null>(null);
  const pickingRow = rows.find((row) => row.key === picking?.key);
  const change = (key: number, side: Side, value: string) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, [side]: value } : row)));
  // 총 휴게 시간. 입력이 덜 됐거나 순서가 틀리면 보여주지 않는다
  const totalMinutes = rows.reduce<number | null>((sum, row) => {
    const from = valueOf(row, 'from', clockIn),
      to = valueOf(row, 'to', clockIn);
    if (sum === null || !from || !to || to <= from) return null;
    return sum + (new Date(to).getTime() - new Date(from).getTime()) / 60000;
  }, 0);

  return (
    <View>
      {rows.length === 0 && <Text style={s.hint}>휴게 없음</Text>}
      {rows.map((row, i) => (
        <View key={row.key} style={s.row}>
          <Text style={s.label}>휴게 {i + 1}</Text>
          {(['from', 'to'] as const).map((side) => {
            const time = parseTime(row[side]);
            const value = valueOf(row, side, clockIn);
            return (
              <Fragment key={side}>
                {side === 'to' && <Text style={s.tilde}>~</Text>}
                <View style={s.timeColumn}>
                  <View style={s.timeBox}>
                    <TextInput
                      accessibilityLabel={`${name}휴게 ${i + 1} ${side === 'from' ? '시작' : '종료'} 시각`}
                      style={s.timeInput}
                      value={row[side]}
                      onChangeText={(t) => change(row.key, side, t.replace(/[^\d:]/g, ''))}
                      onBlur={() => time && change(row.key, side, time)}
                      placeholder="00:00"
                      placeholderTextColor="#A3A1B0"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Pressable
                      accessibilityLabel={`${name}휴게 ${i + 1} ${side === 'from' ? '시작' : '종료'} 시각 목록에서 선택`}
                      hitSlop={6}
                      onPress={() => setPicking({ key: row.key, side })}
                    >
                      <Ionicons name="chevron-down" size={16} color={C.primary} />
                    </Pressable>
                  </View>
                  {!!value && value.slice(0, 10) > clockIn.slice(0, 10) && <Text style={s.nextDay}>다음 날</Text>}
                </View>
              </Fragment>
            );
          })}
          <Pressable
            accessibilityLabel={`${name}휴게 ${i + 1} 삭제`}
            hitSlop={8}
            style={s.remove}
            onPress={() => onChange(rows.filter((x) => x.key !== row.key))}
          >
            <Ionicons name="trash-outline" size={18} color="#8B839A" />
          </Pressable>
        </View>
      ))}
      {rows.length < MAX_BREAKS && (
        <Pressable
          accessibilityLabel={`${name}휴게시간 추가`}
          style={s.add}
          onPress={() => onChange([...rows, { key: Math.max(-1, ...rows.map((x) => x.key)) + 1, from: '', to: '' }])}
        >
          <Ionicons name="add" size={18} color={C.primary} />
          <Text style={s.addText}>휴게시간 추가</Text>
        </Pressable>
      )}
      {totalMinutes !== null && rows.length > 0 && <Text style={s.hint}>총 휴게 {Math.floor(totalMinutes)}분</Text>}
      {picking && pickingRow && (
        <TimePicker
          title={picking.side === 'from' ? '휴게 시작 시각' : '휴게 종료 시각'}
          initial={parseTime(pickingRow[picking.side]) ?? timeOf(clockIn)}
          onCancel={() => setPicking(null)}
          onDone={(time) => {
            change(picking.key, picking.side, time);
            setPicking(null);
          }}
        />
      )}
    </View>
  );
}

// 시·분을 목록에서 고르는 창
function TimePicker({
  title,
  initial,
  onCancel,
  onDone,
}: {
  title: string;
  initial: string;
  onCancel: () => void;
  onDone: (time: string) => void;
}) {
  const [hour, setHour] = useState(initial.slice(0, 2));
  const [minute, setMinute] = useState(initial.slice(3, 5));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Text style={s.sheetValue}>
            {hour}:{minute}
          </Text>
          <View style={s.columns}>
            <Column unit="시" items={HOURS} selected={hour} onSelect={setHour} />
            <Column unit="분" items={MINUTES} selected={minute} onSelect={setMinute} />
          </View>
          <View style={s.sheetButtons}>
            <Pressable style={s.sheetButton} onPress={onCancel}>
              <Text style={s.sheetCancel}>취소</Text>
            </Pressable>
            <Pressable style={[s.sheetButton, s.sheetDone]} onPress={() => onDone(`${hour}:${minute}`)}>
              <Text style={s.sheetDoneText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const ITEM_HEIGHT = 40;

function Column({
  unit,
  items,
  selected,
  onSelect,
}: {
  unit: string;
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [first] = useState(() => items.indexOf(selected)); // 처음 열 때 선택된 값이 보이는 위치로 옮긴다
  return (
    <View style={s.column}>
      <Text style={s.unit}>{unit}</Text>
      <ScrollView
        style={s.list}
        nestedScrollEnabled
        ref={(view) => {
          if (view)
            requestAnimationFrame(() => view.scrollTo({ y: Math.max(0, first - 2) * ITEM_HEIGHT, animated: false }));
        }}
      >
        {items.map((item) => (
          <Pressable
            key={item}
            accessibilityLabel={`${item}${unit}`}
            style={[s.item, item === selected && s.itemOn]}
            onPress={() => onSelect(item)}
          >
            <Text style={[s.itemText, item === selected && s.itemTextOn]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, marginVertical: 6 },
  toggle: { fontSize: 13, color: C.primary, paddingVertical: 10 },
  hint: { fontSize: 12.5, lineHeight: 20, color: '#686373', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, gap: 4 },
  label: { width: 38, fontSize: 12, lineHeight: 40, color: C.text },
  tilde: { fontSize: 14, lineHeight: 40, color: '#686373' },
  timeColumn: { flex: 1, minWidth: 0 },
  timeBox: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8D3E8',
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  timeInput: { flex: 1, minWidth: 0, height: 38, paddingVertical: 0, fontSize: 14, color: C.text },
  nextDay: { fontSize: 11, lineHeight: 16, color: C.primary, textAlign: 'center' },
  remove: { height: 40, justifyContent: 'center' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.primary,
    borderRadius: 10,
  },
  addText: { fontSize: 13, fontWeight: '700', color: C.primary },
  error: { fontSize: 12, lineHeight: 20, color: '#B3261E', marginTop: 8 },
  save: { fontSize: 13, color: C.primary, paddingVertical: 12, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  sheet: { width: '100%', maxWidth: 312, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'center' },
  sheetValue: { fontSize: 26, lineHeight: 36, fontWeight: '800', color: C.primary, textAlign: 'center', marginTop: 6 },
  columns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  column: { flex: 1 },
  unit: { fontSize: 12, color: '#686373', textAlign: 'center', marginBottom: 4 },
  list: { height: ITEM_HEIGHT * 5, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 10 },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemOn: { backgroundColor: C.primary },
  itemText: { fontSize: 15, color: C.text },
  itemTextOn: { color: '#fff', fontWeight: '700' },
  sheetButtons: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sheetButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#F1F0F5' },
  sheetDone: { backgroundColor: C.primary },
  sheetCancel: { fontSize: 14, color: C.text },
  sheetDoneText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
