import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError } from './api';
export type NotificationPreferences = Record<'push'|'task'|'expiry'|'stock'|'memo'|'pay'|'quiet',boolean>&{quietStart:string;quietEnd:string;revision:number;initialized:boolean;username:string};
export const DEFAULT_NOTIFICATION_PREFERENCES:NotificationPreferences={push:true,task:true,expiry:true,stock:true,memo:true,pay:true,quiet:false,quietStart:'23:00',quietEnd:'08:00',revision:0,initialized:false,username:''};
const route='/api/me/notification-preferences';
export function validateNotificationPreferences(value:NotificationPreferences){
 const keys=['push','task','expiry','stock','memo','pay','quiet'] as const;
 if(keys.some(key=>typeof value[key]!=='boolean')||!Number.isSafeInteger(value.revision)||value.revision<0)throw new Error('설정을 다시 불러와 주세요.');
 const time=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!time.test(value.quietStart)||!time.test(value.quietEnd)||value.quietStart===value.quietEnd)throw new Error('방해 금지 시작과 종료 시각은 서로 다른 HH:mm 형식이어야 해요.');
}
function check(userId:string,value:NotificationPreferences){if(!userId||value.username!==userId)throw new Error('로그인 계정이 변경됐어요. 다시 로그인해 주세요.');validateNotificationPreferences(value);return value;}
function payload(v:NotificationPreferences){return {push:v.push,task:v.task,expiry:v.expiry,stock:v.stock,memo:v.memo,pay:v.pay,quiet:v.quiet,quietStart:v.quietStart,quietEnd:v.quietEnd,revision:v.revision,username:v.username};}
export async function getNotificationPreferences(userId:string):Promise<NotificationPreferences>{
 const current=check(userId,await api<NotificationPreferences>('GET',route));
 if(current.initialized)return current;
 // Only the explicitly account-scoped old key can seed a first-time server record.
 const raw=await AsyncStorage.getItem(`notificationSettings:${userId}`);
 if(!raw)return current;
 let local:unknown;try{local=JSON.parse(raw);}catch{return current;}
 if(!local||typeof local!=='object')return current;
 const candidate={...current};const old=local as Partial<NotificationPreferences>;
 for(const key of ['push','task','expiry','stock','memo','pay','quiet'] as const)if(typeof old[key]==='boolean')candidate[key]=old[key]!;
 if(typeof old.quietStart==='string')candidate.quietStart=old.quietStart;
 if(typeof old.quietEnd==='string')candidate.quietEnd=old.quietEnd;
 try{validateNotificationPreferences(candidate);}catch{return current;}
 try{
  const saved=await saveNotificationPreferences(userId,candidate);
  await AsyncStorage.removeItem(`notificationSettings:${userId}`).catch(()=>{});return saved;
 }catch(e){if(e instanceof ApiError&&e.status===409)return check(userId,await api<NotificationPreferences>('GET',route));throw e;}
}
export async function saveNotificationPreferences(userId:string,value:NotificationPreferences):Promise<NotificationPreferences>{
 check(userId,value);return check(userId,await api<NotificationPreferences>('PUT',route,payload(value)));
}
