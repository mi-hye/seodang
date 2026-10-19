"""Generate the prepared four Chirp samples; never publish or alter app audio.
Requires gcloud login and a billing-enabled project with verified free allowance.
Local limits do NOT cover other users/projects sharing the billing account.
"""
import argparse, base64, datetime, fcntl, hashlib, json, pathlib, subprocess, urllib.request

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--project', required=True)
p.add_argument('--account', required=True)
p.add_argument('--generate', action='store_true', help='Send synthesis requests; default only plans')
p.add_argument('--free-allowance-verified', action='store_true')
a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'output/chirp3-samples'
plan=json.loads((out/'jobs.json').read_text());jobs=plan['jobs']
assert len(jobs)==4 and all(j['languageCode'] in ['ko-KR','ja-JP'] and j['voice'].startswith(j['languageCode']+'-Chirp3-HD-') for j in jobs)
assert all(pathlib.Path(j['output']).name==j['output'] for j in jobs)
# Count UTF-8 bytes as a conservative upper bound rather than relying on character accounting.
units=sum(len(j['text'].encode()) for j in jobs)
assert units<=2000
print(f'Prepared {len(jobs)} samples; conservative request units: {units}/2000')
if not a.generate:raise SystemExit(0)
if not a.free_allowance_verified:p.error('Verify billing-account free allowance before generation')
out.mkdir(parents=True,exist_ok=True)
with (out/'generation.lock').open('w') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 ledger_path=out/'usage-ledger.json';ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else []
 month=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m')
 def signature(j):return hashlib.sha256(json.dumps(j,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
 pending=[j for j in jobs if not any(e.get('signature')==signature(j) and e.get('sha256') and (out/j['output']).exists() and hashlib.sha256((out/j['output']).read_bytes()).hexdigest()==e['sha256'] for e in ledger)]
 used=sum(e['units'] for e in ledger if e['month']==month)
 assert used+sum(len(j['text'].encode()) for j in pending)<=2000,'Local monthly sample limit reached; no requests sent'
 token=subprocess.run(['gcloud','auth','print-access-token',f'--account={a.account}'],check=True,capture_output=True,text=True).stdout.strip()
 headers={'Authorization':'Bearer '+token,'x-goog-user-project':a.project,'Content-Type':'application/json'}
 def request(endpoint,payload=None):
  req=urllib.request.Request('https://texttospeech.googleapis.com/v1/'+endpoint,data=json.dumps(payload,ensure_ascii=False).encode() if payload else None,headers=headers)
  with urllib.request.urlopen(req,timeout=90) as response:return json.load(response)
 voices={v['name'] for v in request('voices')['voices']}
 assert all(j['voice'] in voices for j in jobs)
 for j in pending:
  e={'month':month,'project':a.project,'id':j['id'],'signature':signature(j),'units':len(j['text'].encode()),'status':'reserved'}
  ledger.append(e);ledger_path.write_text(json.dumps(ledger,indent=2)+'\n')
  # Reserve before sending, including failures/interruptions; never automatically retry charges.
  result=request('text:synthesize',{'input':{'text':j['text']},'voice':{'languageCode':j['languageCode'],'name':j['voice']},'audioConfig':{'audioEncoding':'MP3'}})
  audio=base64.b64decode(result['audioContent'],validate=True);assert len(audio)>1000
  (out/j['output']).write_bytes(audio);e.update(status='complete',sha256=hashlib.sha256(audio).hexdigest(),bytes=len(audio))
  ledger_path.write_text(json.dumps(ledger,indent=2)+'\n');print('Saved',j['output'])
