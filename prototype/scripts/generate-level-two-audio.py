"""Generate only the additional level-two clips with the existing local Qwen voices."""
import hashlib,json,os,subprocess
from pathlib import Path
from datetime import date
import numpy as np
import soundfile as sf
import mlx.core as mx
from mlx_audio.tts.utils import load_model
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'assets/audio/level-two'
STAGE=ROOT/'output/level-two-audio';STAGE.mkdir(parents=True,exist_ok=True)
MODEL_PATH=Path(os.environ.get('QWEN_MODEL_PATH',ROOT/'output/qwen-samples/model'))
jobs=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {extraSentenceCases,extraKoreanCases} from './src/level-two-content.js';console.log(JSON.stringify([...Object.entries(extraSentenceCases).flatMap(([id,c])=>[{id:`sentence.${id}.intro`,text:c.intro,locale:'ja-JP'},...c.sentences.map(s=>({id:s.id,text:s.spoken,locale:'ja-JP'}))]),...Object.entries(extraKoreanCases).flatMap(([id,c])=>c.items.map((s,i)=>({id:`korean.${id}.${i}`,text:s.text,locale:'ko-KR'})))]));"],cwd=ROOT,text=True))
model=load_model(str(MODEL_PATH.resolve()))
base=json.loads((ROOT/'assets/audio/sentences/manifest.json').read_text())
manifest={k:v for k,v in base.items() if k not in ['files','voice','voiceId','locale']}
manifest.update(generatedAt=str(date.today()),modelRevision=(MODEL_PATH/'revision.txt').read_text().strip(),files={})
for i,j in enumerate(jobs):
 voice,language=('Sohee','Korean') if j['locale']=='ko-KR' else ('Ono_Anna','Japanese')
 instruct='Speak calmly and naturally, with clear pronunciation, at a normal conversational pace.'
 cached=STAGE/(hashlib.sha256((voice+j['text']+manifest['modelRevision']).encode()).hexdigest()+'.wav')
 limit=max(4,len(j['text'])*.35)
 if cached.exists() and sf.info(cached).duration>=limit:cached.unlink()
 if not cached.exists():
  for attempt in range(5):
   mx.random.seed(42+attempt*1000)
   results=list(model.generate_custom_voice(text=j['text'],speaker=voice,language=language,instruct=instruct,max_tokens=800,temperature=.7,verbose=False))
   data=np.concatenate([np.asarray(x.audio).reshape(-1) for x in results]);sr=results[0].sample_rate
   if np.isfinite(data).all() and .3<len(data)/sr<limit and .01<np.max(np.abs(data))<1:break
  else:raise RuntimeError(('Invalid audio',j))
  sf.write(cached,data,sr,subtype='PCM_16');mx.clear_cache()
 pcm,sr=sf.read(cached,dtype='int16');peak=int(np.max(np.abs(pcm.astype(np.int32))));rms=float(np.sqrt(np.mean(pcm.astype(float)**2)))
 assert sr==24000 and 300<peak<32768 and rms>50
 entry={**j,'spoken':j['text'],'file':f"assets/audio/level-two/{j['id']}.wav",'voice':voice,'voiceId':voice,'duration':round(len(pcm)/sr,3),'peak':peak,'rms':round(rms,1),'sha256':hashlib.sha256(cached.read_bytes()).hexdigest(),'instruction':instruct,'temperature':.7}
 manifest['files'][j['id']]=entry
 print(f"{i+1}/{len(jobs)} {j['id']} {entry['duration']}s",flush=True)
DEST.mkdir(parents=True,exist_ok=True)
for j in jobs:
 cached=STAGE/(hashlib.sha256((manifest['files'][j['id']]['voiceId']+j['text']+manifest['modelRevision']).encode()).hexdigest()+'.wav')
 (DEST/(j['id']+'.wav')).write_bytes(cached.read_bytes())
(DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(DEST/'NOTICE.txt').write_text((ROOT/'assets/audio/korean/NOTICE.txt').read_text())
