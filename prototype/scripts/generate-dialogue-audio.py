"""Generate bundled level 4 cafe dialogue using the same VOICEVOX Nemo voice as kana.
Usage: python scripts/generate-dialogue-audio.py RUNTIME_DIR LINES_JSON
Requires voicevox_core 0.17.0, Nemo n0.vvm 0.16.4. See bundled NOTICE.txt.
"""
import sys,json,wave,io,hashlib,math
from array import array
from pathlib import Path
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
runtime=Path(sys.argv[1]);lines=json.loads(Path(sys.argv[2]).read_text())
root=Path(__file__).resolve().parents[1];output=root/'assets/audio/dialogue';output.mkdir(parents=True,exist_ok=True)
synth=Synthesizer(Onnxruntime.load_once(filename=str(next((runtime/'onnxruntime/lib').glob('*.dylib')))),OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=4)
with VoiceModelFile.open(str(runtime/'models/vvms/n0.vvm')) as model:synth.load_voice_model(model)
metadata={'provider':'VOICEVOX Nemo','voice':'女声1','styleId':10005,'coreVersion':'0.17.0','modelVersion':'0.16.4','credit':'VOICEVOX Nemo','terms':'https://voicevox.hiroshiba.jp/nemo/term/','languageReview':'Generated short sentences recorded for review; native-speaker listening review pending','files':{}}
# Natural orthography makes the dictionary resolve each word, while on-screen spaces remain.
for entry in lines:
 key=entry['id'];text=entry.get('spoken', entry['text'])
 query=synth.create_audio_query(text,10005)
 query.speed_scale=.96;query.intonation_scale=1;query.pre_phoneme_length=.1;query.post_phoneme_length=.18
 raw=synth.synthesis(query,10005)
 path=output/(key+'.wav');path.write_bytes(raw)
 with wave.open(io.BytesIO(raw),'rb') as w:
  assert w.getnchannels()==1 and w.getframerate()==24000
  duration=w.getnframes()/w.getframerate();samples=array('h',w.readframes(w.getnframes()))
  peak=max(abs(x) for x in samples);rms=math.sqrt(sum(x*x for x in samples)/len(samples))
  assert .5<duration<30 and 300<peak<32768 and rms>50
 metadata['files'][key]={'text':entry['text'],'synthesisText':text,'kana':query.kana,'file':str(path.relative_to(root)),'duration':round(duration,3),'peak':peak,'rms':round(rms,1),'sha256':hashlib.sha256(raw).hexdigest()}
 print(key,metadata['files'][key],flush=True)
(output/'manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
