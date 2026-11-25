import NotificationBell from './NotificationBell';
import StoreDetailsEditor from './StoreDetailsEditor';
// MY 탭 화면 (프로필, 소속 매장, 로그아웃) - 사장님·직원 공통
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInputProps, TextProps, View } from 'react-native';
import { Text as AppText, TextInput } from './font';
import { Ionicons } from '@expo/vector-icons';
import { Account } from './auth';
import { validateProfile } from './profileValidation';
import NotificationSettings from './NotificationSettings';
import ChangePassword from './ChangePassword';
import StoreOperationEditor from './StoreOperationEditor';
import StoreTemplateEditor from './StoreTemplateEditor';

function Text(props: TextProps) { return <AppText {...props} style={[Platform.OS === 'android' && { fontFamily: 'sans-serif', includeFontPadding: false }, props.style]} />; }
import { C } from './ui';
import type { Store } from './auth';
import { contractRepository } from './contractRepository';
import type { EmploymentContract } from './contractRepository';
import { hoursByDay, hr, listSessions, useMe, won } from './work';
import { summarizePay } from './payCalculation';

type Props = {
  id: string;
  acc: Account;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onLogout: () => void;
  onBell: () => void;
  onRecords: () => void;
  onEmployeeRequests: () => void;
  onEmployees: () => void;
  onPayroll: () => void;
  onContracts: () => void;
  onSaveProfile: (values: { name: string; birth: string; storeName?: string }) => Promise<void>;
};

const dot = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

export default function Profile({ id, acc, onSelect, onAdd, onLogout, onBell, onRecords, onEmployeeRequests, onEmployees, onPayroll, onContracts, onSaveProfile }: Props) {
  const owner = acc.role === 'owner';
  const [switching, setSwitching] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword,setChangingPassword]=useState(false);
  const [staffContractOpen, setStaffContractOpen] = useState(false);
  const [staffHours, setStaffHours] = useState<number | null>(null);
  const [staffPay, setStaffPay] = useState<ReturnType<typeof summarizePay> | null>(null);
  const store = acc.stores[acc.current];
  const storeId = store?.id ?? 0;

  // 직원: 예상 급여는 사장님이 정한 시급, 근속은 서버 입사일로 계산한다
  const me = useMe(storeId);
  const now = new Date();
  const months = me.joinedAt
    ? Math.max(0, (now.getFullYear() - me.joinedAt.getFullYear()) * 12 + now.getMonth() - me.joinedAt.getMonth() - (now.getDate() < me.joinedAt.getDate() ? 1 : 0))
    : 0;

  useEffect(() => {
    if (owner || !store?.id) { setStaffHours(null); setStaffPay(null); return; }
    setStaffHours(null); setStaffPay(null);
    let active = true;
    const now = new Date();
    listSessions(store.id, now.getFullYear(), now.getMonth() + 1).then((sessions) => {
      if (!active) return;
      setStaffHours(Object.values(hoursByDay(sessions)).reduce((sum, hours) => sum + hours, 0));
      setStaffPay(summarizePay(sessions));
    }).catch(() => { if (active) { setStaffHours(null); setStaffPay(null); } });
    return () => { active = false; };
  }, [owner, store?.id]);

  if (changingPassword) return <ChangePassword username={id} onBack={()=>setChangingPassword(false)} onLogout={onLogout}/>;
  if (staffContractOpen) return <StaffContractScreen employeeId={id} employeeName={acc.name} storeId={store?.id ?? 0} onBack={() => setStaffContractOpen(false)} />;
  if (showNotificationSettings) return <NotificationSettings userId={id} storeId={store?.id ?? 0} onBack={() => setShowNotificationSettings(false)} />;
  if (editingProfile) return <ProfileEditScreen acc={acc} store={owner ? store : undefined} onBack={() => setEditingProfile(false)} onSave={onSaveProfile} />;

  return (
    <ScrollView contentContainerStyle={s.body}>
      <View style={s.header}>
        <Text style={s.title}>MY</Text>
        <Pressable onPress={onBell} hitSlop={8}>
          <NotificationBell storeId={acc.stores[acc.current]?.id ?? 0}/>
        </Pressable>
      </View>

      <View style={s.me}>
        <View style={s.initial} accessible accessibilityRole="image" accessibilityLabel={owner ? '사장님 프로필' : '직원 프로필'}>
          <Ionicons name={owner ? 'briefcase-outline' : 'person-outline'} size={28} color={C.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name}>{acc.name}</Text>
          <Text style={s.sub}>{id}</Text>
          {!!initialBirthInput(acc.birth) && <Text style={s.sub}>생년월일 {formatBirthInput(acc.birth)}</Text>}
        </View>
        <Pressable style={s.editBtn} onPress={() => setEditingProfile(true)}>
          <Text style={s.editText}>프로필 수정</Text>
        </Pressable>
      </View>

      <Pressable style={[s.card, s.storeCard]} onPress={() => setSwitching(!switching)}>
        {owner ? <Image source={require('../assets/storemate-store-icon.png')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityLabel="StoreMate" /> : <Ionicons name="storefront" size={34} color={C.primary} />}
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

      {owner ? (
        <>
          <Text style={[s.section, s.ownerSection]}>직원 관리</Text>
          <View style={s.card}>
            <OwnerMenuRow icon="people-outline" title="직원 및 등록 요청" subtitle="실시간 가입 요청 및 근무 직원" onPress={onEmployeeRequests} />
          </View>
          <View style={[s.card, s.ownerCard]}>
            <OwnerMenuRow icon="people-outline" title="직원 관리" subtitle="정보 수정 및 목록 관리" onPress={onEmployees} />
          </View>

          <Text style={s.section}>급여 및 서류</Text>
          <View style={s.card}>
            <MenuRow icon="cash-outline" label="직원 급여 관리" onPress={onPayroll} />
            <View style={s.line} />
            <MenuRow icon="document-text-outline" label="근로계약서 관리" onPress={onContracts} />
          </View>

          <Text style={[s.section, s.ownerSettings]}>앱 설정</Text><StoreOperationEditor storeId={storeId}/><StoreTemplateEditor storeId={storeId}/><StoreDetailsEditor storeId={storeId}/>
          <View style={[s.card, { marginTop: 12 }]}>
            <MenuRow icon="notifications-outline" label="알림 설정" gray onPress={() => setShowNotificationSettings(true)} />
          </View>
        </>
      ) : (
        <>
          <View style={s.stats}>
            <Stat label="이번 달 근무">{staffHours === null ? '—' : hr(staffHours)}<Unit>시간</Unit></Stat>
            <Stat label="기본 급여 예상">{staffPay === null ? '—' : (Math.round(staffPay.knownPay / 1000) / 10).toFixed(1)}<Unit>만원</Unit></Stat>
            <Stat label="근속">{months >= 12 && <>{Math.floor(months / 12)}<Unit>년 </Unit></>}{months % 12}<Unit>개월</Unit></Stat>
          </View>
          <Text style={s.summaryNote}>근무별 보존 시급 기준 · 현재 시급 {won(me.wage)}원{me.wageSet ? '' : ' (기본)'}</Text>
          {!!staffPay?.unconfirmed && <Text style={s.summaryNote}>시급 미확정 {staffPay.unconfirmed}건은 금액 합산에서 제외함</Text>}
          <Text style={s.section}>근무 · 급여</Text>
          <View style={s.card}>
            <MenuRow icon="document-text-outline" label="근로계약서" onPress={() => setStaffContractOpen(true)} />
            <View style={s.line} />
            <MenuRow icon="calendar-outline" label="근무 기록" onPress={onRecords} />
          </View>
          <Text style={s.section}>앱 설정</Text>
          <View style={s.card}>
            <MenuRow icon="notifications-outline" label="알림 설정" gray onPress={() => setShowNotificationSettings(true)} />
          </View>
        </>
      )}
      <Text style={s.section}>계정 설정</Text>
      <View style={s.card}><MenuRow icon="lock-closed-outline" label="비밀번호 변경" onPress={()=>setChangingPassword(true)}/></View>
      <Pressable style={s.logout} onPress={onLogout}>
        <Text style={s.logoutText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

function StaffContractScreen({ employeeId, employeeName, storeId, onBack }: { employeeId: string; employeeName: string; storeId: number; onBack: () => void }) {
  const [contract, setContract] = useState<EmploymentContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    contractRepository.getForEmployee(storeId, employeeId, employeeName)
      .then((value) => { if (active) setContract(value); })
      .catch(() => { if (active) setError('저장된 계약서를 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId, employeeId, employeeName]);
  return (
    <View style={s.editRoot}>
      <View style={s.editHeader}>
        <Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable>
        <Text style={s.editTitle}>근로계약서</Text>
      </View>
      <ScrollView contentContainerStyle={s.contractBody}>
        {loading ? <Text style={s.contractMessage}>계약서를 확인하고 있어요.</Text>
          : error ? <Text style={s.contractMessage}>{error}</Text>
          : contract ? <>
            <Text style={s.contractDate}>등록일 {new Date(contract.capturedAt).toLocaleDateString('ko-KR')}</Text>
            <Image source={{ uri: contract.photoUri }} style={s.contractImage} resizeMode="contain" />
          </> : <Text style={s.contractMessage}>등록된 근로계약서가 없어요. 사장님이 계약서를 등록하면 여기에 표시돼요.</Text>}
      </ScrollView>
    </View>
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

function ProfileEditScreen({ acc, store, onBack, onSave }: { acc: Account; store?: Store; onBack: () => void; onSave: Props['onSaveProfile'] }) {
  const [name, setName] = useState(acc.name);
  const [birth, setBirth] = useState(initialBirthInput(acc.birth));
  const [storeName, setStoreName] = useState(store?.baseName ?? store?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState('');
  const working=useRef(false);

  const save = async () => {
    if(working.current)return;
    let cleanName:string;
    try{cleanName=validateProfile(name,birth).name;}catch(e){setFormError(e instanceof Error?e.message:'이름과 생년월일을 확인해 주세요.');return;}
    if (store && !storeName.trim()) { setFormError('매장 이름을 입력해 주세요.'); return; }
    working.current=true;setSaving(true);
    setSaved(false);
    setFormError('');
    try {
      await onSave({ name: cleanName, birth, ...(store ? { storeName: storeName.trim() } : {}) });
      setSaved(true);
      setTimeout(onBack, 2200);
    } catch (error) {
      setFormError(error instanceof Error ? `저장하지 못했어요: ${error.message}` : '프로필 정보를 저장하지 못했어요.');
    } finally { working.current=false;setSaving(false); }
  };

  return (
    <View style={s.editRoot}>
      <View style={s.editHeader}>
        <Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable>
        <Text style={s.editTitle}>프로필 수정</Text>
      </View>
      <ScrollView contentContainerStyle={s.editBody} keyboardShouldPersistTaps="handled">
        <EditField label="이름">
          <ProfileInput value={name} onChangeText={(value) => { setName(value); setSaved(false); setFormError(''); }} placeholder="이름" maxLength={30} />
        </EditField>
        <EditField label="생년월일">
          <ProfileInput
            value={formatBirthInput(birth)}
            onChangeText={(value) => { setBirth(value.replace(/\D/g, '').slice(0, 8)); setSaved(false); setFormError(''); }}
            placeholder="YYYY.MM.DD"
            placeholderTextColor="#A3A1B0"
            keyboardType="number-pad"
            maxLength={10}
           
          />
        </EditField>
        {store && <EditField label="매장 이름">
          <ProfileInput value={storeName} onChangeText={(value) => { setStoreName(value); setSaved(false); setFormError(''); }} placeholder="매장 이름" maxLength={50} />
        </EditField>}
        {!!formError && <Text style={s.editError}>{formError}</Text>}
        <Pressable disabled={saving} style={[s.editSaveButton, saved && s.editSavedButton, saving && { opacity: 0.6 }]} onPress={() => void save()}>
          <Text style={[s.editSaveText, saved && s.editSavedText]}>{saving ? '저장 중...' : saved ? '저장됨' : '저장하기'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ProfileInput(props: TextInputProps) {
  return <View style={s.editInputFrame}><TextInput {...props} underlineColorAndroid="transparent" style={s.editInput} /></View>;
}
function formatBirthInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

function initialBirthInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return '';
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(year, month - 1, day);
  if (year < 1900 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return digits;
}

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return <View style={s.editField}><Text style={s.editLabel}>{label}</Text>{children}</View>;
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

function OwnerMenuRow({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={s.ownerMenu} onPress={onPress}>
      <View style={s.ownerMenuIcon}><Ionicons name={icon} size={20} color="#fff" /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.ownerMenuTitle}>{title}</Text>
        <Text style={s.ownerMenuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#171717" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  editRoot: { flex: 1, backgroundColor: '#fff' },
  editHeader: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  editTitle: { lineHeight: 26, fontSize: 18, fontWeight: '700', color: C.text },
  editBody: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  editField: { marginBottom: 18 },
  editLabel: { lineHeight: 20, fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
  editInputFrame: { height: 48, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  editInput: { flex: 1, width: '100%', borderWidth: 0, borderBottomWidth: 0, borderBottomColor: 'transparent', outlineWidth: 0, backgroundColor: '#fff', paddingHorizontal: 12, fontSize: 15, color: C.text, ...(Platform.OS === 'android' ? { fontFamily: 'sans-serif', paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' as const } : {}) },
  editSaveButton: { height: 48, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  editSavedButton: { backgroundColor: '#ECEAF7' },
  editSavedText: { color: C.primary },
  editError: { fontSize: 13, color: '#C0392B', marginTop: -6, marginBottom: 6 },
  editSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: C.text },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  initial: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  name: { lineHeight: 26, fontSize: 19, fontWeight: '700', color: C.text },
  sub: { lineHeight: 20, fontSize: 13, color: '#5E5C6B', marginTop: 2 },
  editBtn: { ...(Platform.OS === 'android' ? { alignSelf: 'flex-start' as const, marginTop: 2 } : {}), height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: '#CFCCDB', alignItems: 'center', justifyContent: 'center' },
  editText: { lineHeight: 20, fontSize: 13.5, fontWeight: '700', color: C.primary },
  card: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 12, backgroundColor: '#fff' },
  storeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 18 },
  storeName: { fontSize: 15, fontWeight: '700', color: C.text },
  storeSub: { fontSize: 12.5, color: '#5E5C6B', marginTop: 2 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  summaryNote: { fontSize: 11, color: '#828282', marginTop: 7 },
  contractBody: { paddingHorizontal: 20, paddingVertical: 18, flexGrow: 1 },
  contractMessage: { fontSize: 14, lineHeight: 21, color: '#5E5C6B', textAlign: 'center', marginTop: 30 },
  contractDate: { fontSize: 13, color: '#5E5C6B', marginBottom: 12 },
  contractImage: { width: '100%', height: 560, backgroundColor: '#F7F6FA', borderRadius: 12 },
  stat: { flex: 1, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 12, padding: 12 },
  statLabel: { fontSize: 12.5, color: '#5E5C6B' },
  statValue: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },
  unit: { fontSize: 12.5, fontWeight: '400', color: '#5E5C6B' },
  section: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 26, marginBottom: 12 },
  ownerSection: { marginTop: 12, marginBottom: 12 },
  ownerCard: { marginTop: 12 },
  ownerMenu: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 66, paddingHorizontal: 16 },
  ownerMenuIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  ownerMenuTitle: { fontSize: 15, fontWeight: '600', color: '#131B2E' },
  ownerMenuSubtitle: { fontSize: 12, color: '#434655', marginTop: 2 },
  ownerSettings: { marginTop: 16, marginLeft: 6, marginBottom: 0 },
  menu: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 60 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5F4FB', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52 },
  line: { borderTopWidth: 1, borderTopColor: '#E4E2EC' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D5D3DF' },
  logout: { alignSelf: 'center', paddingVertical: 22 },
  logoutText: { fontSize: 14, color: '#5E5C6B' },
});
