import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, TextInputProps, TextProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text as AppText, TextInput } from './font';
import { C } from './ui';
import { changePassword } from './passwordRepository';

function Text(props: TextProps) { return <AppText {...props} style={[Platform.OS === 'android' && {fontFamily:'sans-serif',includeFontPadding:false},props.style]} />; }
function PasswordInput(props: TextInputProps) { return <View style={s.inputFrame}><TextInput {...props} underlineColorAndroid="transparent" style={s.input} /></View>; }
export default function ChangePassword({username,onBack,onLogout}:{username:string;onBack:()=>void;onLogout:()=>void}){
 const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');const working=useRef(false);
 const back=()=>{if(working.current)return;if(saved)onLogout();else onBack();};
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{back();return true;});return()=>sub.remove();},[saved,onBack,onLogout]);
 const save=async()=>{if(working.current)return;working.current=true;setBusy(true);setError('');try{await changePassword(username,current,next,confirmation);setCurrent('');setNext('');setConfirmation('');setSaved(true);}catch(e){setError(e instanceof Error?e.message:'비밀번호를 변경하지 못했어요.');}finally{working.current=false;setBusy(false);}};
 return <View style={s.root}><View style={s.header}><Pressable disabled={busy} onPress={back} hitSlop={12}><Ionicons name="arrow-back" size={24} color={C.text}/></Pressable><Text style={s.title}>비밀번호 변경</Text></View>
  <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="none" nestedScrollEnabled overScrollMode="never" bounces={false} decelerationRate="normal" contentContainerStyle={s.body}>
   {saved?<><Text style={s.title}>비밀번호를 변경했어요.</Text><Text style={s.hint}>모든 기기의 기존 로그인이 종료됐어요. 새 비밀번호로 다시 로그인해 주세요.</Text><Pressable style={s.button} onPress={onLogout}><Text style={s.white}>로그인 화면으로</Text></Pressable></>:<>
    <Text style={s.hint}>변경하면 모든 기기의 기존 로그인이 종료돼요. 새 비밀번호는 공백 없이 영문·숫자·특수문자를 포함한 8~72자로 입력해 주세요.</Text>
    <Text style={s.label}>현재 비밀번호</Text><PasswordInput secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} textContentType="password" value={current} onChangeText={setCurrent}/>
    <Text style={s.label}>새 비밀번호</Text><PasswordInput secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} textContentType="newPassword" value={next} onChangeText={setNext} maxLength={72}/>
    <Text style={s.label}>새 비밀번호 확인</Text><PasswordInput secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} textContentType="newPassword" value={confirmation} onChangeText={setConfirmation} maxLength={72}/>
    {!!error&&<Text style={s.error}>{error}</Text>}
    <Pressable disabled={busy} style={[s.button,busy&&{opacity:.5}]} onPress={()=>void save()}><Text style={s.white}>{busy?'변경 중…':'비밀번호 변경'}</Text></Pressable>
   </>}
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#fff'},header:{height:56,flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20},title:{lineHeight:26,fontSize:18,fontWeight:'700',color:C.text},body:{flexGrow:1,padding:20,paddingBottom:80},hint:{fontSize:13,lineHeight:22,color:'#686373',marginTop:0},label:{fontSize:14,lineHeight:20,fontWeight:'700',color:C.text,marginTop:18},inputFrame:{height:48,borderWidth:1,borderColor:'#D8D3E8',borderRadius:10,overflow:'hidden',backgroundColor:'#fff',marginTop:8},input:{flex:1,width:'100%',borderWidth:0,borderBottomWidth:0,borderBottomColor:'transparent',outlineWidth:0,backgroundColor:'#fff',paddingHorizontal:12,paddingVertical:0,fontSize:15,color:C.text,...(Platform.OS==='android'?{fontFamily:'sans-serif',includeFontPadding:false,textAlignVertical:'center' as const}:{})},button:{height:48,alignItems:'center',justifyContent:'center',backgroundColor:C.primary,borderRadius:12,paddingHorizontal:16,marginTop:24},white:{color:'#fff',fontSize:15,lineHeight:22,fontWeight:'700',textAlign:'center'},error:{color:'#B3261E',fontSize:13,lineHeight:22,marginTop:14}});
