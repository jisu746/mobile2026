import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {isRunningInExpoGo} from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';
export async function installPushHandler(){
 if(Platform.OS==='web'||isRunningInExpoGo())return;
 const Notifications=await import('expo-notifications');
 Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
}
export async function registerPushDevice(){
 if(Platform.OS==='web')throw new Error('푸시 알림은 설치한 휴대폰 앱에서 연결해주세요.');
 if(isRunningInExpoGo())throw new Error('Expo Go에서는 실제 푸시를 지원하지 않아요. 설치용 앱에서 연결해주세요.');
 const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
 if(!projectId)throw new Error('배포 프로젝트 연결이 필요해요. 앱 빌드 설정을 먼저 완료해주세요.');
 const Notifications=await import('expo-notifications');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('default',{name:'매장 알림',importance:Notifications.AndroidImportance.DEFAULT});
 let permission=await Notifications.getPermissionsAsync();if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();
 if(permission.status!=='granted')throw new Error('휴대폰 알림 권한이 허용되지 않았어요.');
 const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
 await api('POST','/api/me/push-devices',{token,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul'});
 await AsyncStorage.setItem('storemate-push-device',token);
 await installPushHandler();
 return '이 기기의 푸시 알림을 연결했어요.';
}
export async function unregisterPushDevice(){const token=await AsyncStorage.getItem('storemate-push-device');if(!token)return;try{await api('DELETE','/api/me/push-devices',{token});}finally{await AsyncStorage.removeItem('storemate-push-device');}}
