import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { C, Field } from './ui';
import { CustomTask, customTasks, TaskPerson } from './customTasks';
import CustomTaskCard from './CustomTaskCard';
type Legacy={id:string;title:string;description:string;urgent:boolean};
type Props={storeId:number;onBack:()=>void;onEntriesChange:()=>void};
const draftKey=()=>`task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export default function OwnerTaskRegistration({storeId,onBack,onEntriesChange}:Props){
 const [entries,setEntries]=useState<CustomTask[]>([]),[people,setPeople]=useState<TaskPerson[]>([]);
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[urgent,setUrgent]=useState(true);
 const [assigned,setAssigned]=useState<number|null>(null),[legacy,setLegacy]=useState<Legacy[]>([]);
 const [ready,setReady]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [version,setVersion]=useState(0);const working=useRef(false),key=useRef(draftKey());
 useEffect(()=>{
  let active=true;setReady(false);setError('');setEntries([]);
  Promise.all([customTasks.list(storeId),customTasks.people(storeId)]).then(([list,staff])=>{if(active){setEntries(list);setPeople(staff);setReady(true);}},e=>{if(active)setError(e instanceof Error?e.message:'업무 조회 실패');});
  return()=>{active=false;};
 },[storeId,version]);
 useEffect(()=>{let active=true;AsyncStorage.getItem(`ownerTasks:${storeId}`).then(raw=>{
  const list:unknown=raw?JSON.parse(raw):[];
  if(Array.isArray(list)&&list.every(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&typeof t.description==='string'&&typeof t.urgent==='boolean')){if(active)setLegacy(list);}
 }).catch(()=>{});return()=>{active=false;};},[storeId]);
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{onBack();return true;});return()=>sub.remove();},[onBack]);
 const refresh=()=>{setVersion(v=>v+1);onEntriesChange();};
 const run=async(action:()=>Promise<void>)=>{if(working.current)return;working.current=true;setSaving(true);setError('');try{await action();refresh();}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{working.current=false;setSaving(false);}};
 const add=()=>void run(async()=>{
  await customTasks.create(storeId,{clientKey:key.current,title,description,urgent,assignedMemberId:assigned});
  key.current=draftKey();setTitle('');setDescription('');
 });
 const importLegacy=()=>void run(async()=>{
  let remaining=[...legacy];
  for(const entry of legacy){
   await customTasks.create(storeId,{clientKey:`legacy:${entry.id}`,title:entry.title,description:entry.description,urgent:entry.urgent,assignedMemberId:null});
   remaining=remaining.filter(t=>t.id!==entry.id);
   await AsyncStorage.setItem(`ownerTasks:${storeId}`,JSON.stringify(remaining));setLegacy(remaining);
  }
 });
 return <View style={s.root}>
  <View style={s.header}><Pressable onPress={onBack} hitSlop={12}><Ionicons name="arrow-back" size={24} color={C.text}/></Pressable><Text style={s.headerTitle}>상세 업무 확인 및 등록</Text><Pressable onPress={refresh} accessibilityLabel="새로고침"><Ionicons name="refresh" size={20} color={C.primary}/></Pressable></View>
  <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
   <Text style={s.description}>등록한 업무를 직원과 공유해요. 직원이 완료 보고하면 사장님이 승인하거나 반려할 수 있어요.</Text>
   {!!legacy.length&&<View style={s.form}><Text style={s.description}>이 기기에만 저장된 업무 {legacy.length}건이 있어요.</Text><Pressable disabled={saving||!ready} onPress={importLegacy}><Text style={s.choiceText}>기존 업무 가져오기</Text></Pressable></View>}
   <Text style={s.section}>업무 등록</Text><View style={s.form}>
    <View style={s.fieldHeading}><Text style={s.label}>업무 명 (필수)</Text><Pressable disabled={!title} onPress={()=>setTitle('')} hitSlop={8} accessibilityLabel="업무명 전체 지우기"><Text style={[s.clearText,!title&&s.clearDisabled]}>전체 지우기</Text></Pressable></View><Field placeholder="터치하여 입력" value={title} onChangeText={setTitle} contextMenuHidden={false} maxLength={100} style={s.input}/>
    <View style={[s.fieldHeading,s.detailLabel]}><Text style={s.label}>상세 설명 (선택)</Text><Pressable disabled={!description} onPress={()=>setDescription('')} hitSlop={8} accessibilityLabel="상세 설명 전체 지우기"><Text style={[s.clearText,!description&&s.clearDisabled]}>전체 지우기</Text></Pressable></View><Field placeholder="터치하여 입력" value={description} onChangeText={setDescription} contextMenuHidden={false} maxLength={500} style={s.input}/>
    <View style={s.choices}>{[true,false].map(value=><Pressable key={String(value)} onPress={()=>setUrgent(value)} style={[s.choice,urgent===value&&s.choiceOn]}><Text style={[s.choiceText,urgent===value&&s.choiceTextOn]}>{value?'긴급':'일반'}</Text></Pressable>)}</View>
    <Text style={[s.label,s.detailLabel]}>담당자</Text><View style={[s.choices,{flexWrap:'wrap'}]}>{[{memberId:null,name:'미지정'},...people].map(person=><Pressable key={String(person.memberId)} onPress={()=>setAssigned(person.memberId)} style={[s.choice,assigned===person.memberId&&s.choiceOn]}><Text style={[s.choiceText,assigned===person.memberId&&s.choiceTextOn]}>{person.name}</Text></Pressable>)}</View>
    <Pressable disabled={!title.trim()||!ready||saving} onPress={add} style={[s.add,(!title.trim()||!ready||saving)&&s.disabled]}><Text style={s.addText}>{saving?'저장 중…':'+ 업무 목록 추가'}</Text></Pressable>
   </View>
   {!!error&&<Text style={s.error}>{error}</Text>}
   <Text style={[s.section,s.listTitle]}>업무 목록</Text>
   {!ready&&!error&&<Text style={s.empty}>불러오는 중이에요.</Text>}
   {ready&&!entries.length&&<Text style={s.empty}>등록된 업무가 없어요.</Text>}
   {entries.map(entry=><CustomTaskCard key={`${entry.id}-${entry.revision}`} storeId={storeId} task={entry} owner people={people} onChange={refresh}/>)}
  </ScrollView>
 </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, height: 48, marginTop: 32 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 20, paddingBottom: 28 },
  description: { marginLeft: 0, fontSize: 11.9, lineHeight: 15, color: '#5E5C6B' },
  section: { marginTop: 22, marginLeft: 0, marginBottom: 10, fontSize: 15.9, fontWeight: '700', color: C.text },
  form: { borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 16, padding: 14 },
  label: { marginLeft: 0, marginBottom: 5, color: '#5E5C6B', fontSize: 12.4, fontWeight: '600', lineHeight: 15 },
  fieldHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 },
  clearText: { color: C.primary, fontSize: 12, lineHeight: 20, ...(Platform.OS === 'android' ? { fontFamily: 'sans-serif', includeFontPadding: false } : {}) },
  clearDisabled: { opacity: 0.35 },
  detailLabel: { marginTop: 10 },
  input: { height: Platform.OS === 'android' ? 48 : 36, fontSize: 14.5, color: C.text, paddingHorizontal: 12, outlineWidth: 0, ...(Platform.OS === 'android' ? { fontFamily: 'sans-serif', paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' as const } : {}) },
  choices: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 8 },
  choice: { height: 32, borderRadius: 24, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: C.primary, borderColor: C.primary },
  choiceText: { color: C.primary, fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center', ...(Platform.OS === 'android' ? { fontFamily: 'sans-serif', includeFontPadding: false, textAlignVertical: 'center' as const } : {}) },
  choiceTextOn: { color: '#fff' },
  add: { minHeight: 44, borderRadius: 12, backgroundColor: C.primary, paddingHorizontal: 12, justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  listTitle: { marginTop: 26, marginBottom: 0 },
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
