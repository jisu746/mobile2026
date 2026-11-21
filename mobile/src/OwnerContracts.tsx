import { useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './font';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';
import { demoOwnerStaffRepository } from './ownerStaffRepository';
import type { StaffPerson } from './ownerStaffRepository';
import { contractRepository } from './contractRepository';
import type { EmploymentContract } from './contractRepository';

type Props = { storeId: number; onBack: () => void };
type Page = 'list' | 'detail' | 'camera';
const dateLabel = (date: string) => {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default function OwnerContracts({ storeId, onBack }: Props) {
  const [fontsLoaded] = useFonts({ NotoSansKR: require('../assets/NotoSansKR-VF.ttf') });
  const [employees, setEmployees] = useState<StaffPerson[]>([]);
  const [employee, setEmployee] = useState<StaffPerson | null>(null);
  const [contract, setContract] = useState<EmploymentContract | null>(null);
  const [page, setPage] = useState<Page>('list');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const filtered = useMemo(() => employees.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(query.trim().toLowerCase())), [employees, query]);

  useEffect(() => {
    demoOwnerStaffRepository.getEmployees(storeId).then(setEmployees, (error) => Alert.alert('직원 목록을 불러오지 못했어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.')).finally(() => setLoading(false));
  }, [storeId]);

  const openEmployee = async (person: StaffPerson) => {
    setEmployee(person);
    try { setContract(await contractRepository.get(storeId, person.id)); }
    catch (error) { Alert.alert('근로계약서를 불러오지 못했어요', error instanceof Error ? error.message : '저장된 계약서를 읽지 못했어요.'); setContract(null); }
    setPage('detail');
  };

  const savePhoto = async (photoUri: string) => {
    if (!employee) return;
    const saved: EmploymentContract = { employeeId: employee.id, employeeName: employee.name, photoUri, capturedAt: new Date().toISOString() };
    await contractRepository.save(storeId, saved);
    setContract(saved);
    setPage('detail');
  };

  if (!fontsLoaded) return <View style={s.root} />;
  if (page === 'camera' && employee) return <ContractCamera employeeName={employee.name} onBack={() => setPage('detail')} onSave={savePhoto} />;
  if (page === 'detail' && employee) return <ContractDetail employee={employee} contract={contract} onBack={() => setPage('list')} onRegister={() => setPage('camera')} />;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable>
        <Text style={s.title}>근로계약서 관리</Text>
        <Pressable onPress={() => { setSearchOpen((open) => !open); setQuery(''); }} hitSlop={10}><Ionicons name={searchOpen ? 'close' : 'search'} size={23} color={C.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.listBody}>
        {searchOpen && <View style={s.searchBar}><Ionicons name="search" size={18} color="#828282" /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="직원 검색" style={s.searchInput} /></View>}
        {loading && <Text style={s.empty}>직원 목록을 불러오는 중이에요</Text>}
        {!loading && filtered.map((person) => <EmployeeCard key={person.id} person={person} onPress={() => void openEmployee(person)} />)}
        {!loading && !filtered.length && <Text style={s.empty}>{query ? '검색 결과가 없어요' : '등록된 직원이 없어요'}</Text>}
      </ScrollView>
    </View>
  );
}

function EmployeeCard({ person, onPress }: { person: StaffPerson; onPress: () => void }) {
  return (
    <Pressable style={s.employeeCard} onPress={onPress}>
      <View style={s.avatar}><Text style={s.avatarText}>{person.name.slice(0, 1)}</Text></View>
      <View style={s.employeeInfo}><Text style={s.employeeName}>{person.name}</Text></View>
      <View style={s.partBadge}><Text style={s.partText}>{person.part} 파트</Text></View>
    </Pressable>
  );
}

function ContractDetail({ employee, contract, onBack, onRegister }: { employee: StaffPerson; contract: EmploymentContract | null; onBack: () => void; onRegister: () => void }) {
  return (
    <View style={s.root}>
      <Header onBack={onBack} />
      <ScrollView contentContainerStyle={s.detailBody}>
        <View style={s.promptCard}>
          <Text style={s.promptTitle}>{contract ? '근로계약서가 등록되어 있어요.' : '아직 근로계약서가 등록되지 않았어요.'}</Text>
          <Text style={s.promptDescription}>{contract ? `${employee.name} 님의 계약서 원본을 확인할 수 있어요.` : `${employee.name} 님의 근로 계약서를 등록해주세요.`}</Text>
          <Pressable style={s.registerButton} onPress={onRegister}><Ionicons name="camera-outline" size={18} color="#fff" /><Text style={s.registerButtonText}>{contract ? '근로계약서 다시 등록하기' : '근로 계약서 등록하기'}</Text></Pressable>
        </View>
        {contract && (
          <>
            <Text style={s.conditionsTitle}>저장된 근로계약서</Text>
            <View style={s.photoCard}>
              <Text style={s.photoHint}>촬영한 계약서 사진 · {dateLabel(contract.capturedAt)} 저장</Text>
              <Image source={{ uri: contract.photoUri }} resizeMode="contain" style={s.contractPhoto} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return <View style={s.header}><Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable><Text style={s.title}>근로계약서 관리</Text></View>;
}

function ContractCamera({ employeeName, onBack, onSave }: { employeeName: string; onBack: () => void; onSave: (photoUri: string) => Promise<void> }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const camera = useRef<CameraView>(null);

  const capture = async () => {
    if (!camera.current || !ready) return;
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.7, base64: true });
      const uri = picture?.base64 ? `data:image/jpeg;base64,${picture.base64}` : picture?.uri;
      if (!uri) throw new Error('사진을 촬영하지 못했어요. 다시 시도해 주세요.');
      setPhotoUri(uri);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : '사진을 촬영하지 못했어요.'); }
  };

  const save = async () => {
    if (!photoUri) return;
    setSaving(true);
    try { await onSave(photoUri); }
    catch (e) { setError(e instanceof Error ? e.message : '사진을 저장하지 못했어요.'); }
    finally { setSaving(false); }
  };

  if (!permission) return <View style={s.root} />;
  if (!permission.granted) return (
    <View style={s.root}>
      <View style={s.header}><Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={C.text} /></Pressable><Text style={s.title}>근로계약서 촬영</Text></View>
      <View style={s.permissionBody}><Ionicons name="camera-outline" size={44} color={C.primary} /><Text style={s.permissionTitle}>카메라 권한이 필요해요</Text><Text style={s.permissionSub}>계약서를 촬영하려면 카메라 접근을 허용해 주세요.</Text><Pressable style={s.permissionButton} onPress={() => void requestPermission()}><Text style={s.permissionButtonText}>카메라 권한 허용</Text></Pressable></View>
    </View>
  );

  return (
    <View style={s.cameraRoot}>
      <View style={s.cameraHeader}><Pressable onPress={onBack} hitSlop={10}><Ionicons name="close" size={25} color="#fff" /></Pressable><Text style={s.cameraTitle}>근로계약서 촬영</Text><View style={{ width: 25 }} /></View>
      <View style={s.cameraPreview}>
        {photoUri ? <Image source={{ uri: photoUri }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />}
        {!photoUri && <View pointerEvents="none" style={s.documentFrame}><View style={[s.frameCorner, s.frameTopLeft]} /><View style={[s.frameCorner, s.frameTopRight]} /><View style={[s.frameCorner, s.frameBottomLeft]} /><View style={[s.frameCorner, s.frameBottomRight]} /><Text style={s.cameraHint}>{employeeName}님의 계약서를 프레임 안에 맞춰주세요</Text></View>}
        {!!error && <Text style={s.cameraError}>{error}</Text>}
      </View>
      <View style={s.cameraActions}>
        {photoUri ? <>
          <Pressable style={s.retakeButton} onPress={() => { setPhotoUri(null); setReady(false); }}><Ionicons name="refresh" size={18} color="#fff" /><Text style={s.cameraActionText}>다시 촬영</Text></Pressable>
          <Pressable disabled={saving} style={[s.savePhotoButton, saving && { opacity: 0.6 }]} onPress={() => void save()}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.cameraActionText}>{saving ? '저장 중...' : '저장하기'}</Text></Pressable>
        </> : <Pressable disabled={!ready} accessibilityLabel="계약서 촬영" style={[s.shutterOuter, !ready && { opacity: 0.5 }]} onPress={() => void capture()}><View style={s.shutterInner} /></Pressable>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  title: { flex: 1, fontFamily: 'NotoSansKR', fontSize: 18, fontWeight: '700', color: '#1C1B22' },
  listBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, gap: 20 },
  searchBar: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 10 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: 'NotoSansKR', fontSize: 13, color: C.text, paddingVertical: 0 },
  employeeCard: { minHeight: 78, borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECEAF7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'NotoSansKR', fontSize: 16, fontWeight: '700', color: C.primary },
  employeeInfo: { flex: 1, minWidth: 0, gap: 2 },
  employeeName: { fontFamily: 'NotoSansKR', fontSize: 15, fontWeight: '700', color: '#1C1B22' },
  partBadge: { borderWidth: 1, borderColor: '#CFCCDB', borderRadius: 8, paddingHorizontal: 11, height: 34, alignItems: 'center', justifyContent: 'center' },
  partText: { fontFamily: 'NotoSansKR', fontSize: 12, fontWeight: '600', color: '#1C1B22' },
  empty: { textAlign: 'center', color: '#828282', fontFamily: 'NotoSansKR', paddingVertical: 28 },
  detailBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 },
  promptCard: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 20, marginBottom: 24 },
  promptTitle: { fontFamily: 'NotoSansKR', fontSize: 16, fontWeight: '700', color: '#1C1B22' },
  promptDescription: { fontFamily: 'NotoSansKR', fontSize: 12, color: '#5E5C6B', marginTop: 3, marginBottom: 12 },
  registerButton: { minHeight: 50, borderRadius: 25, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  registerButtonText: { fontFamily: 'NotoSansKR', fontSize: 15, fontWeight: '700', color: '#fff' },
  conditionsTitle: { fontFamily: 'NotoSansKR', fontSize: 17, fontWeight: '700', color: '#1C1B22', marginBottom: 10 },
  photoCard: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 14, padding: 12 },
  photoHint: { fontFamily: 'NotoSansKR', fontSize: 12, color: '#5E5C6B', marginBottom: 8 },
  contractPhoto: { width: '100%', height: 360, backgroundColor: '#F7F6FA', borderRadius: 8 },
  cameraRoot: { flex: 1, backgroundColor: '#171521' },
  cameraHeader: { height: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cameraTitle: { fontFamily: 'NotoSansKR', fontSize: 16, fontWeight: '700', color: '#fff' },
  cameraPreview: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  documentFrame: { position: 'absolute', width: '82%', height: '76%', justifyContent: 'center', alignItems: 'center' },
  frameCorner: { position: 'absolute', width: 34, height: 34, borderColor: '#fff' },
  frameTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  frameTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  frameBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  frameBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  cameraHint: { position: 'absolute', bottom: -34, fontFamily: 'NotoSansKR', fontSize: 13, fontWeight: '600', color: '#fff' },
  cameraError: { position: 'absolute', bottom: 16, color: '#fff', backgroundColor: '#A52B38', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontFamily: 'NotoSansKR', fontSize: 12 },
  cameraActions: { minHeight: 100, paddingHorizontal: 28, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  shutterOuter: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff' },
  retakeButton: { height: 48, paddingHorizontal: 18, borderWidth: 1, borderColor: '#fff', borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 6 },
  savePhotoButton: { height: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cameraActionText: { fontFamily: 'NotoSansKR', fontSize: 14, fontWeight: '700', color: '#fff' },
  permissionBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  permissionTitle: { fontFamily: 'NotoSansKR', fontSize: 17, fontWeight: '700', color: C.text, marginTop: 16 },
  permissionSub: { fontFamily: 'NotoSansKR', fontSize: 13, color: '#5E5C6B', textAlign: 'center', marginTop: 6, marginBottom: 18 },
  permissionButton: { height: 46, borderRadius: 23, backgroundColor: C.primary, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  permissionButtonText: { fontFamily: 'NotoSansKR', fontSize: 14, fontWeight: '700', color: '#fff' },
});
