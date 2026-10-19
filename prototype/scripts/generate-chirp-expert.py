"""Prepare/generate Level 5 Kore clips, with a conservative 10,000-byte local monthly cap.
Only --generate sends synthesis requests. Never enables the API or publishes app content.
The caller must verify account-wide free allowance; local accounting is not a cloud spending cap.
"""
import argparse,base64,datetime,fcntl,hashlib,json,pathlib,subprocess,urllib.request,wave
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--account',required=True);p.add_argument('--generate',action='store_true');p.add_argument('--free-allowance-verified',action='store_true');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];out=root/'output/chirp3-expert';samples=root/'output/chirp3-samples';out.mkdir(parents=True,exist_ok=True)
content_path=root/'src/expert-content.json';raw=content_path.read_bytes();content=json.loads(raw);jobs=[];packs={}
for direction,articles in content.items():
 for id,article in enumerate(articles):
  files=[];locale='ja-JP' if direction=='ko-ja' else 'ko-KR'
  for group in ['perspectives','expressions']:
   for i,line in enumerate(article['discussion'][group]):
    digest=hashlib.sha256((locale+'\0'+line['text']).encode()).hexdigest()[:16]
    line['audioFile']=f'assets/audio/expert/chirp3-kore-v1.{direction}.{id}.{group}.{i}.{digest}.wav';files.append(line['audioFile'])
    jobs.append({'file':line['audioFile'],'text':line['text'],'locale':locale,'voice':locale+'-Chirp3-HD-Kore'})
  packs[f'{direction}:expert:{id}']={'title':article['discussion']['title'],'level':7,'files':files}
assert len(jobs)==32 and len(packs)==8
(out/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n');(out/'packs.json').write_text(json.dumps(packs,ensure_ascii=False,indent=2)+'\n')
(out/'content-before.sha256').write_text(hashlib.sha256(raw).hexdigest());(out/'content-proposed.json').write_text(json.dumps(content,ensure_ascii=False,indent=2)+'\n')
month=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m');cap=10000
sample_plan=json.loads((samples/'jobs.json').read_text())['jobs'];sample_usage=json.loads((samples/'usage-ledger.json').read_text())
reused={}
for j in jobs:
 for sj in sample_plan:
  if sj['text']==j['text'] and sj['voice']==j['voice']:
   f=samples/sj['output'];h=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else ''
   if any(e['id']==sj['id'] and e.get('sha256')==h and e.get('status')=='complete' for e in sample_usage):reused[j['file']]=f
ledger_path=out/'usage-ledger.json';ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else []
used=sum(e['units'] for e in sample_usage+ledger if e['month']==month)
def mp3(j):return out/(pathlib.Path(j['file']).stem+'.mp3')
def cached(j):return mp3(j).exists() and any(e['file']==j['file'] and e.get('sha256')==hashlib.sha256(mp3(j).read_bytes()).hexdigest() for e in ledger)
pending=[j for j in jobs if j['file'] not in reused and not cached(j)]
units=sum(len(j['text'].encode()) for j in pending)
assert used+units<=cap,f'Local monthly cap exceeded: {used}+{units}>{cap}; no synthesis requests sent'
print(json.dumps({'clips':len(jobs),'reuse':len(reused),'newRequests':len(pending),'newCharacters':sum(len(j['text']) for j in pending),'usedUpperBound':used,'newUpperBound':units,'localCap':cap}),flush=True)
if not a.generate:raise SystemExit(0)
if not a.free_allowance_verified:p.error('Verify the billing account free allowance first')
with (samples/'generation.lock').open('w') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 # Detect any concurrent accounting changes before committing a request.
 assert (json.loads(ledger_path.read_text()) if ledger_path.exists() else [])==ledger
 assert json.loads((samples/'usage-ledger.json').read_text())==sample_usage
 if pending:
  token=subprocess.run(['gcloud','auth','print-access-token',f'--account={a.account}'],capture_output=True,text=True,check=True).stdout.strip()
  headers={'Authorization':'Bearer '+token,'x-goog-user-project':'seodang-voice-20261019','Content-Type':'application/json'}
  for j in pending:
   e={'month':month,'file':j['file'],'text':j['text'],'units':len(j['text'].encode()),'status':'reserved'};ledger.append(e);ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
   req=urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',data=json.dumps({'input':{'text':j['text']},'voice':{'languageCode':j['locale'],'name':j['voice']},'audioConfig':{'audioEncoding':'MP3'}},ensure_ascii=False).encode(),headers=headers)
   with urllib.request.urlopen(req,timeout=90) as r:audio=base64.b64decode(json.load(r)['audioContent'],validate=True)
   assert len(audio)>1000;mp3(j).write_bytes(audio);e.update(status='complete',sha256=hashlib.sha256(audio).hexdigest());ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n');print('Generated',j['file'],flush=True)
 entries=[]
 for j in jobs:
  source=reused.get(j['file'],mp3(j));wav=out/(pathlib.Path(j['file']).stem+'.wav');m4a=wav.with_suffix('.m4a')
  subprocess.run(['afconvert','-f','WAVE','-d','LEI16',str(source),str(wav)],check=True,capture_output=True)
  with wave.open(str(wav)) as w:duration=w.getnframes()/w.getframerate()
  assert duration>.5
  if not m4a.exists():subprocess.run(['afconvert','-f','m4af','-d','aac','-b','64000',str(wav),str(m4a)],check=True,capture_output=True)
  data=m4a.read_bytes();entries.append(dict(file=j['file'],text=j['text'],locale=j['locale'],source=m4a.name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),duration=round(duration,3),voice='Google Cloud Chirp 3 HD Kore'))
 for lang,locale in [('ja','ja-JP'),('ko','ko-KR')]:
  (out/f'{lang}-manifest.json').write_text(json.dumps([e for e in entries if e['locale']==locale],ensure_ascii=False,indent=2)+'\n')
 print('Ready: 32 verified female clips; content not yet applied',flush=True)
