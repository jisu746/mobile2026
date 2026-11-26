import { useEffect, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import { Text, TextInput } from './font';
import { api, errorText } from './api';
import { C } from './ui';
import { ymd } from './work';

type Pause = { from: string; to: string };
type Work = {
  id: number;
  from: string;
  to: string | null;
  wage: number | null;
  baseBreakSeconds?: number;
  breakRevision?: number;
  breaks?: string | null;
};
type ConfirmedWork = {
  id: number;
  breaksConfirmed: boolean;
  breaks: Pause[];
  agreedDailyMinutes: number | null;
  breakRevision?: number;
};
type Week = {
  holiday: string;
  prescribedHours: number;
  averagingWeeks: number;
  normalWorkerDays: number;
  wage: number;
  attendanceConfirmed: boolean;
  fullAttendance: boolean;
  workedAtLeastOneDay: boolean;
  employmentWholeWeek: boolean;
  agreedWeeklyMinutes: number | null;
  normalDayHours: number | null;
};
type Holiday = { day: string; premiumEligible: boolean; paidHours: number; wage: number; confirmed: boolean };
type Settings = {
  fiveOrMore: boolean | null;
  voluntaryPremiums: boolean;
  adultHourlyOrdinaryConfirmed: boolean;
  partTime: boolean;
  weekStart: number;
  work: ConfirmedWork[];
  weeks: Week[];
  holidays: Holiday[];
  holidaysConfirmed: boolean;
};
type Data = {
  revision: number;
  settings: Settings;
  records: Work[];
  result: { items: { kind: string; label: string; amount: number }[]; blockers: string[]; notes: string[] };
  hash: string;
  applied: boolean;
  finalized: boolean;
};
const note = { fontSize: 12, lineHeight: 20, color: '#686373' };
const input = {
  height: 44,
  borderWidth: 1,
  borderColor: '#D8D3E8',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 0,
  marginTop: 5,
  marginBottom: 8,
  fontSize: 14,
  color: C.text,
  ...(Platform.OS === 'android' ? { fontFamily: 'sans-serif', includeFontPadding: false } : {}),
};
const label = { fontSize: 13, lineHeight: 21, color: C.text };
const link = { fontSize: 14, lineHeight: 22, color: C.primary, paddingVertical: 12, fontWeight: '700' as const };
const box = { borderTopWidth: 1, borderTopColor: '#E4E2EC', paddingTop: 12, marginTop: 12 };
function Check({ text, value, onChange }: { text: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Switch value={value} onValueChange={onChange} />
      <Text style={{ ...note, flex: 1 }}>{text}</Text>
    </View>
  );
}
function Field({
  title,
  value,
  onChange,
  numeric = false,
}: {
  title: string;
  value: string;
  onChange: (s: string) => void;
  numeric?: boolean;
}) {
  return (
    <>
      <Text style={label}>{title}</Text>
      <TextInput
        accessibilityLabel={title}
        style={input}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        underlineColorAndroid="transparent"
        autoCapitalize="none"
      />
    </>
  );
}
function withDefaults(d: Data): Settings {
  const s = d.settings;
  const work = d.records.map((r) => {
    const existing = s.work.find((w) => w.id === r.id);
    if (existing && (existing.breakRevision ?? 0) === (r.breakRevision ?? 0)) return existing;
    return {
      id: r.id,
      breaksConfirmed: false,
      breaks: r.breaks ? (JSON.parse(r.breaks) as Pause[]) : [],
      agreedDailyMinutes: existing?.agreedDailyMinutes ?? null,
      breakRevision: r.breakRevision ?? 0,
    };
  });
  const weeks = [...s.weeks];
  for (const r of d.records) {
    const dt = new Date(r.from);
    const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const offset = (start.getDay() - (s.weekStart % 7) + 7) % 7;
    start.setDate(start.getDate() - offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    if (
      !weeks.some((w) => {
        const existing = new Date(w.holiday + 'T12:00:00');
        const dif = (existing.getDay() - (s.weekStart % 7) + 7) % 7;
        existing.setDate(existing.getDate() - dif);
        return ymd(existing) === ymd(start);
      })
    ) {
      weeks.push({
        holiday: ymd(end),
        prescribedHours: 0,
        averagingWeeks: 4,
        normalWorkerDays: 20,
        wage: 0,
        attendanceConfirmed: false,
        fullAttendance: false,
        workedAtLeastOneDay: false,
        employmentWholeWeek: false,
        agreedWeeklyMinutes: null,
        normalDayHours: null,
      });
    }
  }
  return { ...s, work, weeks: weeks.sort((a, b) => a.holiday.localeCompare(b.holiday)) };
}
export default function AutomaticPayroll({
  storeId,
  memberId,
  period,
  onApplied,
}: {
  storeId: number;
  memberId: number;
  period: string;
  onApplied: () => void;
}) {
  const path = `/api/stores/${storeId}/staff/${memberId}/payroll/automatic?month=${period}`;
  const [open, setOpen] = useState(false),
    [data, setData] = useState<Data | null>(null),
    [settings, setSettings] = useState<Settings | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [breakText, setBreakText] = useState<Record<number, string>>({}),
    [newHoliday, setNewHoliday] = useState(''),
    [newWeekly, setNewWeekly] = useState('');
  const set = (v: Settings) => {
    setSettings(v);
    setDirty(true);
    setError('');
  };
  const accept = (d: Data) => {
    setData(d);
    setSettings(withDefaults(d));
    setBreakText(
      Object.fromEntries(
        withDefaults(d).work.map((w) => [
          w.id,
          w.breaks.map((b) => `${b.from.replace('T', ' ')} / ${b.to.replace('T', ' ')}`).join('\n'),
        ]),
      ),
    );
    setDirty(false);
  };
  useEffect(() => {
    setData(null);
    setSettings(null);
    setError('');
    setDirty(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    let live = true;
    api<Data>('GET', path).then(
      (d) => {
        if (live) accept(d);
      },
      (e) => {
        if (live) setError(e.message);
      },
    );
    return () => {
      live = false;
    };
  }, [open, path]);
  const save = async () => {
    if (!settings || !data || busy) return;
    setBusy(true);
    setError('');
    try {
      const work = settings.work.map((w) => {
        const text = (breakText[w.id] ?? '').trim();
        const breaks = text
          ? text
              .split('\n')
              .filter(Boolean)
              .map((line) => {
                const parts = line.split('/').map((x) => x.trim().replace(' ', 'T'));
                if (parts.length !== 2 || parts.some((x) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(x)))
                  throw Error(
                    '휴게시간은 YYYY-MM-DD HH:mm / YYYY-MM-DD HH:mm 형식으로 한 줄에 한 구간씩 입력해주세요.',
                  );
                return { from: parts[0], to: parts[1] };
              })
          : [];
        return { ...w, breaks };
      });
      const payload = { ...settings, work };
      const numeric = [
        settings.weekStart,
        ...settings.weeks.flatMap((w) => [
          w.prescribedHours,
          w.averagingWeeks,
          w.normalWorkerDays,
          w.wage,
          ...(w.agreedWeeklyMinutes == null ? [] : [w.agreedWeeklyMinutes]),
          ...(w.normalDayHours == null ? [] : [w.normalDayHours]),
        ]),
        ...settings.holidays.flatMap((h) => [h.paidHours, h.wage]),
        ...work.flatMap((w) => (w.agreedDailyMinutes == null ? [] : [w.agreedDailyMinutes])),
      ];
      if (numeric.some((n) => !Number.isFinite(n))) throw Error('시간과 시급을 숫자로 입력해주세요.');
      const integers = [
        settings.weekStart,
        ...settings.weeks.flatMap((w) => [
          w.averagingWeeks,
          w.normalWorkerDays,
          w.wage,
          ...(w.agreedWeeklyMinutes == null ? [] : [w.agreedWeeklyMinutes]),
        ]),
        ...settings.holidays.map((h) => h.wage),
        ...work.flatMap((w) => (w.agreedDailyMinutes == null ? [] : [w.agreedDailyMinutes])),
      ];
      if (integers.some((n) => !Number.isInteger(n)))
        throw Error('시급·근무일수·산정 주 수·약정 분은 정수로 입력해주세요.');
      accept(await api<Data>('PUT', path, { revision: data.revision, settings: payload }));
    } catch (e) {
      setError(errorText(e, '설정을 저장하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (!data || dirty || busy) return;
    setBusy(true);
    setError('');
    try {
      accept(
        await api<Data>('POST', `/api/stores/${storeId}/staff/${memberId}/payroll/automatic/apply?month=${period}`, {
          hash: data.hash,
        }),
      );
      onApplied();
    } catch (e) {
      setError(errorText(e, '반영하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };
  const patchWeek = (i: number, p: Partial<Week>) =>
    settings && set({ ...settings, weeks: settings.weeks.map((w, j) => (j === i ? { ...w, ...p } : w)) });
  const patchHoliday = (i: number, p: Partial<Holiday>) =>
    settings && set({ ...settings, holidays: settings.holidays.map((h, j) => (j === i ? { ...h, ...p } : h)) });
  return (
    <View style={box}>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={link}>주휴·야간·휴일 자동 계산 {open ? '접기' : '설정'}</Text>
      </Pressable>
      {open && (
        <>
          <Text style={note}>
            성인 시급제·일반 근로시간 기준이에요. 계약시간·개근·실제 휴게와 휴일 적용을 확인하면 서버가 계산해요. 특례
            근로시간제·포괄임금·월급제는 별도 검토가 필요해요.
          </Text>
          {!!error && <Text style={{ ...note, color: '#B3261E' }}>{error}</Text>}
          {!settings && (
            <Pressable
              onPress={() => {
                setOpen(false);
              }}
            >
              <Text style={link}>{error ? '접고 다시 열어 불러오기' : '설정 불러오는 중…'}</Text>
            </Pressable>
          )}
          {settings && data && (
            <>
              <Text style={{ ...label, fontWeight: '700', marginTop: 12 }}>이 직원·이 달의 적용 기준</Text>
              {data.finalized ? (
                <Text style={note}>이미 확정된 명세예요. 저장·반영할 수 없어요.</Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[true, false].map((v) => (
                      <Pressable
                        key={String(v)}
                        onPress={() => set({ ...settings, fiveOrMore: v })}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: C.primary,
                          backgroundColor: settings.fiveOrMore === v ? C.primary : '#fff',
                        }}
                      >
                        <Text style={{ color: settings.fiveOrMore === v ? '#fff' : C.primary, fontSize: 13 }}>
                          상시 {v ? '5인 이상' : '5인 미만'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={note}>
                    계정 수가 아닌 법정 상시근로자 수를 확인해주세요. 5인 미만은 법정 연장·야간·휴일 가산 대상에서
                    제외돼요.
                  </Text>
                  {settings.fiveOrMore === false && (
                    <Check
                      text="5인 미만이지만 계약으로 동일한 가산 지급"
                      value={settings.voluntaryPremiums}
                      onChange={(v) => set({ ...settings, voluntaryPremiums: v })}
                    />
                  )}
                  <Check
                    text="성인 시급제·일반 근로시간제이고, 지급 기준과 통상시급을 확인했어요"
                    value={settings.adultHourlyOrdinaryConfirmed}
                    onChange={(v) => set({ ...settings, adultHourlyOrdinaryConfirmed: v })}
                  />
                  <Check
                    text="통상근로자보다 약정 근로시간이 짧은 단시간 근로자"
                    value={settings.partTime}
                    onChange={(v) => set({ ...settings, partTime: v })}
                  />
                  <Field
                    title="1주 시작 요일 (월 1 ~ 일 7, 근로계약 기준)"
                    value={String(settings.weekStart)}
                    numeric
                    onChange={(v) => set({ ...settings, weekStart: Number(v) })}
                  />
                  <Text style={{ ...label, fontWeight: '700' }}>실제 근무와 무급 휴게시간</Text>
                  <Text style={note}>
                    휴게가 없으면 빈칸으로 두고 확인해주세요. 임의로 30분·1시간을 빼지 않아요. 월초 주간 계산 때문에
                    이전 달 기록도 표시될 수 있어요.
                  </Text>
                  {data.records.map((r) => {
                    const w = settings.work.find((x) => x.id === r.id)!;
                    return (
                      <View key={r.id} style={box}>
                        <Text style={label}>
                          #{r.id} {r.from.replace('T', ' ')} ~ {r.to?.replace('T', ' ') ?? '근무 중'}
                        </Text>
                        <Text style={note}>보존 시급 {r.wage?.toLocaleString() ?? '미확정'}원</Text>
                        <TextInput
                          accessibilityLabel={`근무 ${r.id} 휴게 구간`}
                          multiline
                          placeholder={'2026-11-25 12:00 / 2026-11-25 12:30\n구간마다 줄바꿈 · 휴게 없으면 비움'}
                          style={{ ...input, height: 80, textAlignVertical: 'top', paddingVertical: 8 }}
                          value={breakText[r.id] ?? ''}
                          onChangeText={(v) => {
                            setBreakText((x) => ({ ...x, [r.id]: v }));
                            setDirty(true);
                          }}
                        />
                        {settings.partTime && (
                          <Field
                            title="당일 약정 실근로시간 (휴게 제외, 분)"
                            value={w.agreedDailyMinutes == null ? '' : String(w.agreedDailyMinutes)}
                            numeric
                            onChange={(v) =>
                              set({
                                ...settings,
                                work: settings.work.map((x) =>
                                  x.id === r.id ? { ...x, agreedDailyMinutes: v === '' ? null : Number(v) } : x,
                                ),
                              })
                            }
                          />
                        )}
                        <Check
                          text="실제 휴게 구간을 확인했어요 (없음 포함)"
                          value={w.breaksConfirmed}
                          onChange={(v) =>
                            set({
                              ...settings,
                              work: settings.work.map((x) => (x.id === r.id ? { ...x, breaksConfirmed: v } : x)),
                            })
                          }
                        />
                      </View>
                    );
                  })}
                  <Text style={{ ...label, fontWeight: '700', marginTop: 14 }}>주별 약정·개근 확인</Text>
                  <Text style={note}>
                    4주 평균 1주 약정 15시간 이상과 개근 여부로 판단해요. 입사 4주 미만은 실제 산정 주 수를 입력해요.
                    유급휴가·지각·조퇴를 임의로 결근 처리하면 안 돼요. 단시간 주휴 시간 = 산정 기간 약정시간 합계 ÷ 같은
                    기간 통상근로자 근무일수 (최대 8시간). 통상근로자는 1일 정상 근로시간을 확인해 입력해요.
                  </Text>
                  {settings.weeks.map((w, i) => (
                    <View key={i} style={box}>
                      <Field
                        title="주휴일 (YYYY-MM-DD)"
                        value={w.holiday}
                        onChange={(v) => patchWeek(i, { holiday: v })}
                      />
                      <Field
                        title="산정 기간 약정시간 합계 (휴게·연장 제외, 시간)"
                        value={String(w.prescribedHours)}
                        numeric
                        onChange={(v) => patchWeek(i, { prescribedHours: Number(v) })}
                      />
                      <Field
                        title="산정 주 수 (1~4주)"
                        value={String(w.averagingWeeks)}
                        numeric
                        onChange={(v) => patchWeek(i, { averagingWeeks: Number(v) })}
                      />
                      <Field
                        title="같은 기간 통상근로자의 약정 근무일수"
                        value={String(w.normalWorkerDays)}
                        numeric
                        onChange={(v) => patchWeek(i, { normalWorkerDays: Number(v) })}
                      />
                      <Field
                        title="주휴일 적용 통상시급 (원, 시급 이력 확인)"
                        value={w.wage ? String(w.wage) : ''}
                        numeric
                        onChange={(v) => patchWeek(i, { wage: Number(v) })}
                      />
                      {settings.partTime && (
                        <Field
                          title="해당 주 약정 근로시간 (휴게 제외, 분)"
                          value={w.agreedWeeklyMinutes == null ? '' : String(w.agreedWeeklyMinutes)}
                          numeric
                          onChange={(v) => patchWeek(i, { agreedWeeklyMinutes: v === '' ? null : Number(v) })}
                        />
                      )}
                      {!settings.partTime && (
                        <Field
                          title="통상근로자의 1일 정상 근로시간 (주휴 지급시간, 최대 8시간)"
                          value={w.normalDayHours == null ? '' : String(w.normalDayHours)}
                          numeric
                          onChange={(v) => patchWeek(i, { normalDayHours: v === '' ? null : Number(v) })}
                        />
                      )}
                      <Check
                        text="정해진 근무일에 개근했어요 (지각·조퇴만으로 결근 처리하지 않음)"
                        value={w.fullAttendance}
                        onChange={(v) => patchWeek(i, { fullAttendance: v })}
                      />
                      <Check
                        text="해당 주 실제 출근한 날이 있어요"
                        value={w.workedAtLeastOneDay}
                        onChange={(v) => patchWeek(i, { workedAtLeastOneDay: v })}
                      />
                      <Check
                        text="해당 1주간 근로관계가 유지됐어요"
                        value={w.employmentWholeWeek}
                        onChange={(v) => patchWeek(i, { employmentWholeWeek: v })}
                      />
                      <Check
                        text="위 약정·개근·시급과 지급 대상 여부를 확인했어요"
                        value={w.attendanceConfirmed}
                        onChange={(v) => patchWeek(i, { attendanceConfirmed: v })}
                      />
                      <Pressable onPress={() => set({ ...settings, weeks: settings.weeks.filter((_, j) => j !== i) })}>
                        <Text style={link}>이 주 삭제</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Field
                    title="출근 기록 없는 주의 주휴일 추가 (YYYY-MM-DD)"
                    value={newWeekly}
                    onChange={setNewWeekly}
                  />
                  <Pressable
                    onPress={() => {
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(newWeekly)) {
                        setError('주휴일을 YYYY-MM-DD로 입력해주세요.');
                        return;
                      }
                      set({
                        ...settings,
                        weeks: [
                          ...settings.weeks,
                          {
                            holiday: newWeekly,
                            prescribedHours: 0,
                            averagingWeeks: 4,
                            normalWorkerDays: 20,
                            wage: 0,
                            attendanceConfirmed: false,
                            fullAttendance: false,
                            workedAtLeastOneDay: false,
                            employmentWholeWeek: false,
                            agreedWeeklyMinutes: null,
                            normalDayHours: null,
                          },
                        ],
                      });
                      setNewWeekly('');
                    }}
                  >
                    <Text style={link}>주휴 확인 추가</Text>
                  </Pressable>
                  <Text style={{ ...label, fontWeight: '700' }}>주휴 외 휴일 적용 날짜</Text>
                  <Text style={note}>
                    근로자의 날·공휴일·대체/약정휴일을 확인해 등록해주세요. 달력의 일요일이 모두 휴일근로 대상은
                    아니에요. 휴일대체·주 15시간 미만 적용 제외도 확인해주세요. 유급휴일 임금은 근로 가산과 별개예요.
                    주휴일은 위 주별 설정에만 등록해요.
                  </Text>
                  {settings.holidays.map((h, i) => (
                    <View key={i} style={box}>
                      <Field
                        title="휴일 날짜 (YYYY-MM-DD)"
                        value={h.day}
                        onChange={(v) => patchHoliday(i, { day: v })}
                      />
                      <Check
                        text="이 직원에게 휴일근로 가산이 적용되는 날짜"
                        value={h.premiumEligible}
                        onChange={(v) => patchHoliday(i, { premiumEligible: v })}
                      />
                      <Field
                        title="근무 여부와 별도로 지급할 유급휴일 시간 (해당 없으면 0)"
                        value={String(h.paidHours)}
                        numeric
                        onChange={(v) => patchHoliday(i, { paidHours: Number(v) })}
                      />
                      <Field
                        title="유급휴일 적용 통상시급 (원)"
                        value={h.wage ? String(h.wage) : ''}
                        numeric
                        onChange={(v) => patchHoliday(i, { wage: Number(v) })}
                      />
                      <Check
                        text="휴일 종류·대상·휴일대체·유급 지급시간을 확인했어요"
                        value={h.confirmed}
                        onChange={(v) => patchHoliday(i, { confirmed: v })}
                      />
                      <Pressable
                        onPress={() => set({ ...settings, holidays: settings.holidays.filter((_, j) => j !== i) })}
                      >
                        <Text style={link}>이 휴일 삭제</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Field title="휴일 추가 (YYYY-MM-DD)" value={newHoliday} onChange={setNewHoliday} />
                  <Pressable
                    onPress={() => {
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(newHoliday)) {
                        setError('휴일을 YYYY-MM-DD로 입력해주세요.');
                        return;
                      }
                      set({
                        ...settings,
                        holidays: [
                          ...settings.holidays,
                          { day: newHoliday, premiumEligible: true, paidHours: 0, wage: 0, confirmed: false },
                        ],
                      });
                      setNewHoliday('');
                    }}
                  >
                    <Text style={link}>휴일 추가</Text>
                  </Pressable>
                  <Check
                    text="이 달과 월초 주간 계산에 필요한 휴일·휴일대체를 모두 확인했어요"
                    value={settings.holidaysConfirmed}
                    onChange={(v) => set({ ...settings, holidaysConfirmed: v })}
                  />
                  <Pressable disabled={busy} onPress={() => void save()}>
                    <Text style={link}>{busy ? '처리 중…' : '설정 저장·자동 계산'}</Text>
                  </Pressable>
                </>
              )}
              <View style={box}>
                <Text style={{ ...label, fontWeight: '700' }}>
                  자동 계산 결과 {dirty ? '(입력 변경됨 · 저장 필요)' : ''}
                </Text>
                {data.result.items.map((item) => (
                  <Text key={item.kind} style={note}>
                    {item.label}: {item.amount.toLocaleString('ko-KR')}원
                  </Text>
                ))}
                {data.result.blockers.map((message, i) => (
                  <Text key={i} style={{ ...note, color: '#B3261E' }}>
                    • {message}
                  </Text>
                ))}
                {data.result.notes.map((message, i) => (
                  <Text key={i} style={note}>
                    {message}
                  </Text>
                ))}
                {data.applied && !dirty && <Text style={{ ...label, color: '#237A47' }}>급여 명세에 반영됐어요.</Text>}
                {!data.finalized && (
                  <Pressable
                    disabled={busy || dirty || data.result.blockers.length > 0 || data.applied}
                    onPress={() => void apply()}
                  >
                    <Text
                      style={{
                        ...link,
                        opacity: busy || dirty || data.result.blockers.length > 0 || data.applied ? 0.4 : 1,
                      }}
                    >
                      확인한 자동 계산을 명세에 반영
                    </Text>
                  </Pressable>
                )}
                <Text style={note}>
                  반영할 때 이전 자동 계산은 취소 이력을 남기고 교체해요. 직접 입력한 같은 수당은 먼저 확인·취소해야
                  해요. 근무나 시급이 바뀌면 다시 저장·계산해야 명세를 확정할 수 있어요.
                </Text>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}
