import {Modal} from 'react-native';
import {api} from './api';
import LinkedTasks from './LinkedTasks';
import {customTasks,CustomTask} from './customTasks';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './font';
import { C } from './ui';
import { Handover, previousHandovers, listHandovers, writeHandover, editHandover, deleteHandover, resolveHandover } from './handover';

export default function HandoverBoard({storeId,onBack}:{storeId:number;onBack:()=>void}){
 const [owner,setOwner]=useState(false);
 useEffect(()=>{api<{owner:boolean}>('GET',`/api/stores/${storeId}/inventory-capabilities`).then(v=>setOwner(v.owner),()=>{});},[storeId]);
 const [scope,setScope]=useState<'all'|'previous'>('all'),[source,setSource]=useState('');
 const [list,setList]=useState<Handover[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 const [title,setTitle]=useState(''),[related,setRelated]=useState<number|null>(null),[tasks,setTasks]=useState<CustomTask[]>([]);
 useEffect(()=>{customTasks.list(storeId).then(setTasks,()=>{});},[storeId,version]);
 const [content,setContent]=useState(''),[urgent,setUrgent]=useState(false),[busy,setBusy]=useState(false);const working=useRef(false);
 useEffect(()=>{let active=true;setLoading(true);(scope==='all'?listHandovers(storeId):previousHandovers(storeId).then(v=>{if(active)setSource(v.author?`직전 근무자: ${v.author} · ${v.workPart??'파트 미기록'}\n${v.clockIn?.replace('T',' ')} ~ ${v.clockOut?.replace('T',' ')}`:'이전 퇴근 기록이 없어요.');return v.items;})).then(items=>{if(active){setList(items);setError('');}},e=>{if(active)setError(e instanceof Error?e.message:'조회 실패');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[storeId,version,scope]);
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{onBack();return true;});return()=>sub.remove();},[onBack]);
 const refresh=()=>setVersion(v=>v+1);
 const add=async()=>{if(working.current)return;working.current=true;setBusy(true);setError('');try{await writeHandover(storeId,content,urgent,title,related);setContent('');setTitle('');setRelated(null);refresh();}catch(e){setError(e instanceof Error?e.message:'등록 실패');}finally{working.current=false;setBusy(false);}};
 return <View style={s.root}>
  <View style={s.header}><Pressable onPress={onBack} hitSlop={12}><Ionicons name="arrow-back" size={24} color={C.text}/></Pressable><Text style={s.title}>인수인계 목록·관리</Text><Pressable onPress={refresh} hitSlop={12} accessibilityLabel="새로고침"><Ionicons name="refresh" size={22} color={C.primary}/></Pressable></View>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
   <View style={s.actions}><Pressable onPress={()=>setScope('all')} style={s.link}><Text style={s.primary}>{scope==='all'?'● ':''}매장 전체</Text></Pressable><Pressable onPress={()=>setScope('previous')} style={s.link}><Text style={s.primary}>{scope==='previous'?'● ':''}직전 근무자</Text></Pressable></View>{scope==='previous'&&<Text style={s.hint}>{source}</Text>}<Text style={s.hint}>최근 메모 20개를 보여줘요. 본인 메모는 수정할 수 있고, 작성자와 관리자는 삭제할 수 있어요.</Text>
   <View style={s.card}><Text style={s.name}>새 메모</Text><TextInput style={[s.input,{minHeight:44}]} value={title} onChangeText={setTitle} maxLength={100} placeholder="제목"/><Text style={s.hint}>관련 미완료 업무 (선택)</Text><ScrollView horizontal><Pressable onPress={()=>setRelated(null)}><Text style={s.primary}>{related===null?'● ':''}연결 없음　</Text></Pressable>{tasks.filter(t=>t.status!=='APPROVED').map(t=><Pressable key={t.id} onPress={()=>setRelated(t.id)}><Text style={s.primary}>{related===t.id?'● ':''}{t.title}　</Text></Pressable>)}</ScrollView><TextInput style={s.input} multiline maxLength={500} value={content} onChangeText={setContent} placeholder="다음 근무자에게 남길 내용"/>
    <Pressable style={s.link} onPress={()=>setUrgent(v=>!v)}><Text style={s.primary}>{urgent?'☑ 긴급 메모':'☐ 긴급 메모'}</Text></Pressable>
    <Pressable disabled={busy||!content.trim()} style={[s.button,(busy||!content.trim())&&{opacity:.4}]} onPress={()=>void add()}><Text style={s.white}>{busy?'등록 중…':'등록'}</Text></Pressable>
   </View>
   {!!error&&<Text style={s.error}>{error}</Text>}
   {loading?<Text style={s.hint}>불러오는 중이에요.</Text>:list.length?list.map(h=><MemoCard key={`${h.id}-${h.revision}`} storeId={storeId} h={h} owner={owner} onChange={refresh}/>):!error&&<Text style={s.hint}>등록된 메모가 없어요.</Text>}
  </ScrollView>
 </View>;
}
function MemoCard({storeId,h,onChange,owner}:{storeId:number;h:Handover;onChange:()=>void;owner:boolean}){
 const [linked,setLinked]=useState(false);
 const [editTitle,setEditTitle]=useState(h.title??''),[editing,setEditing]=useState(false),[content,setContent]=useState(h.content),[urgent,setUrgent]=useState(h.urgent),[remove,setRemove]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const working=useRef(false);
 const run=async(action:()=>Promise<unknown>)=>{if(working.current)return;working.current=true;setBusy(true);setError('');try{await action();setEditing(false);onChange();}catch(e){setError(e instanceof Error?e.message:'처리 실패');}finally{working.current=false;setBusy(false);}};
 return <View style={s.card}>
  <Text style={s.name}>{h.author}{h.mine?' (나)':''} · {h.urgent?'긴급':'일반'}</Text><Text style={s.hint}>{h.createdAt.toLocaleString('ko-KR')}{h.updatedAt?`\n수정: ${h.updatedAt.replace('T',' ')}`:''}</Text>
  {editing?<><TextInput style={[s.input,{minHeight:44}]} value={editTitle} onChangeText={setEditTitle} maxLength={100} placeholder="제목"/><TextInput style={s.input} value={content} onChangeText={setContent} multiline maxLength={500}/><Pressable style={s.link} onPress={()=>setUrgent(v=>!v)}><Text style={s.primary}>{urgent?'☑ 긴급 메모':'☐ 긴급 메모'}</Text></Pressable><Text style={s.hint}>수정하면 이전 확인과 구분되어, 새 내용을 다시 확인해야 해요.</Text><Pressable disabled={busy} style={s.button} onPress={()=>void run(()=>editHandover(storeId,h,content,urgent,editTitle))}><Text style={s.white}>수정 저장</Text></Pressable><Pressable disabled={busy} style={s.link} onPress={()=>{setEditing(false);setContent(h.content);setUrgent(h.urgent);}}><Text style={s.primary}>취소</Text></Pressable></>:<>
   {!!h.title&&<Text style={s.name}>{h.title}</Text>}<Text style={s.content}>{h.content}</Text>{h.relatedTaskId&&<Pressable onPress={()=>setLinked(true)}><Text style={s.hint}>관련 업무: {h.relatedTaskTitle} · {h.relatedTaskStatus==='APPROVED'?'완료':h.relatedTaskStatus==='SUBMITTED'?'승인 대기':'미완료'} 〉</Text></Pressable>}
   {<>
    <Text style={s.hint}>현재 내용 확인 {h.confirmations.length}명</Text>
    {h.confirmations.map((check,i)=><Text key={i} style={s.hint}>{check.name}{check.mine?' (나)':''} · {check.confirmedAt.replace('T',' ')}</Text>)}
    {h.resolved&&!h.confirmations.length&&<Text style={s.hint}>기존 완료 표시가 있어요. 당시 확인자는 기록되지 않았어요.</Text>}
    <Pressable disabled={busy} style={s.button} onPress={()=>void run(()=>resolveHandover(storeId,h.id,!h.confirmedByMe,h.revision))}><Text style={s.white}>{h.confirmedByMe?'내 확인 취소':'내용 확인 완료'}</Text></Pressable>
   </>}
   <View style={s.actions}>{h.canEdit&&<Pressable disabled={busy} style={s.link} onPress={()=>setEditing(true)}><Text style={s.primary}>수정</Text></Pressable>}{h.canDelete&&<Pressable disabled={busy} style={s.link} onPress={()=>setRemove(v=>!v)}><Text style={s.primary}>삭제</Text></Pressable>}</View>
   {remove&&<><Text style={s.hint}>이 메모를 목록에서 삭제할까요?</Text><Pressable disabled={busy} style={s.link} onPress={()=>void run(()=>deleteHandover(storeId,h))}><Text style={s.error}>삭제 확인</Text></Pressable></>}
  </>}
  {linked&&<Modal visible animationType="slide" onRequestClose={()=>setLinked(false)}><LinkedTasks storeId={storeId} taskId={h.relatedTaskId} owner={owner} onBack={()=>{setLinked(false);onChange();}}/></Modal>}
  {!!error&&<><Text style={s.error}>{error}</Text><Pressable style={s.link} onPress={onChange}><Text style={s.primary}>최신 내용 불러오기</Text></Pressable></>}
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#fff'},header:{minHeight:56,flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20},title:{flex:1,fontSize:18,fontWeight:'700',color:C.text},body:{padding:20,paddingBottom:36},card:{borderWidth:1,borderColor:'#E4E2EC',borderRadius:16,padding:14,marginTop:14},name:{fontSize:15,fontWeight:'700',color:C.text},hint:{fontSize:12,lineHeight:20,color:'#6A6575',marginTop:6},content:{fontSize:15,lineHeight:24,color:C.text,marginVertical:10},input:{borderWidth:1,borderColor:'#D8D3E8',borderRadius:10,minHeight:72,paddingHorizontal:10,paddingVertical:8,marginTop:10,fontSize:13,lineHeight:20,color:C.text,textAlignVertical:'top',...(Platform.OS==='android'?{fontFamily:'sans-serif',includeFontPadding:false}:{})},button:{backgroundColor:C.primary,borderRadius:18,padding:12,alignItems:'center',marginTop:10},white:{fontSize:12,lineHeight:18,color:'#fff',fontWeight:'700'},primary:{fontSize:12,lineHeight:18,color:C.primary,fontWeight:'700'},link:{paddingVertical:10,paddingHorizontal:4},actions:{flexDirection:'row',gap:18},error:{fontSize:12,lineHeight:20,color:'#B3261E',marginTop:8}});
