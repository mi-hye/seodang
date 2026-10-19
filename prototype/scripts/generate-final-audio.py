"""Regenerate selected voices, resumably, into output/final-voices (never overwrite source audio)."""
from pathlib import Path
import argparse, json, hashlib, subprocess, wave, re
p=argparse.ArgumentParser();p.add_argument('language',choices=['ja','ko']);p.add_argument('--output',type=Path);p.add_argument('--segment',action='store_true');args=p.parse_args()
root=Path(__file__).resolve().parents[1];out=args.output.resolve() if args.output else root/'output/final-voices';out.mkdir(parents=True,exist_ok=True)
jobs=[j for j in json.loads((out/'jobs.json').read_text()) if j['locale'].startswith(args.language)]
if args.language=='ja':
 from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
 r=Path('/tmp/seodang-voicevox/runtime')
 synth=Synthesizer(Onnxruntime.load_once(filename=str(next((r/'onnxruntime/lib').glob('*.dylib')))),OpenJtalk(str(r/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=4)
 with VoiceModelFile.open(str(r/'models/vvms/n0.vvm')) as m:synth.load_voice_model(m)
else:
 import numpy as np
 import soundfile as sf
 from supertonic import TTS
 synth=TTS(model='supertonic-3',auto_download=True,intra_op_num_threads=4,inter_op_num_threads=1)
 style=synth.get_voice_style('M1')
entries=[]
for n,j in enumerate(jobs):
 # Character exercises must not use contextual particle readings (は→ワ, へ→エ).
 query=None;isolated_kana=False
 if args.language=='ja' and re.fullmatch('[ぁ-ゖァ-ヺー]{1,2}',j['text'].strip()):
  kana=''.join(chr(ord(c)+96) if 'ぁ'<=c<='ゖ' else c for c in j['text'].strip())
  query=synth.create_audio_query(kana,10001)
  moras=[m for phrase in query.accent_phrases for m in phrase.moras]
  isolated_kana=len(moras)==1
  if isolated_kana:
   # Preserve the consonant articulation and pitch; sustain the vowel/nasal itself.
   if moras[0].vowel in ['A','I','U','E','O']:moras[0].vowel=moras[0].vowel.lower()
   moras[0].vowel_length=.30
 short_korean=args.language=='ko' and j['text'].strip() in ['하','까','따','짜','왜']
 revision='supertonic3M1-ot-stretch-v3' if args.language=='ko' and j['text']=='옷' else 'nemo10001-character300ms-v3' if isolated_kana else 'supertonic3M1-short-syllable-v2' if short_korean else 'nemo10001-supertonic3M1-v1'
 if args.segment:revision+='-sentence-segments-v1'
 identity=hashlib.sha256((j['locale']+'|'+j['text']+'|'+revision).encode()).hexdigest()
 wav=out/(identity+'.wav');m4a=out/(identity+'.m4a')
 if not wav.exists():
  tmp=wav.with_suffix('.tmp.wav')
  if args.language=='ja':
   q=query if isolated_kana else synth.create_audio_query(j['text'],10001);q.speed_scale=1.;q.intonation_scale=1.
   tmp.write_bytes(synth.synthesis(q,10001))
  else:
   np.random.seed(42)
   parts=re.findall(r'[^.!?。！？]+[.!?。！？]*',j['text']) if args.segment else [j['text']]
   assert ''.join(parts)==j['text']
   waves=[]
   for part in parts:
    audio,_=synth.synthesize(part,voice_style=style,lang='ko',speed=.75 if short_korean else 1.,total_steps=12)
    wave_data=np.asarray(audio).reshape(-1)
    assert np.isfinite(wave_data).all() and np.max(np.abs(wave_data))>.005
    waves.extend([wave_data,np.zeros(int(synth.sample_rate*.18))])
   data=np.concatenate(waves[:-1])
   assert np.isfinite(data).all() and np.max(np.abs(data))>.005, j
   if j['text']=='옷':
    # The preset produces a ~140 ms isolated closed syllable even at its minimum
    # synthesis speed. Stretch the original sound without changing pitch or text;
    # retain onset/coda margins rather than inventing an extra vowel after 받침.
    import librosa
    step=int(synth.sample_rate*.01)
    rms=np.array([np.sqrt(np.mean(data[i:i+step]**2)) for i in range(0,len(data),step)])
    active=np.flatnonzero(rms>max(.005,rms.max()*.07))
    assert len(active)>0
    first=max(0,(active[0]-6)*step);last=min(len(data),(active[-1]+9)*step)
    data=librosa.effects.time_stretch(data[first:last],rate=.55,n_fft=1024,hop_length=256)
   sf.write(tmp,data,synth.sample_rate,subtype='PCM_16')
  tmp.replace(wav)
 with wave.open(str(wav)) as w:
  duration=w.getnframes()/w.getframerate()
 assert duration>.08,j
 if not m4a.exists():
  subprocess.run(['afconvert','-f','m4af','-d','aac','-b','64000',str(wav),str(m4a)],check=True,capture_output=True)
 b=m4a.read_bytes();sha=hashlib.sha256(b).hexdigest()
 entries.append(dict(**j,pronunciation=query.kana if isolated_kana else None,source=m4a.name,sha256=sha,bytes=len(b),duration=round(duration,3),voice='VOICEVOX Nemo 男声1' if args.language=='ja' else 'Supertonic 3 M1'))
 (out/(args.language+'-manifest.json')).write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
 print(f'{args.language} {n+1}/{len(jobs)} {j["file"]} {duration:.2f}s',flush=True)
