"""Publish verified, immutable voice assets to the existing Supabase project.
Credentials are read only on this machine; they are never copied into the app.
Usage: python3 scripts/publish-audio.py --env /path/to/.env
"""
import argparse, hashlib, json, time, urllib.request, urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
p=argparse.ArgumentParser();p.add_argument('--env',required=True);args=p.parse_args()
env=dict(l.split('=',1) for l in Path(args.env).read_text().splitlines() if '=' in l and not l.startswith('#'))
base=env['EXPO_PUBLIC_SUPABASE_URL'].strip('"\' ').rstrip('/');key=env['SUPABASE_SERVICE_ROLE_KEY'].strip('"\' ')
assert base=='https://jrmtfhmhcbkdzqzhbgfv.supabase.co'
root=Path(__file__).resolve().parents[1];out=root/'output/final-voices';bucket='seodang-audio'
def request(path,data=None,method=None,headers=None,public=False):
 h={} if public else {'Authorization':'Bearer '+key,'apikey':key}
 h.update(headers or {});req=urllib.request.Request(base+path,data=data,method=method,headers=h)
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=60) as r:return r.read()
  except urllib.error.HTTPError as e:
   if e.code<500:raise
  except (TimeoutError,urllib.error.URLError):
   if attempt==2:raise
  time.sleep(attempt+1)
 raise RuntimeError('Server request failed')
try:request('/storage/v1/bucket/'+bucket)
except urllib.error.HTTPError as e:
 if e.code not in [400,404]:raise
 request('/storage/v1/bucket',json.dumps(dict(id=bucket,name=bucket,public=True,file_size_limit=6291456,allowed_mime_types=['audio/mp4','application/json','text/plain'])).encode(),headers={'Content-Type':'application/json'})
entries=[]
jobs=json.loads((out/'jobs.json').read_text())
for lang in ['ja','ko']:
 items=json.loads((out/(lang+'-manifest.json')).read_text());entries+=items
expected={j['file']:(j['text'],j['locale']) for j in jobs}
actual={e['file']:(e['text'],e['locale']) for e in entries}
assert len(entries)==len(expected) and actual==expected, 'Generation must match the complete current job inventory'
unique={e['sha256']:e for e in entries}
def upload(e):
 b=(out/e['source']).read_bytes();assert hashlib.sha256(b).hexdigest()==e['sha256'] and len(b)==e['bytes']
 path=f'/storage/v1/object/{bucket}/voices-v1/{e["sha256"]}.m4a'
 try:request(path,b,'POST',{'Content-Type':'audio/mp4','Cache-Control':'max-age=31536000','x-upsert':'false'})
 except urllib.error.HTTPError as error:
  if error.code not in [400,409]:raise
 # Compare public bytes even after an existing-object response; never trust an upload count alone.
 remote=request(path.replace('/object/','/object/public/'),public=True)
 assert hashlib.sha256(remote).hexdigest()==e['sha256']
 return e['sha256']
with ThreadPoolExecutor(max_workers=5) as pool:
 for i,_ in enumerate(pool.map(upload,unique.values()),1):
  if i%25==0 or i==len(unique):print(f'Published and verified {i}/{len(unique)}',flush=True)
files={e['file']:dict(url=f'{base}/storage/v1/object/public/{bucket}/voices-v1/{e["sha256"]}.m4a',sha256=e['sha256'],bytes=e['bytes'],duration=e['duration'],voice=e['voice'],text=e['text'],locale=e['locale'],pronunciation=e.get('pronunciation')) for e in entries}
catalog=dict(schema=1,version='',files=files,packs=json.loads((out/'packs.json').read_text()))
catalog['version']=hashlib.sha256(json.dumps(catalog,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:16]
payload=json.dumps(catalog,ensure_ascii=False,separators=(',',':')).encode()
request('/rest/v1/seodang_audio_releases?on_conflict=version',json.dumps(dict(version=catalog['version'],catalog=catalog)).encode(),headers={'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'})
request(f'/storage/v1/object/{bucket}/catalogs/{catalog["version"]}.json',payload,'POST',{'Content-Type':'application/json','x-upsert':'true'})
(root/'assets/audio/catalog.json').write_bytes(payload)
print(json.dumps(dict(version=catalog['version'],references=len(entries),uniqueFiles=len(unique),bytes=sum(e['bytes'] for e in unique.values()))),flush=True)
