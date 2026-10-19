"""Append verified scenario clips to the existing immutable audio catalogue.
Generate ja/ko manifests in output/scenario-voices first. No existing clip is replaced.
"""
import argparse, hashlib, json, urllib.request, urllib.error
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--env',required=True);args=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'output/scenario-voices';path=root/'assets/audio/catalog.json';before=path.read_bytes();catalog=json.loads(before)
env=dict(l.split('=',1) for l in Path(args.env).read_text().splitlines() if '=' in l and not l.startswith('#'))
base=env['EXPO_PUBLIC_SUPABASE_URL'].strip('"\' ').rstrip('/');api_key=env['SUPABASE_SERVICE_ROLE_KEY'].strip('"\' ')
assert base=='https://jrmtfhmhcbkdzqzhbgfv.supabase.co'
def request(path,data=None,method=None,headers=None,public=False):
 h={} if public else {'Authorization':'Bearer '+api_key,'apikey':api_key};h.update(headers or {})
 try:
  with urllib.request.urlopen(urllib.request.Request(base+path,data=data,method=method,headers=h),timeout=90) as r:return r.read()
 except urllib.error.HTTPError as e:
  if e.code==401:print('Authorization error:',e.read().decode()[:300],flush=True)
  raise
entries=sum([json.loads((out/f'{lang}-manifest.json').read_text()) for lang in ['ja','ko']],[])
expected={e['file']:(e['text'],e['locale']) for e in json.loads((out/'jobs.json').read_text())}
assert len(entries)==len(expected)==30 and {e['file']:(e['text'],e['locale']) for e in entries}==expected
for e in entries:
 data=(out/e['source']).read_bytes();assert hashlib.sha256(data).hexdigest()==e['sha256'] and len(data)==e['bytes']
 remote=f'/storage/v1/object/seodang-audio/voices-v1/{e["sha256"]}.m4a'
 try:request(remote,data,'POST',{'Content-Type':'audio/mp4','Cache-Control':'max-age=31536000','x-upsert':'false'})
 except urllib.error.HTTPError as error:
  if error.code not in [400,409]:raise
 public=remote.replace('/object/','/object/public/');assert hashlib.sha256(request(public,public=True)).hexdigest()==e['sha256']
 clip=dict(url=base+public,sha256=e['sha256'],bytes=e['bytes'],duration=e['duration'],voice=e['voice'],text=e['text'],locale=e['locale'])
 assert e['file'] not in catalog['files'] or catalog['files'][e['file']]==clip, 'Refusing to replace an existing clip'
 catalog['files'][e['file']]=clip
 print('Verified',e['file'],flush=True)
for key,pack in json.loads((out/'packs.json').read_text()).items():
 assert all(f in catalog['files'] for f in pack['files'])
 catalog['packs'][key]=pack
catalog['version']='';catalog['version']=hashlib.sha256(json.dumps(catalog,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:16]
payload=json.dumps(catalog,ensure_ascii=False,separators=(',',':')).encode()
request('/rest/v1/seodang_audio_releases?on_conflict=version',json.dumps(dict(version=catalog['version'],catalog=catalog)).encode(),headers={'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'})
remote=f'/storage/v1/object/seodang-audio/catalogs/{catalog["version"]}.json'
try:request(remote,payload,'POST',{'Content-Type':'application/json','x-upsert':'false'})
except urllib.error.HTTPError as error:
 if error.code not in [400,409]:raise
assert request(remote.replace('/object/','/object/public/'),public=True)==payload
assert path.read_bytes()==before,'Catalogue changed concurrently'
path.write_bytes(payload)
print('Appended 30 clips and 10 packs:',catalog['version'])
