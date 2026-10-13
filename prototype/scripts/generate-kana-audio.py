"""Generate bundled kana with VOICEVOX CORE 0.17 / Nemo n0.vvm 0.16.4.
Usage: python scripts/generate-kana-audio.py RUNTIME_DIR LESSONS_JSON
Requires voicevox_core==0.17.0; runtime/models/dict are generation-only.
Output audio credit: VOICEVOX Nemo (https://voicevox.hiroshiba.jp/nemo/term/).
"""
import sys,json,wave,io,hashlib,math
from pathlib import Path
from array import array
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
runtime=Path(sys.argv[1]); lessons=json.loads(Path(sys.argv[2]).read_text())
output=Path(__file__).resolve().parents[1]/'assets/audio/kana'
output.mkdir(parents=True,exist_ok=True)
voice=10005
synth=Synthesizer(Onnxruntime.load_once(filename=str(next((runtime/'onnxruntime/lib').glob('*.dylib')))),OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=4)
with VoiceModelFile.open(str(runtime/'models/vvms/n0.vvm')) as model:synth.load_voice_model(model)
metadata={'provider':'VOICEVOX Nemo','voice':'女声1','styleId':voice,'coreVersion':'0.17.0','modelVersion':'0.16.4','credit':'VOICEVOX Nemo','terms':'https://voicevox.hiroshiba.jp/nemo/term/','languageReview':'Explicit single-mora kana input; native-speaker listening review pending','files':{}}
frames={}
def save_audio(key,text,raw,query=None):
 path=output/(key+'.wav');path.write_bytes(raw)
 with wave.open(io.BytesIO(raw),'rb') as w:
  pcm=w.readframes(w.getnframes());samples=array('h',pcm);duration=w.getnframes()/w.getframerate()
  assert w.getframerate()==24000 and w.getnchannels()==1
  peak=max(abs(x) for x in samples);rms=math.sqrt(sum(x*x for x in samples)/len(samples))
  assert .25<duration<4 and 300<peak<32768 and rms>50,(key,duration,peak,rms)
  frames[key]=pcm
 metadata['files'][key]={'text':text,'file':str(path.relative_to(output.parents[2])),'duration':round(duration,3),'peak':peak,'rms':round(rms,1),'sha256':hashlib.sha256(raw).hexdigest(),'phonemes':query}
for lesson in lessons:
 for letter in lesson['letters']:
  kana='オ' if letter['id']=='wo' else chr(ord(letter['text'])+0x60)
  query=synth.create_audio_query_from_kana(kana+"'",voice)
  assert len(query.accent_phrases)==1 and len(query.accent_phrases[0].moras)==1
  query.speed_scale=.92;query.intonation_scale=.65;query.pre_phoneme_length=.09;query.post_phoneme_length=.15
  mora=query.accent_phrases[0].moras[0]
  mora.vowel_length=max(mora.vowel_length,.28 if letter['id']=='n' else .18)
  raw=synth.synthesis(query,voice)
  save_audio(letter['id'],letter['text'],raw,{'kana':kana,'consonant':mora.consonant,'vowel':mora.vowel})
  print(letter['id'],metadata['files'][letter['id']]['duration'],flush=True)
for i,lesson in enumerate(lessons):
 first,last=lesson['letters'][0],lesson['letters'][-1]
 buf=io.BytesIO()
 with wave.open(buf,'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000)
  w.writeframes(frames[first['id']]+bytes(2*int(24000*.18))+frames[last['id']])
 save_audio('case-'+str(i+1),first['text']+'、'+last['text'],buf.getvalue())
(output/'manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
print('Generated',len(metadata['files']),'files',flush=True)
