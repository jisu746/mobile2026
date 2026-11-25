import {useEffect,useRef,useState} from 'react';
import {Modal,Pressable,ScrollView,View} from 'react-native';
import {Text,TextInput} from './font';
import {api} from './api';
import {C} from './ui';

type Catalog={categories:string[];revision:number};
export async function getCategories(storeId:number):Promise<Catalog>{
 try{return await api<Catalog>('GET',`/api/stores/${storeId}/categories`);}
 catch(error){const {ApiError}=await import('./api');if(!(error instanceof ApiError)||error.status!==404)throw error;return api<Catalog>('GET',`/api/stores/${storeId}/template`);}
}
const input={height:46,borderWidth:1,borderColor:'#D8D3E8',borderRadius:12,paddingHorizontal:12,color:C.text,fontSize:14};
const button={paddingVertical:12,paddingHorizontal:14,borderRadius:12,backgroundColor:C.primary};

export function CategoryChoices({storeId,value,onChange}:{storeId:number;value:string;onChange:(value:string)=>void}){
 const [names,setNames]=useState<string[]>([]);
 useEffect(()=>{let alive=true;getCategories(storeId).then(v=>{if(alive)setNames(v.categories);},()=>{});return()=>{alive=false;};},[storeId]);
 return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingVertical:8}}>{Array.from(new Set(['',...names,value])).map(name=><Pressable key={name} onPress={()=>onChange(name)} style={{padding:10,borderRadius:18,backgroundColor:name===value?C.primary:'#F1F0F5'}}><Text style={{color:name===value?'white':C.primary,fontSize:13}}>{name||'미분류'}</Text></Pressable>)}</ScrollView>;
}

export default function CategoryManager({storeId,onClose,onSaved}:{storeId:number;onClose:()=>void;onSaved:(names:string[])=>void}){
 const [data,setData]=useState<Catalog|null>(null),[name,setName]=useState(''),[edit,setEdit]=useState<string|null>(null),[remove,setRemove]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 const load=()=>getCategories(storeId).then(setData,e=>setError(e.message));
 useEffect(()=>{void load();},[storeId]);
 const save=async(action:'ADD'|'RENAME'|'DELETE',original:string)=>{
  if(!data||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const result=await api<Catalog>('POST',`/api/stores/${storeId}/categories`,{action,name:original,next:action==='RENAME'?name.trim():null,revision:data.revision});setData(result);setName('');setEdit(null);setRemove(null);onSaved(result.categories);}
  catch(e){setError(e instanceof Error?e.message:'분류를 저장하지 못했어요.');}
  finally{lock.current=false;setBusy(false);}
 };
 return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}><View style={{flex:1,backgroundColor:'white',paddingTop:36}}><View style={{flexDirection:'row',alignItems:'center',padding:18,gap:16}}><Pressable disabled={busy} onPress={onClose}><Text style={{fontSize:24,color:C.text}}>〈</Text></Pressable><Text style={{fontSize:20,fontWeight:'700'}}>카테고리 관리</Text></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,gap:16,paddingBottom:40}}>
 <Text style={{fontSize:14,lineHeight:23,color:'#686373'}}>우리 매장에 맞는 분류를 직접 만들어요.{"\n"}예: 화장품 매장 → 스킨케어, 메이크업, 클렌징</Text>
 <Text style={{fontWeight:'700'}}>{edit?'분류 이름 수정':'새 카테고리'}</Text><TextInput style={input} value={name} onChangeText={setName} maxLength={20} placeholder="카테고리 이름 (최대 20자)"/>
 <View style={{flexDirection:'row',gap:12}}><Pressable style={button} disabled={busy||!name.trim()||!data} onPress={()=>void save(edit?'RENAME':'ADD',edit??name.trim())}><Text style={{color:'white',fontWeight:'700'}}>{busy?'저장 중…':edit?'이름 저장':'+ 카테고리 추가'}</Text></Pressable>{edit&&<Pressable onPress={()=>{setEdit(null);setName('');}}><Text style={{padding:12,color:C.primary}}>취소</Text></Pressable>}</View>
 {!!error&&<Text style={{color:'#B3261E',lineHeight:23}}>{error}<Text onPress={()=>{setEdit(null);setName('');void load();}}>{'\n'}최신 분류 다시 불러오기</Text></Text>}
 {!data&&!error&&<Text>불러오는 중이에요.</Text>}
 {data?.categories.map(item=><View key={item} style={{padding:14,borderWidth:1,borderColor:'#E4E2EC',borderRadius:14,gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:16}}><Text style={{flex:1,fontWeight:'700'}}>{item}</Text><Pressable disabled={busy} onPress={()=>{setEdit(item);setName(item);setRemove(null);}}><Text style={{color:C.primary}}>이름 수정</Text></Pressable><Pressable disabled={busy} accessibilityLabel={`${item} 카테고리 삭제`} onPress={()=>setRemove(item)}><Text style={{color:'#B3261E'}}>삭제</Text></Pressable></View>{remove===item&&<><Text style={{fontSize:13,lineHeight:22}}>분류만 삭제해요. 이 분류의 상품은 삭제되지 않고 ‘미분류’로 이동해요.</Text><View style={{flexDirection:'row',gap:20}}><Pressable disabled={busy} onPress={()=>void save('DELETE',item)}><Text style={{color:'#B3261E',paddingVertical:10,fontWeight:'700'}}>분류 삭제 확인</Text></Pressable><Pressable onPress={()=>setRemove(null)}><Text style={{paddingVertical:10,color:C.primary}}>취소</Text></Pressable></View></>}</View>)}
 {data&&!data.categories.length&&<Text>아직 만든 카테고리가 없어요. 위에서 추가해주세요.</Text>}
 </ScrollView></View></Modal>;
}
