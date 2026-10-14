"""Bundled short recap recordings. Same Nemo 女声1 / macOS Yuna as each course."""
import sys,json,subprocess,tempfile,wave,hashlib,math
from array import array
from pathlib import Path
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
runtime=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1];out=root/'assets/audio/practice'
synth=Synthesizer(Onnxruntime.load_once(filename=str(next((runtime/'onnxruntime/lib').glob('*.dylib')))),OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=4)
with VoiceModelFile.open(str(runtime/'models/vvms/n0.vvm')) as model:synth.load_voice_model(model)
manifest={'languageReview':'Native-speaker listening review pending','files':{}}
with tempfile.TemporaryDirectory(prefix='seodang-practice-') as directory:
 for line in json.loads((out/'lines.json').read_text()):
  path=out/(line['id']+'.wav')
  if line['locale']=='ja-JP':
   query=synth.create_audio_query(line['text'],10005);query.speed_scale=.96
   path.write_bytes(synth.synthesis(query,10005));voice='VOICEVOX Nemo 女声1'
  else:
   source=Path(directory)/'voice.aiff'
   subprocess.run(['say','-v','Yuna','-r','155','-o',str(source),line['text']],check=True)
   subprocess.run(['afconvert','-f','WAVE','-d','LEI16@24000',str(source),str(path)],check=True);voice='macOS Yuna'
  with wave.open(str(path),'rb') as wav:
   samples=array('h',wav.readframes(wav.getnframes()));duration=len(samples)/wav.getframerate();rms=math.sqrt(sum(x*x for x in samples)/len(samples));assert .25<duration<30 and rms>30
  manifest['files'][line['id']]={**line,'voice':voice,'file':str(path.relative_to(root)),'duration':duration,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
  print(line['id'],flush=True)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
