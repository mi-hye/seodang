"""Generate Korean particle sentences locally; install only decoded/ASR-checked AAC.

Uses cached Supertonic 3 M1 models with downloads disabled. Existing bundled
files are copied for independent verification and never overwritten. Run the
existing verify-course-expansion-audio.py against output/particle-voices before
--install. No remote catalogue writes, upload, app build, or device install.
"""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/particle-voices'
PROVENANCE=ROOT/'docs/asset-provenance/particle-audio-20261029.json'

def sha(data):return hashlib.sha256(data).hexdigest()

def save(path,value):
 tmp=path.with_suffix('.tmp.json')
 tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
 tmp.replace(path)

def main():
 global OUT, PROVENANCE
 p=argparse.ArgumentParser()
 p.add_argument('--course',choices=['particle','ending'],default='particle')
 p.add_argument('--install',action='store_true')
 p.add_argument('--seed',type=int,default=42)
 p.add_argument('--speed',type=float,default=.94)
 p.add_argument('--only',help='Regenerate one sentence file; existing bundled files remain untouched')
 args=p.parse_args()
 OUT=ROOT/f'output/{args.course}-voices'
 if args.course=='ending':PROVENANCE=ROOT/'docs/asset-provenance/ending-audio-20261030.json'
 subprocess.run(['node',f'scripts/prepare-{args.course}-audio.mjs','--verify'],cwd=ROOT,check=True)
 jobs_bytes=(OUT/'jobs.json').read_bytes();jobs=json.loads(jobs_bytes)
 if args.install:
  report=json.loads((OUT/'asr-review.json').read_text())
  rows={x['file']:x for x in report['rows']}
  entries={x['file']:x for x in json.loads((OUT/'ko-manifest.json').read_text())}
  expected={x['file'] for x in jobs}
  assert report['complete'] and set(rows)==set(entries)==expected,'Incomplete verification'
  assert not report['acousticIssues'] and not report['mismatches'],'Unresolved audio verification failures'
  files=[]
  for job in jobs:
   file=job['file'];entry=entries[file];row=rows[file]
   assert entry['text']==row['text']==job['text']
   data=(OUT/entry['source']).read_bytes()
   assert sha(data)==entry['sha256']==row['sha256']
   assert len(data)==entry['bytes']==row['bytes']
   target=ROOT/file
   if target.exists():assert target.read_bytes()==data,'Refusing to overwrite existing lesson audio'
   else:
    target.parent.mkdir(parents=True,exist_ok=True)
    temporary=target.with_suffix('.tmp.m4a');temporary.write_bytes(data);temporary.replace(target)
   files.append({**job,'sha256':entry['sha256'],'bytes':entry['bytes'],'duration':row['acoustic']['duration'],'voice':entry['voice'],'reused':entry['reused'],'synthesis':entry.get('synthesis'),'transcript':row['transcript'],'asrMatch':row['match'],**({'repeatTranscript':row['repeatTranscript'],'repeatMatch':row['repeatMatch']} if row.get('repeatTranscript') is not None else {})})
  summary={k:v for k,v in report.items() if k!='rows'}
  save(PROVENANCE,{'date':'2026-10-30','scope':('Korean level 3.5 ending comparisons, lessons 35-1–35-4.' if args.course=='ending' else 'Korean level 2.5 particle comparisons, content version 2: paired examples and complete correct sentences, lessons 1–13.'),'distribution':'Local app-bundled AAC. No upload or remote catalogue changes.','voice':'Supertonic 3 M1','generation':'Cached offline Supertonic 3. Existing exact-text bundled clips are reused unchanged.','jobsSha256':sha(jobs_bytes),'lessons':len(json.loads((OUT/'packs.json').read_text())),'clips':len(files),'bytes':sum(f['bytes'] for f in files),'audioVerification':{'status':'automated-comparison-complete','method':'Every AAC decoded with afconvert; duration, active samples, peak and clipping checked; local mlx-whisper large-v3-turbo without expected-text prompts. Short ASR disagreements are also checked with repeated audio.','humanListening':False,'devicePlayback':False,'limitations':'ASR and acoustic checks do not certify human listening or device playback.','summary':summary},'packs':json.loads((OUT/'packs.json').read_text()),'files':files})
  print(json.dumps({'installed':len(files),'new':sum(not f['reused'] for f in files),'reused':sum(f['reused'] for f in files),'bytes':sum(f['bytes'] for f in files)}));return
 import numpy as np
 import soundfile as sf
 from supertonic import TTS
 engine=None;style=None
 entries={x['file']:x for x in json.loads((OUT/'ko-manifest.json').read_text())} if (OUT/'ko-manifest.json').exists() else {}
 for index,job in enumerate(jobs,1):
  file=job['file']
  if args.only and args.only!=file:continue
  existing=ROOT/file
  if existing.exists():
   source=OUT/'reused'/existing.name;source.parent.mkdir(parents=True,exist_ok=True)
   shutil.copyfile(existing,source);reused=True;synthesis=None
  else:
   if engine is None:
    engine=TTS(model='supertonic-3',auto_download=False,intra_op_num_threads=4,inter_op_num_threads=1)
    style=engine.get_voice_style('M1')
   identity=sha(json.dumps([job['locale'],job['text'],args.speed,args.seed,'particle-v1'],ensure_ascii=False).encode())
   wav=OUT/f'{identity}.wav';source=OUT/f'{identity}.m4a'
   if not wav.exists():
    np.random.seed(args.seed)
    data,_=engine.synthesize(job['text'],voice_style=style,lang='ko',speed=args.speed,total_steps=16)
    data=np.asarray(data).reshape(-1)
    assert np.isfinite(data).all() and np.max(np.abs(data))>.005
    sf.write(wav,data,engine.sample_rate,subtype='PCM_16')
   if not source.exists():subprocess.run(['afconvert','-f','m4af','-d','aac','-b','64000',str(wav),str(source)],check=True,capture_output=True)
   reused=False;synthesis={'seed':args.seed,'speed':args.speed,'steps':16,'displayedTextChanged':False}
  data=source.read_bytes()
  entries[file]={**job,'source':str(source.relative_to(OUT)),'sha256':sha(data),'bytes':len(data),'voice':'Supertonic 3 M1','reused':reused,'synthesis':synthesis}
  save(OUT/'ko-manifest.json',[entries[j['file']] for j in jobs if j['file'] in entries])
  print(json.dumps({'generated':index,'total':len(jobs),'text':job['text'],'reused':reused},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
