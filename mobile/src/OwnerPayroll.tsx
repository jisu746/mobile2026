// 사장님 직원 급여 목록 → 상세 → 근무 수기 등록 화면
import { useEffect, useMemo, useState } from 'react';
import { useFonts } from 'expo-font';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text as NativeText, TextProps, View } from 'react-native';
import { TextInput } from './font';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';
import { demoPayrollRepository } from './payrollRepository';
import type { PayrollEmployee, PayrollRepository, PayrollShift } from './payrollRepository';

type Props = { storeId: number; onClose: () => void; repository?: PayrollRepository };
const money = (value: number) => Math.round(value).toLocaleString('ko-KR');

export default function OwnerPayroll({ storeId, onClose, repository = demoPayrollRepository }: Props) {
  const period = new Date();
  const year = period.getFullYear();
  const month = period.getMonth() + 1;
  const monthLabel = `${year}년 ${month}월`;
  const [fontsLoaded] = useFonts({ NotoSansKR: require('../assets/NotoSansKR-VF.ttf') });
  const [screen, setScreen] = useState<'list' | 'detail' | 'manual' | 'editShift'>('list');
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selected, setSelected] = useState<PayrollEmployee | null>(null);
  const [editingShift, setEditingShift] = useState<PayrollShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => employees.filter((person) => person.name.includes(query.trim())), [employees, query]);

  const refresh = async () => {
    setLoading(true);
    try { setEmployees(await repository.getEmployees(storeId, year, month)); }
    catch (error) { Alert.alert('급여 정보를 불러오지 못했어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [storeId, repository]);

  const openDetail = async (person: PayrollEmployee) => {
    try {
      setSelected(await repository.getEmployee(storeId, person.id, year, month));
      setScreen('detail');
    } catch (error) { Alert.alert('급여 정보를 불러오지 못했어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'); }
  };

  const addManualShift = async (shift: PayrollShift) => {
    if (!selected) return;
    await repository.addManualShift(storeId, selected.id, year, month, shift);
    const updated = await repository.getEmployee(storeId, selected.id, year, month);
    // Some repositories may return a cached employee right after a successful write.
    // Keep the newly registered shift visible in the detail screen in that case.
    const alreadyListed = updated.shifts.some((item) => item.date === shift.date && item.start === shift.start && item.end === shift.end);
    const visibleUpdated = alreadyListed ? updated : { ...updated, shifts: [shift, ...updated.shifts] };
    setSelected(visibleUpdated);
    setEmployees((current) => current.map((person) => person.id === visibleUpdated.id ? visibleUpdated : person));
  };

  const changeHourlyRate = async (hourlyRate: number) => {
    if (!selected) return;
    await repository.updateHourlyRate(storeId, selected.id, year, month, hourlyRate);
    const updated = await repository.getEmployee(storeId, selected.id, year, month);
    setSelected(updated);
    setEmployees((current) => current.map((person) => person.id === updated.id ? updated : person));
  };

  const saveEditedShift = async (shift: PayrollShift) => {
    if (!selected || !editingShift) return;
    await repository.updateManualShift(storeId, selected.id, year, month, editingShift.id, shift);
    const updated = await repository.getEmployee(storeId, selected.id, year, month);
    setSelected(updated);
    setEmployees((current) => current.map((person) => person.id === updated.id ? updated : person));
    setEditingShift(null);
  };

  if (!fontsLoaded) return <View style={s.root} />;
  if (screen === 'manual' && selected) return <ManualShiftScreen employee={selected} onBack={() => setScreen('detail')} onSaveShift={addManualShift} />;
  if (screen === 'editShift' && selected && editingShift) return <ManualShiftScreen key={editingShift.id} employee={selected} initialShift={editingShift} mode="edit" onBack={() => { setEditingShift(null); setScreen('detail'); }} onSaveShift={saveEditedShift} />;
  if (screen === 'detail' && selected) return <PayrollDetail employee={selected} monthLabel={monthLabel} onBack={() => setScreen('list')} onManual={() => setScreen('manual')} onEditShift={(shift) => { setEditingShift(shift); setScreen('editShift'); }} onHourlyRateChange={changeHourlyRate} />;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable>
        <Text style={s.headerTitle}>직원 급여 관리</Text>
        <Pressable onPress={() => { setSearchOpen((open) => !open); setQuery(''); }} hitSlop={10}>
          <Ionicons name={searchOpen ? 'close' : 'search'} size={22} color={C.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.listBody}>
        {searchOpen && <View style={s.payrollSearchBar}>
          <Ionicons name="search" size={18} color="#828282" />
          <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="직원 검색" style={s.payrollSearchInput} />
        </View>}
        <Text style={s.monthTitle}>{monthLabel}</Text>
        {loading && <Text style={s.empty}>급여 정보를 불러오는 중이에요</Text>}
        {!loading && filtered.map((person) => <PayrollListCard key={person.id} employee={person} onPress={() => openDetail(person)} />)}
        {!loading && !filtered.length && <Text style={s.empty}>{query ? '검색 결과가 없어요' : '직원 급여 정보가 없어요'}</Text>}
      </ScrollView>
    </View>
  );
}

// 급여 화면의 모든 라벨과 버튼 글자는 Noto Sans KR을 사용한다.
function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[s.font, style]} />;
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable>
      <Text style={s.headerTitle}>{title}</Text>
    </View>
  );
}

function EmployeeHeading({ employee, onEditHourlyRate }: { employee: PayrollEmployee; onEditHourlyRate?: () => void }) {
  return (
    <View style={s.employeeHeading}>
      <View style={s.avatar}><Text style={s.avatarText}>{employee.name.slice(0, 1)}</Text></View>
      <View style={s.employeeMeta}>
        <Text style={s.employeeName}>{employee.name}</Text>
        {onEditHourlyRate ? (
          <View style={s.hourlyRateRow}>
            <Text style={s.hourlyRateText}>시급 {money(employee.hourlyRate)}원</Text>
            <Pressable onPress={onEditHourlyRate} hitSlop={8} style={s.hourlyRateEdit}><Text style={s.hourlyRateEditText}>수정</Text><Ionicons name="chevron-forward" size={13} color={C.primary} /></Pressable>
          </View>
        ) : <Text style={s.rateSummary}>시급 {money(employee.hourlyRate)}원 · {employee.days}일({employee.hours.toFixed(1)}시간)</Text>}
      </View>
    </View>
  );
}

function PaySummary({ employee, clickable = false }: { employee: PayrollEmployee; clickable?: boolean }) {
  return (
    <View style={s.paySummary}>
      <View style={{ flex: 1 }}>
        <Text style={s.payBreakdown}>기본 {money(employee.regularPay)} + 주휴 {money(employee.holidayPay)}</Text>
        <View style={s.totalLine}><Text style={s.totalAmount}>{money(employee.totalPay)}</Text><Text style={s.totalWon}>원</Text></View>
      </View>
      {clickable && <Ionicons name="chevron-forward" size={17} color={C.primary} />}
    </View>
  );
}

function PayrollListCard({ employee, onPress }: { employee: PayrollEmployee; onPress: () => void }) {
  return (
    <Pressable style={s.listCard} onPress={onPress}>
      <EmployeeHeading employee={employee} />
      <PaySummary employee={employee} clickable />
    </Pressable>
  );
}

function PayrollDetail({ employee, monthLabel, onBack, onManual, onEditShift, onHourlyRateChange }: { employee: PayrollEmployee; monthLabel: string; onBack: () => void; onManual: () => void; onEditShift: (shift: PayrollShift) => void; onHourlyRateChange: (hourlyRate: number) => Promise<void> }) {
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateInput, setRateInput] = useState(String(employee.hourlyRate));
  const [savingRate, setSavingRate] = useState(false);

  const saveHourlyRate = async () => {
    const hourlyRate = Number(rateInput.replace(/,/g, '').trim());
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) { Alert.alert('시급 입력 확인', '1원 이상의 금액을 입력해 주세요.'); return; }
    setSavingRate(true);
    try {
      await onHourlyRateChange(Math.round(hourlyRate));
      setRateModalOpen(false);
      Alert.alert('시급 변경 완료', '수정한 시급은 다음 근무부터 적용돼요.');
    }
    catch (error) { Alert.alert('시급 저장 실패', error instanceof Error ? error.message : '시급을 저장하지 못했어요.'); }
    finally { setSavingRate(false); }
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="직원 급여 관리" onBack={onBack} />
      <ScrollView contentContainerStyle={s.detailBody}>
        <Text style={s.monthTitle}>{monthLabel}</Text>
        <View style={s.detailCard}>
          <EmployeeHeading employee={employee} onEditHourlyRate={() => { setRateInput(String(employee.hourlyRate)); setRateModalOpen(true); }} />
          <View style={s.statsRow}>
            <Stat label="이번 달 근무" value={employee.hours.toFixed(1)} unit="시간" />
            <Stat label="예상 급여" value={(employee.totalPay / 10000).toFixed(1)} unit="만원" />
            <Stat label="근속" value={`${employee.monthsEmployed >= 12 ? `${Math.floor(employee.monthsEmployed / 12)}년 ` : ''}${employee.monthsEmployed % 12}`} unit="개월" />
          </View>
          <PaySummary employee={employee} />
          <Pressable style={s.manualButton} onPress={onManual}>
            <Text style={s.manualButtonText}>+ 근무 수기 등록</Text><Ionicons name="chevron-forward" size={19} color="#fff" />
          </Pressable>
        </View>
        <View style={s.recordHeading}>
          <Text style={s.recordTitle}>상세 근무 내역</Text>
          <Text style={s.recordHint}>근무 내역 수정 시 직원에게 알림이 전송돼요.</Text>
        </View>
        {employee.shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} hourlyRate={employee.hourlyRate} onEdit={() => onEditShift(shift)} />)}
      </ScrollView>
      <Modal visible={rateModalOpen} transparent animationType="fade" onRequestClose={() => setRateModalOpen(false)}>
        <View style={s.rateModalBackdrop}>
          <View style={s.rateModalCard}>
            <Text style={s.rateModalTitle}>시급 수정</Text>
            <Text style={s.rateModalDescription}>{employee.name}님의 시급을 입력해 주세요.</Text>
            <View style={s.rateInputRow}>
              <TextInput autoFocus value={rateInput} onChangeText={(value) => setRateInput(value.replace(/[^0-9,]/g, ''))} keyboardType="number-pad" style={s.rateInput} />
              <Text style={s.rateInputUnit}>원</Text>
            </View>
            <Text style={s.rateEffectiveNote}>수정한 시급은 다음 근무부터 적용돼요.</Text>
            <View style={s.rateModalActions}>
              <Pressable style={[s.rateModalButton, s.rateCancelButton]} onPress={() => setRateModalOpen(false)}><Text style={s.rateCancelText}>취소</Text></Pressable>
              <Pressable disabled={savingRate} style={[s.rateModalButton, s.rateSaveButton, savingRate && { opacity: 0.6 }]} onPress={() => void saveHourlyRate()}><Text style={s.rateSaveText}>{savingRate ? '저장 중...' : '저장'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <View style={s.statValueLine}><Text style={s.statValue}>{value}</Text><Text style={s.statUnit}>{unit}</Text></View>
    </View>
  );
}

function ShiftCard({ shift, hourlyRate, onEdit }: { shift: PayrollShift; hourlyRate: number; onEdit: () => void }) {
  return (
    <View style={s.shiftCard}>
      <View style={s.shiftTop}><Text style={s.shiftDate}>{shiftDateLabel(shift.date)} ({shift.weekday})</Text><Pressable onPress={onEdit} style={s.editLink}><Ionicons name="pencil" size={12} color="#474550" /><Text style={s.editText}>수정</Text></Pressable></View>
      <View style={s.shiftMiddle}><Text style={s.shiftTime}>{shift.start} 출근 - {shift.end} 퇴근</Text><Text style={s.shiftAmount}>{money(shift.amount)}원</Text></View>
      <View style={s.rateChip}><Text style={s.rateChipText}>시급 {money(shift.hourlyRate ?? hourlyRate)}원 적용</Text></View>
    </View>
  );
}

function ManualShiftScreen({ employee, onBack, onSaveShift, initialShift, mode = 'create' }: { employee: PayrollEmployee; onBack: () => void; onSaveShift: (shift: PayrollShift) => Promise<void>; initialShift?: PayrollShift; mode?: 'create' | 'edit' }) {
  const [date, setDate] = useState(() => dateFromShift(initialShift));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [clockIn, setClockIn] = useState(initialShift?.start ?? '14:00');
  const [clockOut, setClockOut] = useState(initialShift?.end ?? '19:00');
  const [breakMinutes, setBreakMinutes] = useState(initialShift?.breakMinutes === undefined ? '' : String(initialShift.breakMinutes));
  const [hourlyRateInput, setHourlyRateInput] = useState(String(initialShift?.hourlyRate ?? employee.hourlyRate));
  const [saving, setSaving] = useState(false);
  const hourlyRate = mode === 'edit' ? Number(hourlyRateInput.replace(/,/g, '')) || 0 : employee.hourlyRate;
  const grossMinutes = (timeMinutes(clockOut) - timeMinutes(clockIn) + 1440) % 1440;
  const recognizedMinutes = Math.max(0, grossMinutes - (Number(breakMinutes) || 0));
  const duration = recognizedMinutes / 60;
  const payable = Math.max(0, Math.round(duration * hourlyRate));
  const dateText = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}.`;
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

  const save = async () => {
    if (!isValidTime(clockIn) || !isValidTime(clockOut)) { Alert.alert('시간 입력 확인', '출근과 퇴근 시간을 00:00 형식으로 입력해 주세요.'); return; }
    if (recognizedMinutes <= 0) { Alert.alert('입력 확인', '근무 시간과 휴게 시간을 확인해 주세요.'); return; }
    if (hourlyRate <= 0) { Alert.alert('시급 입력 확인', '1원 이상의 시급을 입력해 주세요.'); return; }
    const today = new Date();
    if (date.getFullYear() !== today.getFullYear() || date.getMonth() !== today.getMonth()) { Alert.alert('날짜 확인', '현재 급여 월의 날짜를 선택해 주세요.'); return; }
    setSaving(true);
    try {
      await onSaveShift({ id: initialShift?.id ?? `manual-${Date.now()}`, date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, weekday, start: clockIn, end: clockOut, amount: payable, breakMinutes: Number(breakMinutes) || 0, hourlyRate });
      Alert.alert(mode === 'edit' ? '수정 완료' : '등록 완료', mode === 'edit' ? '근무 내역을 수정했어요.' : '근무 내역을 추가했어요.');
      onBack();
    } catch (error) { Alert.alert('등록 실패', error instanceof Error ? error.message : '근무 내역을 등록하지 못했어요.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={s.root}>
      <ScreenHeader title={mode === 'edit' ? '근무 내역 수정' : '근무 수기 등록'} onBack={onBack} />
      <ScrollView contentContainerStyle={s.manualBody}>
        {mode === 'create' && <View style={s.manualEmployee}><Text style={s.manualName}>{employee.name}</Text><Text style={s.manualRate}>시급 {money(hourlyRate)}원</Text></View>}
        {mode === 'edit' && <View style={s.formCard}>
          <Text style={s.formLabel}>적용 시급</Text>
          <View style={s.rateInputRow}>
            <TextInput value={hourlyRateInput} onChangeText={(value) => setHourlyRateInput(value.replace(/[^0-9,]/g, ''))} keyboardType="number-pad" maxLength={9} style={s.rateInput} />
            <Text style={s.rateInputUnit}>원</Text>
          </View>
          <Text style={s.rateEffectiveNote}>이 근무 내역에만 적용돼요.</Text>
        </View>}
        <View style={s.formCard}>
          <Text style={s.formLabel}>근무 일자</Text>
          <Pressable style={s.dateInputRow} onPress={() => setCalendarOpen(true)}>
            <Text style={s.dateInput}>{dateText}</Text>
            <Ionicons name="calendar-outline" size={19} color={C.text} />
          </Pressable>
        </View>
        <View style={s.timeCard}>
          <Text style={s.formLabel}>근무 시간</Text>
          <View style={s.clockInputRow}>
            <View style={s.clockInputGroup}>
              <Text style={s.clockInputLabel}>출근</Text>
              <TextInput value={clockIn} onChangeText={setClockIn} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} style={s.clockInput} />
            </View>
            <View style={s.clockInputGroup}>
              <Text style={s.clockInputLabel}>퇴근</Text>
              <TextInput value={clockOut} onChangeText={setClockOut} placeholder="18:00" keyboardType="numbers-and-punctuation" maxLength={5} style={s.clockInput} />
            </View>
          </View>
        </View>
        <View style={s.breakCard}>
          <Text style={s.formLabel}>휴게 시간</Text>
          <View style={s.breakInputRow}>
            <Pressable style={s.breakStepButton} onPress={() => setBreakMinutes(String(Math.max(0, (Number(breakMinutes) || 0) - 10)))}><Ionicons name="remove" size={18} color={C.primary} /></Pressable>
            <TextInput value={breakMinutes} placeholder="0" onChangeText={(value) => setBreakMinutes(value.replace(/\D/g, ''))} keyboardType="number-pad" style={s.breakInput} />
            <Text style={s.breakUnit}>분</Text>
            <Pressable style={s.breakStepButton} onPress={() => setBreakMinutes(String((Number(breakMinutes) || 0) + 10))}><Ionicons name="add" size={18} color={C.primary} /></Pressable>
          </View>
        </View>
        <View style={s.estimateCard}>
          <Text style={s.estimateCaption}>실 인정 근무 시간 {formatDuration(recognizedMinutes)} (휴게 시간 제외)</Text>
          <View style={s.estimateRow}><Text style={s.estimateLabel}>지급 예정 금액</Text><Text style={s.estimateAmount}>{money(payable)}원</Text></View>
        </View>
        <Pressable disabled={saving} style={[s.saveButton, saving && { opacity: 0.65 }]} onPress={save}><Text style={s.saveButtonText}>{saving ? '저장 중...' : mode === 'edit' ? '수정 완료' : '등록하기'}</Text></Pressable>
      </ScrollView>
      <DateCalendar visible={calendarOpen} selectedDate={date} onClose={() => setCalendarOpen(false)} onSelect={(value) => { setDate(value); setCalendarOpen(false); }} />
    </View>
  );
}

function DateCalendar({ visible, selectedDate, onClose, onSelect }: { visible: boolean; selectedDate: Date; onClose: () => void; onSelect: (date: Date) => void }) {
  const [month, setMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  useEffect(() => {
    if (visible) setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [visible, selectedDate]);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => index - offset + 1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.calendarBackdrop}>
        <View style={s.calendarCard}>
          <View style={s.calendarHeader}>
            <Text style={s.calendarTitle}>{year}년 {monthIndex + 1}월</Text>
            <View style={s.calendarArrows}>
              <Pressable onPress={() => setMonth(new Date(year, monthIndex - 1, 1))} hitSlop={8}><Ionicons name="chevron-back" size={21} color={C.text} /></Pressable>
              <Pressable onPress={() => setMonth(new Date(year, monthIndex + 1, 1))} hitSlop={8}><Ionicons name="chevron-forward" size={21} color={C.text} /></Pressable>
            </View>
          </View>
          <View style={s.calendarGrid}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => <View key={day} style={s.calendarCell}><Text style={s.calendarWeekday}>{day}</Text></View>)}
            {cells.map((day, index) => {
              const inMonth = day >= 1 && day <= days;
              const isSelected = inMonth && selectedDate.getFullYear() === year && selectedDate.getMonth() === monthIndex && selectedDate.getDate() === day;
              return <View key={index} style={s.calendarCell}>
                {inMonth && <Pressable style={[s.calendarDay, isSelected && s.calendarDaySelected]} onPress={() => onSelect(new Date(year, monthIndex, day))}>
                  <Text style={[s.calendarDayText, isSelected && s.calendarDayTextSelected]}>{day}</Text>
                </Pressable>}
              </View>;
            })}
          </View>
          <Pressable style={s.calendarCancel} onPress={onClose}><Text style={s.calendarCancelText}>닫기</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function dateFromShift(shift?: PayrollShift) {
  if (!shift) return new Date();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(shift.date);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const match = /(\d+)월\s*(\d+)일/.exec(shift.date);
  if (!match) return new Date();
  return new Date(new Date().getFullYear(), Number(match[1]) - 1, Number(match[2]));
}

function shiftDateLabel(value: string) {
  const date = dateFromShift({ id: '', date: value, weekday: '', start: '', end: '', amount: 0 });
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function timeMinutes(value: string) {
  if (!isValidTime(value)) return 0;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function isValidTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text, flex: 1 },
  font: { fontFamily: 'NotoSansKR' },
  payrollSearchBar: { height: 42, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  payrollSearchInput: { flex: 1, minWidth: 0, fontSize: 13, color: C.text, paddingVertical: 0, fontFamily: 'NotoSansKR' },
  listBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  monthTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginHorizontal: 2, marginBottom: 12 },
  listCard: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 16, marginBottom: 20 },
  employeeHeading: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: C.primary },
  employeeMeta: { flex: 1, minWidth: 0 },
  employeeName: { fontSize: 15, fontWeight: '700', color: C.text },
  rateSummary: { fontSize: 12.5, color: '#474550' },
  hourlyRateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  hourlyRateText: { fontSize: 12, color: '#5E5C6B' },
  hourlyRateEdit: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  hourlyRateEditText: { fontSize: 11, color: C.primary, fontWeight: '600' },
  paySummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F2F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 },
  payBreakdown: { fontSize: 11, color: '#474550' },
  totalLine: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  totalAmount: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#1B1B20' },
  totalWon: { fontSize: 11, color: '#474550' },
  empty: { textAlign: 'center', paddingVertical: 28, color: '#828282', fontSize: 13 },
  detailBody: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  detailCard: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 18, marginBottom: 12 },
  stat: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 12, padding: 10 },
  statLabel: { fontSize: 11.5, color: '#5E5C6B' },
  statValueLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: C.text },
  statUnit: { fontSize: 10.5, color: '#5E5C6B' },
  manualButton: { height: 44, borderRadius: 12, backgroundColor: C.primary, marginTop: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manualButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  recordHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 20, marginBottom: 12 },
  recordTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  recordHint: { fontSize: 10, color: '#5E5C6B' },
  shiftCard: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 12, marginBottom: 16 },
  shiftTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftDate: { fontSize: 16, fontWeight: '700', color: C.text },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  editText: { fontSize: 11, color: '#474550' },
  shiftMiddle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  shiftTime: { fontSize: 11, color: '#474550' },
  shiftAmount: { fontSize: 15, color: '#1B1B20' },
  rateChip: { borderRadius: 10, backgroundColor: '#F5F2F9', paddingHorizontal: 12, paddingVertical: 7 },
  rateChipText: { fontSize: 11, color: '#474550' },
  manualBody: { paddingHorizontal: 30, paddingTop: 10, paddingBottom: 28 },
  manualEmployee: { height: 43, borderRadius: 10, backgroundColor: '#F5F2F9', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  manualName: { fontSize: 15, fontWeight: '700', color: C.text },
  manualRate: { fontSize: 12, color: '#474550' },
  formCard: { borderRadius: 10, backgroundColor: '#FCFBFD', padding: 10, marginBottom: 10 },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#1E1E1E', marginBottom: 8 },
  dateInputRow: { height: 42, borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 10, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  dateInput: { flex: 1, fontSize: 15, color: '#1E1E1E', fontFamily: 'NotoSansKR' },
  timeCard: { borderRadius: 12, backgroundColor: 'rgba(245,242,249,0.27)', padding: 12, marginBottom: 14 },
  clockInputRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  clockInputGroup: { flex: 1, gap: 6 },
  clockInputLabel: { fontSize: 12, color: '#5E5C6B', fontFamily: 'NotoSansKR' },
  clockInput: { height: 44, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 12, fontSize: 16, color: C.text, fontFamily: 'NotoSansKR' },
  breakCard: { minHeight: 82, borderRadius: 10, backgroundColor: '#FCFBFD', padding: 10, marginBottom: 16 },
  breakInputRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  breakStepButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  breakInput: { width: 42, height: 32, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 8, textAlign: 'center', fontSize: 14, color: C.text, padding: 0, fontFamily: 'NotoSansKR' },
  breakUnit: { color: '#5E5C6B', fontSize: 12 },
  estimateCard: { minHeight: 55, borderRadius: 10, backgroundColor: '#FCFBFD', paddingHorizontal: 12, paddingVertical: 7, justifyContent: 'space-between' },
  estimateCaption: { fontSize: 10, color: '#1E1E1E' },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  estimateLabel: { fontSize: 10, color: '#1E1E1E' },
  estimateAmount: { fontSize: 11, fontWeight: '600', color: '#1E1E1E' },
  saveButton: { height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  calendarBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,35,0.42)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendarCard: { width: '100%', maxWidth: 340, borderRadius: 18, backgroundColor: '#fff', padding: 18 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calendarTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  calendarArrows: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', height: 40, alignItems: 'center', justifyContent: 'center' },
  calendarWeekday: { fontSize: 12, fontWeight: '600', color: '#777482' },
  calendarDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calendarDaySelected: { backgroundColor: C.primary },
  calendarDayText: { fontSize: 13, color: C.text },
  calendarDayTextSelected: { color: '#fff', fontWeight: '700' },
  calendarCancel: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  calendarCancelText: { color: C.primary, fontSize: 14, fontWeight: '700' },
  rateModalBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,35,0.42)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  rateModalCard: { width: '100%', maxWidth: 340, borderRadius: 16, backgroundColor: '#fff', padding: 20 },
  rateModalTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  rateModalDescription: { fontSize: 13, color: '#777482', marginTop: 6, marginBottom: 16 },
  rateInputRow: { height: 48, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  rateInput: { flex: 1, width: 0, minWidth: 0, padding: 0, fontSize: 17, color: C.text, fontFamily: 'NotoSansKR', textAlign: 'right' },
  rateInputUnit: { fontSize: 14, color: '#5E5C6B', marginLeft: 8 },
  rateEffectiveNote: { fontSize: 11, color: '#777482', marginTop: 8 },
  rateModalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  rateModalButton: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rateCancelButton: { backgroundColor: '#F4F3F7' },
  rateSaveButton: { backgroundColor: C.primary },
  rateCancelText: { fontSize: 14, color: '#5E5C6B', fontWeight: '600' },
  rateSaveText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
