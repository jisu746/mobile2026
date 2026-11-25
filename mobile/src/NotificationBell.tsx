import {useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {api} from './api';
import {listNotifs} from './notifs';
import {listProducts} from './inventory';
import {getStoreSetupSettingsOrDefault} from './storeSetupRepository';
import {buildInventoryAlerts} from './inventoryNotificationAlerts';
import {C} from './ui';

export default function NotificationBell({storeId}:{storeId:number}){
 const [unread,setUnread]=useState(false);
 useEffect(()=>{
  let active=true,busy=false;
  const refresh=async()=>{
   if(busy||!storeId||AppState.currentState==='background')return;
   busy=true;
   try{
    const [items,me]=await Promise.all([listNotifs(storeId),api<{username:string;role:string}>('GET','/api/me')]);
    let localUnread=false;
    if(me.role==='owner'){
     const [products,settings,raw]=await Promise.all([listProducts(storeId),getStoreSetupSettingsOrDefault(storeId),AsyncStorage.getItem(`inventoryNotificationReads:${me.username}:${storeId}`)]);
     let keys:string[]=[];try{const value=JSON.parse(raw??'[]');if(Array.isArray(value))keys=value.filter(x=>typeof x==='string');}catch{}
     localUnread=buildInventoryAlerts(products,settings.expiryEnabled===false?-1:settings.expirationAlertDays,settings.lowStockThresholdCount,true,true,new Set(keys)).some(x=>!x.read);
    }
    if(active)setUnread(items.some(x=>!x.read)||localUnread);
   }catch{}finally{busy=false;}
  };
  void refresh();const timer=setInterval(refresh,15000);const subscription=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{active=false;clearInterval(timer);subscription.remove();};
 },[storeId]);
 return <View accessible accessibilityLabel={unread?'읽지 않은 알림 있음':'알림'}><Ionicons name="notifications-outline" size={26} color={C.primary}/>{unread&&<View style={{position:'absolute',right:0,top:0,width:8,height:8,borderRadius:4,backgroundColor:'#E53935',borderWidth:1,borderColor:'white'}}/>}</View>;
}
