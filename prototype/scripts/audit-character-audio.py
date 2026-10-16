"""Audit all single written characters and all explicitly generated single-mora kana.
Checks the shipped AAC decode, not just masters. Acoustic checks do not replace listening.
"""
from pathlib import Path
import json,wave,subprocess,tempfile
import numpy as np
root=Path(__file__).resolve().parents[1];out=root/'output/final-voices'
entries=sum([json.loads((out/f'{lang}-manifest.json').read_text()) for lang in ['ja','ko']],[])
rows=[];cache={}
for e in entries:
 if len(e['text'].strip())!=1 and not e.get('pronunciation') and not e['file'].startswith('assets/audio/korean/korean.1-'):continue
 if e['sha256'] not in cache:
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'decoded.wav';subprocess.run(['afconvert','-f','WAVE','-d','LEI16',str(out/e['source']),str(path)],check=True,capture_output=True)
   with wave.open(str(path)) as w:
    rate=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
  step=int(rate*.01);rms=np.array([np.sqrt(np.mean(x[i:i+step]**2)) for i in range(0,len(x),step)])
  active=np.flatnonzero(rms>max(.005,rms.max()*.07))
  cache[e['sha256']]=dict(duration=round(len(x)/rate,3),active=round(len(active)*.01,3),span=round((active[-1]-active[0]+1)*.01,3) if len(active) else 0,peak=round(float(abs(x).max()),4),clipped=int((abs(x)>=.999).sum()),start=round(active[0]*.01,3) if len(active) else None)
 a=dict(file=e['file'],text=e['text'],locale=e['locale'],pronunciation=e.get('pronunciation'),**cache[e['sha256']]);a['issues']=[]
 if a['peak']<.01 or a['span']==0:a['issues'].append('silent')
 if a['clipped']>rate*.001:a['issues'].append('clipping')
 if a['pronunciation'] and a['span']<.24:a['issues'].append('kana_too_short')
 if a['locale']=='ko-KR' and a['span']<.20:a['issues'].append('korean_too_short')
 if a['start'] is not None and a['start']<.02:a['issues'].append('no_start_margin')
 rows.append(a)
report=dict(scope='All single written characters, Korean letter lessons, and single-mora kana; AAC acoustic and synthesis reading checks, not a human listening certification.',files=len(rows),unique=len(cache),issues=[r for r in rows if r['issues']],rows=rows)
(out/'character-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='rows'},ensure_ascii=False,indent=2))
if report['issues']:raise SystemExit(1)
