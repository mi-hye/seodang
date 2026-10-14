"""Generate Korean learning clips using the installed macOS Yuna Korean voice.
Run on macOS: python3 scripts/generate-korean-audio.py
Generation tools are not runtime dependencies. Inputs and checks are retained.
"""
import json,subprocess,tempfile,wave,hashlib,math
from pathlib import Path
from array import array
root=Path(__file__).resolve().parents[1]
out=root/'assets/audio/korean'
lines=json.loads((out/'lines.json').read_text())
manifest={'provider':'macOS Speech Synthesis','voice':'Yuna','locale':'ko-KR','languageReview':'Generated learning material; native-speaker listening review pending','files':{}}
with tempfile.TemporaryDirectory(prefix='seodang-korean-') as directory:
 for line in lines:
  source=Path(directory)/'utterance.aiff'
  path=out/(line['id']+'.wav')
  subprocess.run(['say','-v','Yuna','-r',str(line['rate']),'-o',str(source),line['spoken']],check=True)
  subprocess.run(['afconvert','-f','WAVE','-d','LEI16@24000',str(source),str(path)],check=True)
  with wave.open(str(path),'rb') as w:
   assert w.getnchannels()==1 and w.getframerate()==24000
   samples=array('h',w.readframes(w.getnframes()));duration=w.getnframes()/w.getframerate()
   peak=max(abs(x) for x in samples);rms=math.sqrt(sum(x*x for x in samples)/len(samples))
   assert .15<duration<180 and peak>300 and rms>30,(line['id'],duration,peak,rms)
  manifest['files'][line['id']]={**line,'file':str(path.relative_to(root)),'duration':round(duration,3),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'peak':peak,'rms':round(rms,1)}
  print(line['id'],round(duration,2),flush=True)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
