// 사장님 직원 참여 요청 및 직원 관리 화면 (UI 시안)
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { C } from './ui';
import { demoOwnerStaffRepository } from './ownerStaffRepository';
import type { OwnerStaffRepository, StaffPerson } from './ownerStaffRepository';
import { getStoreSetupSettings } from './storeSetupRepository';
const PARTS = ['오전', '오후', '마감'];

function useStoreWorkParts(storeId: number) {
  const [parts, setParts] = useState<string[]>(PARTS);
  useEffect(() => {
    let active = true;
    setParts(PARTS);
    getStoreSetupSettings(storeId).then((settings) => {
      if (active && settings) setParts(settings.workParts.map((part) => part.name));
    }).catch(() => {});
    return () => { active = false; };
  }, [storeId]);
  return parts;
}

const normalizePart = (value: string) => value.trim().replace(/\s*파트$/, '').trim();
const partLabel = (value: string) => value.trim().includes('파트') ? value.trim() : `${value.trim()} 파트`;

type RequestProps = { storeId: number; inviteCode?: string; storeName: string; onBack: () => void; repository?: OwnerStaffRepository };
export function OwnerStaffRequests({ storeId, inviteCode, storeName, onBack, repository = demoOwnerStaffRepository }: RequestProps) {
  const workParts = useStoreWorkParts(storeId);
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');
  const [pending, setPending] = useState<StaffPerson[]>([]);
  const [approved, setApproved] = useState<StaffPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const code = inviteCode || 'SM-KANGNAM-8291';
  const visible = tab === 'pending' ? pending : approved;

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const lists = await repository.getRequests(storeId);
      setPending(lists.pending);
      setApproved(lists.approved);
    } catch (e) {
      setError(e instanceof Error ? e.message : '직원 등록 요청을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [storeId, repository]);

  const decide = async (person: StaffPerson, approve: boolean, part: string) => {
    try {
      await repository.decideRequest(storeId, person.id, approve ? 'approve' : 'reject', part);
      await refresh();
    } catch (e) {
      Alert.alert('처리 실패', e instanceof Error ? e.message : '요청을 처리하지 못했어요.');
    }
  };

  return (
    <View style={s.root}>
      <Header title="직원 등록 요청" onBack={onBack} />
      <ScrollView contentContainerStyle={s.requestBody}>
        <View style={s.tabs}>
          <Pressable onPress={() => setTab('pending')} style={[s.tab, tab === 'pending' && s.tabActive]}>
            <Text style={[s.tabText, tab === 'pending' && s.tabTextActive]}>대기 {pending.length}</Text>
          </Pressable>
          <Pressable onPress={() => setTab('approved')} style={[s.tab, tab === 'approved' && s.tabActive]}>
            <Text style={[s.tabText, tab === 'approved' && s.tabTextActive]}>승인됨 {approved.length}</Text>
          </Pressable>
        </View>

        {!!error && <Text style={s.emptyText}>{error}</Text>}
        {loading && <Text style={s.emptyText}>직원 목록을 불러오는 중이에요</Text>}
        {!loading && !error && visible.map((person) => (
          <RequestCard key={person.id} person={person} pending={tab === 'pending'} workParts={workParts} onDecide={decide} />
        ))}
        {!loading && !error && !visible.length && <Text style={s.emptyText}>{tab === 'pending' ? '대기 중인 등록 요청이 없어요' : '승인된 직원이 없어요'}</Text>}

        {tab === 'pending' && <InviteCard code={code} storeName={storeName} />}
      </ScrollView>
    </View>
  );
}

export function OwnerStaffManagement({ storeId, onBack, repository = demoOwnerStaffRepository }: { storeId: number; onBack: () => void; repository?: OwnerStaffRepository }) {
  const workParts = useStoreWorkParts(storeId);
  const [staff, setStaff] = useState<StaffPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [parts, setParts] = useState<Record<string, string>>({});
  const [openPartId, setOpenPartId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtered = useMemo(() => staff.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(query.toLowerCase())), [staff, query]);

  const refreshStaff = async () => {
    setLoading(true);
    try { setStaff(await repository.getEmployees(storeId)); }
    catch (e) { Alert.alert('불러오기 실패', e instanceof Error ? e.message : '직원 목록을 불러오지 못했어요.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refreshStaff(); }, [storeId, repository]);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable>
        <Text style={s.headerTitle}>직원 관리</Text>
        <Pressable onPress={() => { setSearchOpen((v) => !v); setQuery(''); }} hitSlop={10}><Ionicons name={searchOpen ? 'close' : 'search'} size={23} color={C.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.managementBody}>
        {searchOpen && (
          <View style={s.staffSearchBar}>
            <Ionicons name="search" size={18} color="#828282" />
            <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="직원 검색" style={s.staffSearchInput} />
          </View>
        )}
        {loading && <Text style={s.emptyText}>직원 목록을 불러오는 중이에요</Text>}
        {!loading && filtered.map((person) => (
          <View key={person.id} style={[s.manageCard, openPartId === person.id && s.manageCardDropdownOpen]}>
            <PersonIdentity person={person} />
            <View style={[s.managePartSection, openPartId === person.id && s.dropdownLayer]}>
              <Text style={s.partLabel}>근무 파트</Text>
              <View style={s.managePartRow}>
                <View style={[s.managePartPicker, openPartId === person.id && s.dropdownLayer]}>
                <Pressable disabled={!workParts.length} style={s.partSelect} onPress={() => setOpenPartId((current) => current === person.id ? null : person.id)}>
                  <Text style={s.partValue}>{workParts.length ? partLabel(parts[person.id] ?? person.part) : '파트 설정 없음'}</Text>
                  {!!workParts.length && <Ionicons name={openPartId === person.id ? 'chevron-up' : 'chevron-down'} size={15} color={C.text} />}
                </Pressable>
                {openPartId === person.id && <View style={s.managePartOptions}>
                  {workParts.map((part) => (
                    <Pressable key={part} style={s.partOption} onPress={() => {
                      setParts((current) => ({ ...current, [person.id]: part }));
                      setSavedId(null);
                      setOpenPartId(null);
                    }}>
                      <Text style={[s.partOptionText, normalizePart(parts[person.id] ?? person.part) === normalizePart(part) && s.partOptionSelected]}>{partLabel(part)}</Text>
                    </Pressable>
                  ))}
                </View>}
                </View>
                <Text style={s.time}>{person.time}</Text>
              </View>
            </View>
            <View style={s.manageActions}>
              <Pressable style={s.outlineAction} onPress={async () => {
                try {
                  await repository.updateEmployeePart(storeId, person.id, parts[person.id] ?? person.part);
                  setStaff((items) => items.map((item) => item.id === person.id ? { ...item, part: parts[person.id] ?? person.part } : item));
                  setSavedId(person.id);
                  if (savedTimer.current) clearTimeout(savedTimer.current);
                  savedTimer.current = setTimeout(() => setSavedId(null), 1500);
                } catch (e) { Alert.alert('저장 실패', e instanceof Error ? e.message : '근무 파트를 저장하지 못했어요.'); }
              }}><Text style={s.outlineActionText}>{savedId === person.id ? '저장됨' : '저장'}</Text></Pressable>
              <Pressable style={s.solidAction} onPress={async () => {
                try { await repository.removeEmployee(storeId, person.id); setStaff((items) => items.filter((item) => item.id !== person.id)); }
                catch (e) { Alert.alert('제거 실패', e instanceof Error ? e.message : '직원을 제거하지 못했어요.'); }
              }}><Text style={s.solidActionText}>제거</Text></Pressable>
            </View>
          </View>
        ))}
        {!loading && !filtered.length && <Text style={s.emptyText}>{query ? '검색 결과가 없어요' : '등록된 직원이 없어요'}</Text>}
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable>
      <Text style={s.headerTitle}>{title}</Text>
    </View>
  );
}

function PersonIdentity({ person }: { person: StaffPerson }) {
  return (
    <View style={s.identity}>
      <View style={s.initial}><Text style={s.initialText}>{person.name.slice(0, 1)}</Text></View>
      <View style={s.identityText}>
        <Text style={s.personName}>{person.name}</Text>
      </View>
    </View>
  );
}

function RequestCard({ person, pending, workParts, onDecide }: { person: StaffPerson; pending: boolean; workParts: string[]; onDecide: (p: StaffPerson, approve: boolean, part: string) => void | Promise<void> }) {
  const [part, setPart] = useState(person.part);
  const [partOpen, setPartOpen] = useState(false);
  useEffect(() => {
    const match = workParts.find((option) => normalizePart(option) === normalizePart(part));
    if (match && match !== part) setPart(match);
    else if (!match && workParts.length) setPart(workParts[0]);
  }, [workParts, part]);
  return (
    <View style={[s.requestCard, partOpen && s.requestCardDropdownOpen]}>
      <View style={s.identity}>
        <View style={s.initial}><Text style={s.initialText}>{person.name.slice(0, 1)}</Text></View>
        <View style={s.identityText}>
          <Text style={s.personName}>{person.name}</Text>
        </View>
      </View>
      <View style={[s.managePartSection, partOpen && s.dropdownLayer]}>
        <Text style={s.partLabel}>근무 파트</Text>
        <View style={[s.managePartRow, partOpen && s.dropdownLayer]}>
          {pending ? (
            <View style={[s.managePartPicker, partOpen && s.dropdownLayer]}>
                <Pressable disabled={!workParts.length} style={s.partSelect} onPress={() => setPartOpen((open) => !open)}>
                <Text style={s.partValue}>{workParts.length ? partLabel(part) : '파트 설정 없음'}</Text>
                {!!workParts.length && <Ionicons name={partOpen ? 'chevron-up' : 'chevron-down'} size={15} color={C.text} />}
              </Pressable>
              {partOpen && <View style={s.partOptions}>
                {workParts.map((option) => <Pressable key={option} style={s.partOption} onPress={() => { setPart(option); setPartOpen(false); }}>
                  <Text style={[s.partOptionText, normalizePart(part) === normalizePart(option) && s.partOptionSelected]}>{partLabel(option)}</Text>
                </Pressable>)}
              </View>}
              {!workParts.length && <Text style={s.noWorkParts}>운영 방식에서 근무 파트를 추가해 주세요.</Text>}
            </View>
          ) : (
            <View style={s.partStatic}><Text style={s.partValue}>{partLabel(part)}</Text></View>
          )}
          <Text style={s.time}>{person.time}</Text>
        </View>
      </View>
      {pending && <View style={s.requestActions}>
        <Pressable style={s.rejectAction} onPress={() => onDecide(person, false, part)}><Text style={s.rejectText}>거절</Text></Pressable>
        <Pressable disabled={!workParts.length} style={[s.approveAction, !workParts.length && { opacity: 0.45 }]} onPress={() => onDecide(person, true, part)}><Text style={s.approveText}>승인</Text></Pressable>
      </View>}
    </View>
  );
}

function InviteCard({ code, storeName }: { code: string; storeName: string }) {
  const [showQr, setShowQr] = useState(false);
  return (
    <>
      <View style={s.inviteCard}>
        <View style={s.inviteHead}><Text style={s.inviteCaption}>매장 고유 초대 코드</Text><Text style={s.inviteCaption}>크루 등록 시 입력</Text></View>
        <View style={s.codeRow}>
          <Text style={s.codeText} numberOfLines={1} adjustsFontSizeToFit>{code}</Text>
          <Pressable style={s.copyButton} onPress={async () => { await Clipboard.setStringAsync(code); Alert.alert('복사 완료', '초대 코드를 복사했어요.'); }}>
            <Ionicons name="copy-outline" size={15} color="#fff" /><Text style={s.copyText}>복사</Text>
          </Pressable>
        </View>
        <Pressable style={s.qrRow} onPress={() => setShowQr(true)}>
          <Text style={s.qrRowText}>QR 코드</Text><QRCode value={code} size={30} color={C.primary} backgroundColor="#fff" />
        </Pressable>
      </View>
      <Modal visible={showQr} animationType="fade" transparent onRequestClose={() => setShowQr(false)}>
        <View style={s.qrModalBackdrop}>
          <View style={s.qrModalCard}>
            <Pressable style={s.qrClose} onPress={() => setShowQr(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={C.text} />
            </Pressable>
            <Text style={s.qrModalTitle}>직원을 초대해 보세요</Text>
            <Text style={s.qrModalDescription}>직원이 이 QR을 찍거나 초대 코드를 입력하면 참여 요청이 와요.</Text>
            <View style={s.qrInviteCard}>
              <View style={s.qrStoreRow}>
                <Image source={require('../assets/storemate-store-icon.png')} style={s.qrStoreIcon} resizeMode="contain" />
                <Text style={s.qrStoreName} numberOfLines={1}>{storeName}</Text>
              </View>
              <View style={s.qrLargeFrame}>
                <QRCode value={code} size={174} quietZone={12} color="#1C1B22" backgroundColor="#fff" />
              </View>
              <Text style={s.qrCodeLabel}>초대 코드</Text>
              <View style={s.qrCodeRow}>
                <Text style={s.qrCodeText}>{code}</Text>
                <Pressable onPress={async () => { await Clipboard.setStringAsync(code); Alert.alert('복사 완료', '초대 코드를 복사했어요.'); }} hitSlop={8}>
                  <Ionicons name="copy-outline" size={17} color={C.primary} />
                </Pressable>
              </View>
            </View>
            <Pressable style={s.qrShareButton} onPress={() => Share.share({ message: `[${storeName}] StoreMate 초대 코드: ${code}` })}>
              <Ionicons name="share-social-outline" size={17} color={C.primary} /><Text style={s.qrShareText}>공유하기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text, flex: 1 },
  requestBody: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tab: { height: 36, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#CFCCDB', alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#5E5C6B' },
  tabTextActive: { color: '#fff' },
  requestCard: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 16, marginBottom: 12 },
  requestCardDropdownOpen: { position: 'relative', zIndex: 999, elevation: 24 },
  dropdownLayer: { position: 'relative', zIndex: 999, elevation: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 16, fontWeight: '700', color: C.primary },
  identityText: { flex: 1, minWidth: 0 },
  personName: { fontSize: 15, fontWeight: '700', color: C.text },
  partLine: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  managePartSection: { marginTop: 12, gap: 6, alignSelf: 'stretch', alignItems: 'flex-start' },
  managePartRow: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  managePartPicker: { alignSelf: 'flex-start', position: 'relative' },
  partOptions: { position: 'absolute', top: 39, left: 0, minWidth: 112, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 12, overflow: 'hidden', elevation: 24, zIndex: 999, shadowColor: '#171D1B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 6 },
  managePartOptions: { position: 'absolute', top: 39, left: 0, minWidth: 112, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 12, overflow: 'hidden', elevation: 24, zIndex: 999, shadowColor: '#171D1B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 6 },
  partOption: { minHeight: 36, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  partOptionText: { color: C.text, fontSize: 12.5 },
  partOptionSelected: { color: C.primary, fontWeight: '700' },
  noWorkParts: { fontSize: 11, color: '#828282', marginTop: 5 },
  partLabel: { fontSize: 12.5, color: '#5E5C6B' },
  partSelect: { height: 35, minWidth: 92, borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  partStatic: { height: 35, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  partValue: { fontSize: 12.5, fontWeight: '600', color: C.text },
  time: { marginLeft: 'auto', fontSize: 11.5, color: '#5E5C6B' },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  rejectAction: { flex: 1, height: 44, borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rejectText: { fontSize: 14, fontWeight: '600', color: C.primary },
  approveAction: { flex: 1.63, height: 44, backgroundColor: C.primary, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  approveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  inviteCard: { marginTop: 4, backgroundColor: C.primary, borderRadius: 8, padding: 14, gap: 10 },
  inviteHead: { flexDirection: 'row', justifyContent: 'space-between' },
  inviteCaption: { color: '#fff', fontSize: 10, fontWeight: '500' },
  codeRow: { height: 40, backgroundColor: '#fff', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  codeText: { color: '#004AC6', fontSize: 16, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  copyText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  qrRow: { height: 40, backgroundColor: '#fff', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  qrRowText: { color: '#004AC6', fontSize: 16, fontWeight: '800' },
  qrModalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,18,35,0.4)', padding: 20 },
  qrModalCard: { width: '100%', maxWidth: 360, borderRadius: 20, backgroundColor: '#fff', padding: 20, alignItems: 'stretch' },
  qrClose: { alignSelf: 'flex-end', padding: 2 },
  qrModalTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: C.text, marginTop: 4 },
  qrModalDescription: { fontSize: 12.5, lineHeight: 18, color: '#5E5C6B', marginTop: 6 },
  qrInviteCard: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 20, alignItems: 'center', paddingTop: 18, paddingBottom: 16, marginTop: 16 },
  qrStoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '90%' },
  qrStoreIcon: { width: 26, height: 26 },
  qrStoreName: { fontSize: 15, fontWeight: '700', color: C.text, flexShrink: 1 },
  qrLargeFrame: { marginTop: 16, width: 202, height: 202, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', overflow: 'hidden' },
  qrCodeLabel: { fontSize: 12, color: '#828282', marginTop: 10 },
  qrCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  qrCodeText: { fontSize: 22, fontWeight: '800', letterSpacing: 3, color: C.primary },
  qrShareButton: { height: 44, borderRadius: 22, backgroundColor: '#ECEAF7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  qrShareText: { color: C.primary, fontSize: 14, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#828282', fontSize: 13, paddingVertical: 32 },
  staffSearchBar: { height: 42, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  staffSearchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  managementBody: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28 },
  manageCard: { minHeight: 184, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 16, marginBottom: 16 },
  manageCardDropdownOpen: { position: 'relative', zIndex: 999, elevation: 24 },
  manageActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  outlineAction: { flex: 1, height: 44, borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  outlineActionText: { color: C.primary, fontSize: 14, fontWeight: '600' },
  solidAction: { flex: 1, height: 44, backgroundColor: C.primary, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  solidActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
