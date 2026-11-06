import {messagePushConfig} from './message-push-config.js';
import {createCommunityAPI} from './community-api.js';
import {developmentMode} from './build-config.js';
const KEY='seodang.message-push.v1';
let controller;
export function getMessagePush(){return controller ||= createMessagePush();}
export function createMessagePush({cap=globalThis.Capacitor,storage=globalThis.localStorage,api,config=messagePushConfig,emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail})),timeoutMs=15000}={}){
 const platform=cap?.getPlatform?.(),supported=!!(config[platform]&&cap?.isPluginAvailable?.('PushNotifications'));
 // Native Capacitor injects Plugins directly. This app does not load the JS SDK,
 // so registerPlugin is not present on real devices.
 const plugin=supported?(cap.Plugins?.PushNotifications||cap.registerPlugin?.('PushNotifications')):null;
 let activeAPI=api;
 let state=supported?'off':'unsupported',record={},listeners=null,inflight=null,locale='ko',pendingResolve=null,pendingReject=null;
 try{record=JSON.parse(storage.getItem(KEY))||{};}catch{}
 function save(){storage.setItem(KEY,JSON.stringify(record));}
 function update(value){state=value;emit('seodang:push-state',{state});return state;}
 const send=payload=>activeAPI.pushDevice({p_installation:record.id,...payload});
 async function registered(token){
  try{
   if(!record.enabled||!activeAPI.session?.user?.id)return;
   await send({p_action:'register',p_platform:platform,p_token:token.value,p_environment:platform==='ios'&&developmentMode?'development':'production',p_locale:locale});
   record.owner=activeAPI.session.user.id;save();update('on');pendingResolve?.('on');
  }catch(e){update('error');pendingReject?.(e);}
 }
 async function listen(){listeners ||= Promise.all([
  plugin.addListener('registration',registered),
  plugin.addListener('registrationError',()=>{update('error');pendingReject?.(Error('push_registration_failed'));}),
  plugin.addListener('pushNotificationReceived',n=>emit('seodang:push-message',{...n.data,opened:false})),
  plugin.addListener('pushNotificationActionPerformed',event=>emit('seodang:push-message',{...event.notification?.data,opened:true})),
 ]);await listeners;}
 async function register(){
  await listen();update('busy');
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{update('error');pendingResolve=pendingReject=null;reject(Error('push_registration_timeout'));},timeoutMs);
   pendingResolve=value=>{clearTimeout(timer);pendingResolve=pendingReject=null;resolve(value);};
   pendingReject=error=>{clearTimeout(timer);pendingResolve=pendingReject=null;reject(error);};
   void plugin.register().catch(error=>pendingReject?.(error));
  });
 }
 async function perform(request=false,isActive=()=>true){
  if(!supported)return state;
  activeAPI=api||createCommunityAPI();
  await listen();
  if(record.owner&&record.owner!==activeAPI.session?.user?.id){record={};save();await plugin.unregister();}
  let permission=await plugin.checkPermissions();
  const entry=request==='entry';
  if(entry&&(!isActive()||!activeAPI.session?.user?.id))return state;
  // Respect an explicit in-app opt-out, including preferences saved by older builds.
  if(entry&&record.enabled===false)return update('off');
  if(request&&['prompt','prompt-with-rationale'].includes(permission.receive)){
   if(entry&&record.asked)return update('off');
   record.asked=true;save();permission=await plugin.requestPermissions();
  }
  if(permission.receive!=='granted'){
   if(record.id&&activeAPI.session?.user?.id)await send({p_action:'remove'});
   update(permission.receive==='denied'?'denied':'off');
   // Existing OS denial gets one settings hint; a just-dismissed OS prompt does not.
   if(entry&&permission.receive==='denied'&&!record.asked&&!record.settingsNoticeShown&&isActive()){
    record.settingsNoticeShown=true;save();return 'settings';
   }
   return state;
  }
  if(entry&&(!isActive()||state==='on'))return state;
  if(!request&&(record.enabled===false||(!record.enabled&&!record.asked&&!record.settingsNoticeShown)))return update('off');
  if(!activeAPI.session?.user?.id)return update('off');
  record.id ||= crypto.randomUUID();record.enabled=true;save();
  if(platform==='android')await plugin.createChannel({id:'messages',name:locale==='ja'?'メッセージ':'메시지',importance:4,visibility:0,sound:'default'});
  return register();
 }
 return {
  get state(){return state;},
  async read(roomId){if(!supported)return;try{const {notifications}=await plugin.getDeliveredNotifications();const matching=notifications.filter(n=>n.data?.room_id===roomId);if(matching.length)await plugin.removeDeliveredNotifications({notifications:matching});}catch{}},
  sync(language='ko'){locale=language;return inflight ||= perform().catch(()=>update('error')).finally(()=>{inflight=null;});},
  async enter(language='ko',isActive=()=>true){
   // App-start sync may still be checking permissions when the conversation opens.
   if(inflight)await inflight;
   if(!isActive())return state;
   locale=language;return inflight ||= perform('entry',isActive).catch(()=>update('error')).finally(()=>{inflight=null;});
  },
  enable(language='ko'){locale=language;return inflight ||= perform(true).catch(()=>update('error')).finally(()=>{inflight=null;});},
  async disable(){if(!supported)return;update('busy');try{if(record.id)await send({p_action:'remove'});record.enabled=false;save();await plugin.unregister();return update('off');}catch{return update('error');}},
 };
}
