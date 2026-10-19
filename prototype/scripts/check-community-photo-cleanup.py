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
management_token=(Path.home()/'.supabase/access-token').read_text().strip()
def sql(query):
 req=urllib.request.Request('https://api.supabase.com/v1/projects/'+url.split('//')[1].split('.')[0]+'/database/query',method='POST',headers={'Authorization':'Bearer '+management_token,'Content-Type':'application/json'},data=json.dumps({'query':query}).encode())
 with urllib.request.urlopen(req,timeout=30) as r:return json.loads(r.read())
try:
 status,s=call('/auth/v1/signup','POST',{});check(status==200,'create cleanup fixture account');u=s['user'];users.append(u['id']);token=s['access_token']
 status,_=rest('profiles',method='POST',token=token,data={'id':u['id'],'nickname':'정리테스트','native_language':'ko','learning_language':'ja','rules_version':1});check(status==201,'fixture profile')
 post=str(uuid.uuid4());path=u['id']+'/'+post+'-'+str(uuid.uuid4())+'.jpg';fresh=u['id']+'/'+str(uuid.uuid4())+'-'+str(uuid.uuid4())+'.jpg'
 data=(root/'prototype/assets/cafe-dusk-v2.jpg').read_bytes()
 for p in [path,fresh]:
  status,_=photo(p,'POST',token,data);check(status==200,'upload fixture photo')
 status,_=rest('posts',method='POST',token=token,data={'id':post,'author_id':u['id'],'language':'ko','body':'cleanup fixture','wants_correction':False,'image_paths':[path]});check(status==201,'publish fixture photo')
 status,_=call('/rest/v1/rpc/community_claim_photo_cleanup','POST',{},token=token);check(status>=400,'ordinary member cannot run cleanup')
 status,_=call('/functions/v1/community-photo-cleanup','POST',{},token=token);check(status==401,'ordinary member cannot invoke worker')
 status,_=rest('posts?id=eq.'+post,method='DELETE',token=token);check(status in (200,204),'delete post without client photo cleanup')
 rows=sql("select path from community_private.photo_cleanup_jobs where path='"+path+"'");check(len(rows)==1,'post deletion durably queues photo')
 status,jobs=call('/rest/v1/rpc/community_claim_photo_cleanup','POST',{'batch_size':100},admin=True);check(status==200,'server can claim cleanup jobs');job=next(j for j in jobs if j['path']==path)
 # Simulate a Storage failure: job persists and is scheduled for another attempt.
 status,result=call('/rest/v1/rpc/community_finish_photo_cleanup','POST',{'photo_path':path,'token':job['lease_token'],'succeeded':False,'failure':'fixture_storage_503'},admin=True);check(status==200 and result is False,'failed deletion retained for retry')
 rows=sql("select attempts,last_error,next_attempt_at>now() as deferred from community_private.photo_cleanup_jobs where path='"+path+"'");check(rows[0]['attempts']==1 and rows[0]['deferred'] and rows[0]['last_error']=='fixture_storage_503','retry records attempt and backoff')
 # A late acknowledgement from a different lease cannot clear the job.
 status,result=call('/rest/v1/rpc/community_finish_photo_cleanup','POST',{'photo_path':path,'token':str(uuid.uuid4()),'succeeded':True},admin=True);check(status==200 and result is False,'stale lease cannot acknowledge another job')
 time.sleep(10.1) # Existing post-write rate limit applies even to this fixture.
 status,_=rest('posts',method='POST',token=token,data={'id':post,'author_id':u['id'],'language':'ko','body':'retry attaching queued image','image_paths':[path]});check(status>=400,'queued photo cannot be republished during deletion')
 sql("update community_private.photo_cleanup_jobs set next_attempt_at=now() where path='"+path+"'")
 request=sql('select community_private.invoke_photo_cleanup() as id')[0]['id']
 result=None
 for _ in range(20):
  rows=sql('select status_code,content from net._http_response where id='+str(request))
  if rows:result=rows[0];break
  time.sleep(.5)
 check(result and result['status_code']==200,'scheduled worker responds successfully')
 status,_=photo(path,token=token);check(status>=400,'worker deletes queued object through Storage API')
 rows=sql("select path from community_private.photo_cleanup_jobs where path='"+path+"'");check(not rows,'successful retry removes completed job')
 status,_=photo(fresh,token=token);check(status==200,'fresh unpublished image is preserved for 24 hours')
 print('CLEANUP SECURITY PASSED',len(passed))
finally:
 for uid in users:
  status,objects=call('/storage/v1/object/list/community-photos','POST',{'prefix':uid+'/'},admin=True)
  if status==200 and objects:call('/storage/v1/object/community-photos','DELETE',{'prefixes':[uid+'/'+x['name'] for x in objects]},admin=True)
  call('/auth/v1/admin/users/'+uid,'DELETE',admin=True)
  sql("delete from community_private.photo_cleanup_jobs where path like '"+uid+"/%'")
