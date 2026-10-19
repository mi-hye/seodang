#!/usr/bin/env python3
"""Temporary isolated accounts; no emails are sent. Always remove fixtures."""
import json,uuid,urllib.request,urllib.error,time
from pathlib import Path
root=Path(__file__).resolve().parents[2]
env={}
for line in (root/'.env').read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);env[k]=v.strip().strip('\"\'')
url=env['EXPO_PUBLIC_SUPABASE_URL'];anon=env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];service=env['SUPABASE_SERVICE_ROLE_KEY']
users=[];passed=[]
def call(path,method='GET',data=None,token=None,admin=False):
 key=service if admin else anon
 req=urllib.request.Request(url+path,method=method,headers={'apikey':key,'Authorization':'Bearer '+(token or key),'Content-Type':'application/json','Prefer':'return=representation'},data=None if data is None else json.dumps(data).encode())
 try:
  with urllib.request.urlopen(req,timeout=25) as r:
   raw=r.read();return r.status,json.loads(raw) if raw else None
 except urllib.error.HTTPError as e:
  raw=e.read();return e.code,json.loads(raw) if raw else None

def check(ok,name):
 if not ok:raise AssertionError(name)
 passed.append(name);print('PASS',name,flush=True)
def rest(table,**kw):return call('/rest/v1/community_'+table,**kw)
try:
 for i in range(3):
  status,s=call('/auth/v1/signup','POST',{})
  check(status==200 and s.get('user',{}).get('is_anonymous'),'automatic device account '+str(i))
  u=s['user'];users.append(u['id'])
  u['token']=s['access_token'];globals()['abc'[i]]=u
  status,p=rest('profiles',method='POST',data={'id':u['id'],'nickname':'Test '+str(i),'native_language':'ko' if i!=1 else 'ja','learning_language':'ja' if i!=1 else 'ko','rules_version':1},token=u['token'])
  check(status==201,'own profile '+str(i))
 status,p=rest('profiles?id=eq.'+a['id'],method='PATCH',data={'nickname':'Changed'},token=a['token']);check(status==200 and len(p)==1,'own profile update')
 status,p=rest('profiles?id=eq.'+a['id'],method='PATCH',data={'nickname':'Spoofed'},token=b['token']);check(status==200 and len(p)==0,'cannot edit another profile')
 status,p=rest('posts',method='POST',data={'author_id':a['id'],'language':'ja','body':'今日、コーヒーを飲みました。','wants_correction':True},token=a['token']);check(status==201,'publish post');post=p[0]
 status,p=rest('posts?select=*,profile:community_profiles!author_id(id,nickname)',token=b['token']);check(status==200 and p[0]['profile']['nickname']=='Changed','member feed profile join')
 status,p=rest('posts');check(status in(401,403),'anonymous cannot read member content')
 status,p=rest('posts',method='POST',data={'author_id':a['id'],'language':'ja','body':'spoof'},token=b['token']);check(status in(401,403),'cannot spoof author')
 status,p=rest('replies',method='POST',data={'author_id':b['id'],'post_id':post['id'],'body':'いいですね！','correction':'今日はコーヒーを飲みました。'},token=b['token']);check(status==201,'reply with correction')
 status,p=rest('rooms',method='POST',data={'requester_id':a['id'],'recipient_id':b['id']},token=a['token']);check(status==201,'request conversation');room=p[0]
 status,p=rest('messages',method='POST',data={'room_id':room['id'],'author_id':a['id'],'body':'before acceptance'},token=a['token']);check(status in(401,403),'messages require acceptance')
 status,p=rest('rooms?id=eq.'+room['id'],method='PATCH',data={'status':'accepted'},token=a['token']);check(status==200 and len(p)==0,'requester cannot self accept')
 status,p=rest('rooms?id=eq.'+room['id'],method='PATCH',data={'status':'accepted'},token=b['token']);check(status==200 and len(p)==1,'recipient accepts')
 status,p=rest('rooms?id=eq.'+room['id'],method='PATCH',data={'requester_id':c['id']},token=b['token']);check(status in(401,403),'participants immutable')
 status,p=rest('messages',method='POST',data={'room_id':room['id'],'author_id':a['id'],'body':'안녕하세요'},token=a['token']);check(status==201,'accepted message');message=p[0]
 status,p=rest('messages?room_id=eq.'+room['id'],token=b['token']);check(status==200 and len(p)==1,'recipient reads message')
 status,p=rest('messages?room_id=eq.'+room['id'],token=c['token']);check(status==200 and p==[],'third account cannot read private message')
 status,p=rest('messages',method='POST',data={'room_id':room['id'],'author_id':c['id'],'body':'intrusion'},token=c['token']);check(status in(401,403),'third account cannot send private message')
 status,p=rest('reports',method='POST',data={'reporter_id':c['id'],'reported_user_id':a['id'],'message_id':message['id'],'reason':'not a participant'},token=c['token']);check(status in(401,403),'cannot report inaccessible message')
 status,p=rest('reports',method='POST',data={'reporter_id':b['id'],'reported_user_id':a['id'],'message_id':message['id'],'reason':'test report'},token=b['token']);check(status==201,'participant report')
 status,p=rest('reports',token=a['token']);check(status==200 and p==[],'reports private to reporter and operator')
 status,p=rest('blocks',method='POST',data={'owner_id':b['id'],'blocked_id':a['id']},token=b['token']);check(status==201,'block user')
 for u in(a,b):
  status,p=rest('messages?room_id=eq.'+room['id'],token=u['token']);check(status==200 and p==[],'blocked messages hidden '+u['id'][:4])
 status,p=rest('posts?id=eq.'+post['id'],token=b['token']);check(status==200 and p==[],'blocked posts hidden')
 status,p=rest('messages',method='POST',data={'room_id':room['id'],'author_id':a['id'],'body':'after block'},token=a['token']);check(status in(401,403),'blocked sender rejected')
 status,p=call('/functions/v1/community-delete-account','POST',{},token=c['token']);check(status==200 and p.get('deleted'),'self delete account')
 status,p=call('/auth/v1/admin/users/'+c['id'],admin=True);check(status==404,'deleted auth user gone')
 print('COMMUNITY SECURITY CHECKS:',len(passed))
finally:
 for user in users:
  status,_=call('/auth/v1/admin/users/'+user,'DELETE',admin=True)
  if status not in(200,204,404):print('CLEANUP FAILED',user,status)
