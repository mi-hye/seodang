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
def photo(path,method='GET',token=None,data=None):
 headers={'apikey':anon,'Authorization':'Bearer '+(token or anon)}
 if data is not None:headers['Content-Type']='image/jpeg';headers['Cache-Control']='max-age=0'
 req=urllib.request.Request(url+'/storage/v1/object/'+('authenticated/' if method=='GET' else '')+'community-photos/'+path+('?v='+str(uuid.uuid4()) if method=='GET' else ''),method=method,headers=headers,data=data)
 try:
  with urllib.request.urlopen(req,timeout=30) as r:return r.status,r.read()
 except urllib.error.HTTPError as e:return e.code,e.read()
try:
 for i in range(2):
  status,s=call('/auth/v1/signup','POST',{})
  check(status==200,'create photo fixture account')
  u=s['user'];users.append(u['id']);u['token']=s['access_token'];globals()['ab'[i]]=u
  status,_=rest('profiles',method='POST',token=u['token'],data={'id':u['id'],'nickname':'사진테스트','native_language':'ko','learning_language':'ja','rules_version':1})
  check(status==201,'create fixture profile')
 post=str(uuid.uuid4());path=a['id']+'/'+post+'-'+str(uuid.uuid4())+'.jpg'
 data=(root/'prototype/assets/cafe-dusk-v2.jpg').read_bytes()
 status,_=photo(path,'POST',a['token'],data);check(status==200,'owner can upload JPEG')
 status,_=photo(path,token=b['token']);check(status>=400,'unpublished photo hidden from other user')
 status,_=photo(path,'POST',b['token'],data);check(status>=400,'other user cannot overwrite owner photo')
 status,_=rest('posts',method='POST',token=a['token'],data={'id':post,'author_id':a['id'],'language':'ko','body':'','wants_correction':False,'image_paths':[path]})
 check(status==201,'photo-only post saved')
 status,_=photo(path,token=b['token']);check(status==200,'visible post photo readable by community member')
 status,_=call('/storage/v1/object/public/community-photos/'+path,token=None);check(status>=400,'photo is not public')
 status,result=call('/storage/v1/object/community-photos','DELETE',{'prefixes':[path]},token=a['token']);check(status==200 and not result,'referenced photo cannot be removed before post')
 status,_=rest('posts',method='POST',token=b['token'],data={'id':str(uuid.uuid4()),'author_id':b['id'],'language':'ja','body':'test','image_paths':[path]});check(status>=400,'cannot attach another owner photo')
 many_id=str(uuid.uuid4());many=[a['id']+'/'+many_id+'-'+str(uuid.uuid4())+'.jpg' for _ in range(3)]
 status,_=rest('posts',method='POST',token=a['token'],data={'id':many_id,'author_id':a['id'],'language':'ko','body':'test','image_paths':many});check(status>=400,'three photos rejected')
 status,_=rest('blocks',method='POST',token=b['token'],data={'owner_id':b['id'],'blocked_id':a['id']});check(status==201,'block fixture')
 status,_=photo(path,token=b['token']);check(status>=400,'blocked author photo inaccessible')
 status,_=call('/functions/v1/community-delete-account','POST',{},token=a['token']);check(status==200,'account deletion cleans photo storage')
 status,remaining=call('/storage/v1/object/list/community-photos','POST',{'prefix':a['id']+'/'},admin=True);check(status==200 and not remaining,'storage cleaned after account deletion')
 print('PHOTO SECURITY PASSED',len(passed))
finally:
 for uid in users:
  status,objects=call('/storage/v1/object/list/community-photos','POST',{'prefix':uid+'/'},admin=True)
  if status==200 and objects:call('/storage/v1/object/community-photos','DELETE',{'prefixes':[uid+'/'+x['name'] for x in objects]},admin=True)
  call('/auth/v1/admin/users/'+uid,'DELETE',admin=True)
