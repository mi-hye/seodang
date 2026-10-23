"""Decode bundled-course AAC and run local, unprompted Whisper verification.

This is an automated audit, not a claim of human listening. It can follow the
incremental synthesis manifests and resumes by AAC SHA-256. It never changes
lesson text or uploads audio. Japanese phonetic comparison only distinguishes
ASR orthography from a different sequence of spoken sounds.
"""
from pathlib import Path
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, time, unicodedata, wave

ROOT=Path(__file__).resolve().parents[1]

def normalized(text):
 return ''.join(c.lower() for c in unicodedata.normalize('NFKC',text) if c.isalnum())

def korean_number_spelling(text):
 """Only context-specific numeral spelling, never a semantic paraphrase."""
 digits='영일이삼사오육칠팔구'
 def sino(value):
  value=int(value)
  if value==0:return '영'
  if value>=100000000:return str(value)
  if value>=10000:
   high,low=divmod(value,10000)
   return ('' if high==1 else sino(high))+'만'+(sino(low) if low else '')
  result=''
  for unit,label in [(1000,'천'),(100,'백'),(10,'십'),(1,'')]:
   n,value=divmod(value,unit)
   if n:result+=('' if n==1 and unit>1 else digits[n])+label
  return result
 native={1:'한',2:'두',3:'세',4:'네',5:'다섯',6:'여섯',7:'일곱',8:'여덟',9:'아홉',10:'열',11:'열한',12:'열두'}
 text=unicodedata.normalize('NFKC',text)
 text=re.sub(r'(?<=\d),(?=\d)','',text)
 text=re.sub(r'\d+(?=\s*(?:분|층|호|번|일|년|인용|천|백|만|원))',lambda m:sino(m.group()),text)
 text=re.sub(r'\d+(?=\s*(?:시간|시|명|개|권|곳))',lambda m:native.get(int(m.group()),m.group()),text)
 return normalized(text)

def distance(a,b):
 row=list(range(len(b)+1))
 for i,x in enumerate(a,1):
  nxt=[i]
  for j,y in enumerate(b,1):nxt.append(min(nxt[-1]+1,row[j]+1,row[j-1]+(x!=y)))
  row=nxt
 return row[-1]

def atomic_json(path,value):
 tmp=path.with_suffix('.tmp.json');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)

def reading_worker(runtime):
 from voicevox_core.blocking import OpenJtalk
 analyzer=OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11'))
 for line in sys.stdin:
  try:
   phrases=analyzer.analyze(json.loads(line))
   print(json.dumps(''.join(m.text for p in phrases for m in p.moras),ensure_ascii=False),flush=True)
  except Exception as e:print(json.dumps({'error':str(e)}),flush=True)

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'output/course-expansion-voices');p.add_argument('--follow',action='store_true');p.add_argument('--model',default='mlx-community/whisper-large-v3-turbo');p.add_argument('--reading-python',type=Path);p.add_argument('--runtime',type=Path,default=Path('/tmp/seodang-voicevox/runtime'));p.add_argument('--japanese-reading-worker',action='store_true');p.add_argument('--retry-mismatches',action='store_true');p.add_argument('--acoustic-only',action='store_true');p.add_argument('--limit',type=int);args=p.parse_args()
 if args.japanese_reading_worker:return reading_worker(args.runtime)
 import numpy as np
 from scipy.signal import resample_poly
 if not args.acoustic_only:import mlx_whisper
 from math import gcd
 out=args.output.resolve();jobs=json.loads((out/'jobs.json').read_text());expected={j['file']:j for j in jobs}
 report_path=out/('acoustic-review.json' if args.acoustic_only else 'asr-review.json')
 previous=json.loads(report_path.read_text()) if report_path.exists() else {}
 rows={r['file']:r for r in previous.get('rows',[])}
 reader=None;reading_cache={}
 if args.reading_python:
  reader=subprocess.Popen([str(args.reading_python),str(Path(__file__).resolve()),'--japanese-reading-worker','--runtime',str(args.runtime)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
 def reading(text):
  if text not in reading_cache:
   reader.stdin.write(json.dumps(text,ensure_ascii=False)+'\n');reader.stdin.flush()
   result=json.loads(reader.stdout.readline())
   if not isinstance(result,str):raise RuntimeError(result)
   reading_cache[text]=normalized(result)
  return reading_cache[text]
 def classify(text,transcript,locale):
  wanted,heard=normalized(text),normalized(transcript)
  result={'normalizedExpected':wanted,'normalizedTranscript':heard,'characterErrorRate':round(distance(wanted,heard)/max(1,len(wanted)),4),'match':'mismatch'}
  if wanted==heard:result['match']='normalized-exact'
  elif locale=='ko-KR' and korean_number_spelling(text)==korean_number_spelling(transcript):result['match']='korean-number-spelling'
  elif locale=='ja-JP' and reader:
   result['expectedReading']=reading(text);result['transcriptReading']=reading(transcript)
   if result['expectedReading']==result['transcriptReading']:result['match']='japanese-phonetic'
  return result
 def classify_repeat(text,transcript,locale):
  # Whisper may collapse a repeated identical utterance to one or two copies.
  # Accept only a whole one/two/three-copy match, never a substring match.
  candidates=[classify(text*count,transcript,locale) for count in [1,2,3]]
  matching=next((x for x in candidates if x['match']!='mismatch'),None)
  return matching or min(candidates,key=lambda x:x['characterErrorRate'])
 for row in rows.values():
  if row.get('transcript') is not None:row.update(classify(row['text'],row['transcript'],row['locale']))
  if row.get('repeatTranscript') is not None:
   repeated=classify_repeat(row['text'],row['repeatTranscript'],row['locale'])
   row['repeatMatch']=repeated['match'];row['repeatCharacterErrorRate']=repeated['characterErrorRate']
 def save():
  ordered=[rows[j['file']] for j in jobs if j['file'] in rows]
  accepted=['normalized-exact','japanese-phonetic','korean-number-spelling']
  summary={'scope':'All generated AAC files, decoded locally; local unprompted ASR and acoustic checks. Not human listening or device playback certification.','model':None if args.acoustic_only else args.model,'initialPrompt':None,'expected':len(jobs),'verified':len(ordered),'complete':len(ordered)==len(jobs),'normalizedExact':sum(r.get('match')=='normalized-exact' for r in ordered),'japanesePhonetic':sum(r.get('match')=='japanese-phonetic' for r in ordered),'koreanNumberSpelling':sum(r.get('match')=='korean-number-spelling' for r in ordered),'repeatMatched':sum(r.get('match')=='mismatch' and r.get('repeatMatch') in accepted for r in ordered),'mismatches':[r['file'] for r in ordered if r.get('match')=='mismatch' and r.get('repeatMatch') not in accepted],'acousticIssues':[r['file'] for r in ordered if r['acoustic']['issues']],'rows':ordered}
  atomic_json(report_path,summary)
  return summary
 processed=0
 try:
  while True:
   entries=[]
   for lang in ['ja','ko','repair']:
    manifest=out/f'{lang}-manifest.json'
    if manifest.exists():
     try:entries.extend(json.loads(manifest.read_text()))
     except json.JSONDecodeError:continue # Synthesis writer is replacing a growing snapshot.
   ready={e['file']:e for e in entries};progress=False
   for job in jobs:
    file=job['file'];entry=ready.get(file)
    if not entry:continue
    if entry['text']!=job['text'] or entry['locale']!=job['locale']:raise ValueError(f'Stale generation metadata: {file}')
    old=rows.get(file)
    if old and old['sha256']==entry['sha256'] and not(args.retry_mismatches and old.get('match')=='mismatch' and old.get('repeatMatch') not in ['normalized-exact','japanese-phonetic','korean-number-spelling']):continue
    src=out/entry['source'];data=src.read_bytes()
    if hashlib.sha256(data).hexdigest()!=entry['sha256']:raise ValueError(f'Audio hash mismatch: {file}')
    with tempfile.TemporaryDirectory(prefix='seodang-course-decode-') as tmp:
     wav=Path(tmp)/'decoded.wav';subprocess.run(['afconvert','-f','WAVE','-d','LEI16',str(src),str(wav)],check=True,capture_output=True)
     with wave.open(str(wav)) as w:
      rate=w.getframerate();channels=w.getnchannels();raw=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
     audio=raw.reshape(-1,channels).mean(axis=1)
    duration=len(audio)/rate;peak=float(np.abs(audio).max());rms=float(np.sqrt(np.mean(audio**2)));active=float(np.count_nonzero(np.abs(audio)>.005)/rate);clipped=int(np.count_nonzero(np.abs(audio)>=.999));issues=[]
    if duration<.2 or active<.12 or peak<.01:issues.append('silent-or-too-short')
    if clipped>rate*.001:issues.append('clipping')
    acoustic={'sampleRate':rate,'channels':channels,'duration':round(duration,4),'peak':round(peak,5),'rms':round(rms,5),'activeSeconds':round(active,4),'clippedSamples':clipped,'issues':issues}
    row={**job,'sha256':entry['sha256'],'bytes':len(data),'acoustic':acoustic}
    if not args.acoustic_only:
     factor=gcd(rate,16000);samples=resample_poly(audio,16000//factor,rate//factor).astype(np.float32)
     result=mlx_whisper.transcribe(samples,path_or_hf_repo=args.model,language=job['locale'][:2],temperature=0,condition_on_previous_text=False,initial_prompt=None,verbose=None)
     row['transcript']=result['text'].strip();row.update(classify(job['text'],row['transcript'],job['locale']))
     row['averageLogProbability']=round(sum(s['avg_logprob'] for s in result['segments'])/max(1,len(result['segments'])),4)
     if row['match']=='mismatch' and duration<3:
      repeated=np.concatenate([samples,np.zeros(8000,dtype=np.float32),samples,np.zeros(8000,dtype=np.float32),samples])
      again=mlx_whisper.transcribe(repeated,path_or_hf_repo=args.model,language=job['locale'][:2],temperature=0,condition_on_previous_text=False,initial_prompt=None,verbose=None)
      row['repeatTranscript']=again['text'].strip()
      full=classify_repeat(job['text'],row['repeatTranscript'],job['locale'])
      row['repeatMatch']=full['match'];row['repeatCharacterErrorRate']=full['characterErrorRate']
    rows[file]=row;processed+=1;progress=True
    summary=save();print(json.dumps({'verified':summary['verified'],'expected':len(jobs),'file':file,'match':row.get('match'),'repeatMatch':row.get('repeatMatch'),'acousticIssues':issues},ensure_ascii=False),flush=True)
    if args.limit and processed>=args.limit:return
   summary=save()
   if summary['complete'] or not args.follow:break
   if not progress:time.sleep(5)
  print(json.dumps({k:v for k,v in summary.items() if k!='rows'},ensure_ascii=False),flush=True)
 finally:
  if reader:reader.stdin.close();reader.wait(timeout=20)

if __name__=='__main__':main()
