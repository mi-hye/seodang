"""Render all bundled audio with Qwen3-TTS Sohee / Ono_Anna, then install.
Run with a Python environment containing mlx-audio==0.5.9 and soundfile.
QWEN_MODEL_PATH may point to a downloaded MLX CustomVoice model.
All outputs are staged and checked before production audio is replaced.
"""
import hashlib,json,os,re,shutil,time
from datetime import date
from pathlib import Path
import numpy as np
import soundfile as sf
import mlx.core as mx
from mlx_audio.tts.utils import load_model
ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'output/qwen-replacement';STAGE.mkdir(parents=True,exist_ok=True)
MODEL='mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit'
MODEL_PATH=Path(os.environ.get('QWEN_MODEL_PATH',ROOT/'output/qwen-samples/model'))
REVISION=(MODEL_PATH/'revision.txt').read_text().strip()
VOICES={'ko-KR':('Sohee','Korean'),'ja-JP':('Ono_Anna','Japanese')}
INSTRUCT='Speak calmly and naturally, with clear pronunciation, at a normal conversational pace.'
def dump(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def segments(text):
 parts=[];buf=''
 for sentence in re.findall(r'[^。.!?！？]+[。.!?！？]*',text):
  if buf and len(buf+sentence)>150:parts.append(buf.strip());buf=''
  buf+=sentence
 if buf.strip():parts.append(buf.strip())
 assert ''.join(parts).replace(' ','')==text.replace(' ','')
 return parts
def trim_short_silence(data,sr):
 # Trim only low-energy edge padding; retain 150 ms around voiced frames.
 frame=max(1,sr//100)
 levels=np.array([np.sqrt(np.mean(data[i:i+frame]**2)) for i in range(0,len(data),frame)])
 active=np.flatnonzero(levels>max(.001,float(levels.max())*.015))
 if not len(active):return data
 start=max(0,int(active[0])*frame-int(.15*sr))
 end=min(len(data),(int(active[-1])+1)*frame+int(.15*sr))
 return data[start:end]
paths=sorted((ROOT/'assets/audio').rglob('*manifest.json'))
original={p:p.read_bytes() for p in paths}
manifests={p:json.loads(b) for p,b in original.items()}
records={}
for p,m in manifests.items():
 for key,e in m['files'].items():
  locale=e.get('locale','ko-KR' if p.parent.name in ['korean','korean-pronunciation'] else 'ja-JP')
  text=e.get('spoken',e.get('synthesisText',e['text']))
  if p.parent.name=='kana' and key=='wo':text='オ'
  r=dict(locale=locale,text=text,voice=VOICES[locale][0])
  if e['file'] in records:assert records[e['file']]==r
  records[e['file']]=r
if not (STAGE/'before.json').exists():dump(STAGE/'before.json',{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in records})
print('Loading',MODEL,REVISION,'for',len(records),'files',flush=True)
model=load_model(str(MODEL_PATH.resolve()))
assert all(v[0].lower() in model.supported_speakers for v in VOICES.values())
for index,(file,r) in enumerate(records.items(),1):
 parts=segments(r['text']);waves=[];partmeta=[]
 for part_index,part in enumerate(parts):
  seed=42+part_index
  instruction=INSTRUCT if len(part)>3 else 'Pronounce only the provided text once, clearly and naturally. Do not add any words.'
  key=hashlib.sha256(json.dumps([MODEL,REVISION,r['voice'],part,instruction,seed,.7]).encode()).hexdigest()
  cache=STAGE/(key+'.wav');meta=STAGE/(key+'.json')
  if cache.exists() and meta.exists():
   data,sr=sf.read(cache,dtype='float32');detail=json.loads(meta.read_text())
  else:
   limit=3 if len(part)<=3 else max(5,len(part)*.65+4)
   for attempt in range(20):
    mx.random.seed(seed+attempt*1000)
    synth_text=''.join(chr(ord(c)-96) if 'ァ'<=c<='ヶ' else c for c in part) if attempt>=5 and r['locale']=='ja-JP' else part
    if attempt>=12:synth_text+= '。' if r['locale']=='ja-JP' else '.'
    synth_instruction=instruction if attempt<5 else None
    results=list(model.generate_custom_voice(text=synth_text,speaker=r['voice'],language=VOICES[r['locale']][1],instruct=synth_instruction,max_tokens=min(2048,int(limit*12.5)+30),temperature=.7,verbose=False))
    sr=results[0].sample_rate
    data=np.concatenate([np.asarray(x.audio).reshape(-1) for x in results])
    if len(part)<=3:data=trim_short_silence(data,sr)
    duration=len(data)/sr;peak=float(np.max(np.abs(data)));rms=float(np.sqrt(np.mean(data**2)))
    if np.isfinite(data).all() and .15<duration<limit and .009<peak<1 and rms>.002:break
    print('RETRY',file,part_index,attempt,duration,peak,rms,flush=True)
   else:
    sf.write(STAGE/'failed.wav',data,sr,subtype='PCM_16')
    raise RuntimeError(('Invalid audio',file,part,duration,peak,rms))
   sf.write(cache,data,sr,subtype='PCM_16')
   detail=dict(text=part,seed=seed+attempt*1000,duration=duration,instruction=synth_instruction,synthesisText=synth_text);dump(meta,detail)
   mx.clear_cache()
  assert sr==24000
  if len(part)<=3:
   data=trim_short_silence(data,sr)
   detail.update(duration=len(data)/sr,edgeSilenceTrimmed=True)
  waves.append(data);partmeta.append(detail)
  if part_index<len(parts)-1:waves.append(np.zeros(int(sr*.18),dtype='float32'))
 data=np.concatenate(waves);dest=STAGE/f'{index:04}.wav';sf.write(dest,data,24000,subtype='PCM_16')
 pcm,sr=sf.read(dest,dtype='int16');peak=int(np.max(np.abs(pcm.astype(np.int32))));rms=float(np.sqrt(np.mean(pcm.astype(float)**2)))
 duration=len(pcm)/sr
 assert .15<duration<300 and 300<peak<32768 and rms>50,(file,duration,peak,rms)
 r.update(wav=str(dest),parts=partmeta,stats=dict(duration=round(duration,3),peak=peak,rms=round(rms,1),sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
 print(f'[{index}/{len(records)}] {file} {duration:.2f}s',flush=True)
 dump(STAGE/'progress.json',dict(completed=index,total=len(records),file=file))
# Refuse to overwrite concurrent edits to the input manifests.
for p,b in original.items():assert p.read_bytes()==b,('Manifest changed during generation',p)
for p,m in manifests.items():
 locales=set()
 for e in m['files'].values():
  r=records[e['file']];locales.add(r['locale'])
  for old in ['kana','phonemes','rate','speechRate']:e.pop(old,None)
  e.update(r['stats'],voice=r['voice'],voiceId=r['voice'],locale=r['locale'],synthesisText=r['text'],segmentedAtSentenceBoundaries=len(r['parts'])>1,synthesisSegments=r['parts'],instruction=INSTRUCT,temperature=.7)
 for old in ['styleId','coreVersion','modelVersion','credit','terms','voice','voiceId','licenseSection']:m.pop(old,None)
 m.update(provider='Qwen3-TTS (MLX Audio)',model=MODEL,modelRevision=REVISION,license='Apache-2.0',licenseSource='https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice',usageScope='Commercial model use permitted under Apache-2.0; no separate generated-audio restriction found in published model terms. Third-party rights are not warranted.',rightsReviewed=True,rightsReviewDate=str(date.today()),generatedAt=str(date.today()),languageReview='User approved Sohee and Ono_Anna samples; full native-speaker review of all recordings remains pending')
 if len(locales)==1:
  locale=next(iter(locales));m.update(voice=VOICES[locale][0],voiceId=VOICES[locale][0],locale=locale)
for file,r in records.items():shutil.copyfile(r['wav'],ROOT/file)
for p,m in manifests.items():
 dump(p,m)
 if p.name=='manifest.json':
  (p.parent/'NOTICE.txt').write_text('AI-generated learning audio: Qwen3-TTS CustomVoice.\nKorean: Sohee. Japanese: Ono_Anna.\nGenerated locally using MLX Audio; no cloned reference recording.\nSource model: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice\nConverted model: https://huggingface.co/'+MODEL+'\nModel license: Apache License 2.0. See ../LICENSE-Qwen3-TTS.txt.\nThe model license permits commercial use; no separate output distribution restriction was found in the published model terms. It does not warrant third-party rights or non-infringement.\nInput text, model revision, voice, settings and hashes: manifest.json.\nFull native-speaker listening review remains pending.\n')
for obsolete in (ROOT/'assets/audio').rglob('*.wav'):
 if str(obsolete.relative_to(ROOT)) not in records:obsolete.unlink()
dump(STAGE/'completed.json',dict(files=len(records),voices=VOICES,model=MODEL,revision=REVISION))
print('Installed',len(records),'verified recordings.',flush=True)
