"""Install original course speech locally after complete decode/ASR verification.

No network calls, remote catalogue edits, app builds, or device installation.
ASR disagreements stay explicit in provenance; they are never silently passed.
"""
from pathlib import Path
import argparse, hashlib, json, re, subprocess, shutil, wave

ROOT=Path(__file__).resolve().parents[1]
PROVENANCE=ROOT/'docs/asset-provenance/course-expansion-20261022.json'

def sha(data):return hashlib.sha256(data).hexdigest()

def voice_path(locale,text):
 def fnv(seed):
  for char in text:seed=((seed^ord(char))*16777619)&0xffffffff
  return f'{seed:08x}'
 return f'assets/course-voices/{locale}-{fnv(2166136261)}{fnv(3335557771)}.m4a'

def synthesize_repairs(out,path):
 """A separately recorded pronunciation/synthesis pass, retaining displayed text."""
 import numpy as np
 import soundfile as sf
 jobs={j['file']:j for j in json.loads((out/'jobs.json').read_text())}
 repairs=json.loads(path.read_text());engines={};directory=out/'repairs';directory.mkdir(parents=True,exist_ok=True)
 previous=json.loads((out/'repair-manifest.json').read_text()) if (out/'repair-manifest.json').exists() else []
 entries={e['file']:e for e in previous}
 for repair in repairs:
  job=jobs[repair['file']];locale=job['locale'];text=repair.get('synthesisText',job['text']);speed=repair.get('speed',.92)
  assert repair['reason'].strip(),'A pronunciation/synthesis adjustment must have a reason'
  if locale not in engines:
   if locale=='ja-JP':
    from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
    runtime=Path('/tmp/seodang-voicevox/runtime')
    engine=Synthesizer(Onnxruntime.load_once(filename=str(next((runtime/'onnxruntime/lib').glob('*.dylib')))),OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=2)
    with VoiceModelFile.open(str(runtime/'models/vvms/n0.vvm')) as model:engine.load_voice_model(model)
    engines[locale]=engine
   else:
    from supertonic import TTS
    engine=TTS(model='supertonic-3',auto_download=True,intra_op_num_threads=2,inter_op_num_threads=1);engines[locale]=(engine,engine.get_voice_style('M1'))
  vowel_floor=repair.get('vowelFloor',0);consonant_floor=repair.get('consonantFloor',0)
  identity=sha(json.dumps([locale,text,speed,vowel_floor,consonant_floor,'course-pronunciation-v2'],ensure_ascii=False).encode());wav=directory/f'{identity}.wav';aac=directory/f'{identity}.m4a'
  if not wav.exists():
   if locale=='ja-JP':
    query=engines[locale].create_audio_query(text,10001);query.speed_scale=speed;query.intonation_scale=1.
    for phrase in query.accent_phrases:
     for mora in phrase.moras:
      mora.vowel_length=max(mora.vowel_length,vowel_floor)
      if mora.consonant_length is not None:mora.consonant_length=max(mora.consonant_length,consonant_floor)
    wav.write_bytes(engines[locale].synthesis(query,10001))
   else:
    engine,style=engines[locale];np.random.seed(42)
    data,_=engine.synthesize(text,voice_style=style,lang='ko',speed=speed,total_steps=16);data=np.asarray(data).reshape(-1)
    assert np.isfinite(data).all() and np.max(np.abs(data))>.005
    sf.write(wav,data,engine.sample_rate,subtype='PCM_16')
  if not aac.exists():subprocess.run(['afconvert','-f','m4af','-d','aac','-b','64000',str(wav),str(aac)],check=True,capture_output=True)
  with wave.open(str(wav)) as audio:duration=audio.getnframes()/audio.getframerate()
  data=aac.read_bytes();entries[job['file']]={**job,'source':str(aac.relative_to(out)),'sha256':sha(data),'bytes':len(data),'duration':round(duration,3),'voice':'VOICEVOX Nemo 男声1' if locale=='ja-JP' else 'Supertonic 3 M1','synthesisAdjustment':{'input':text,'speed':speed,'vowelFloor':vowel_floor,'consonantFloor':consonant_floor,'reason':repair['reason'],'displayedTextChanged':False}}
  tmp=out/'repair-manifest.tmp.json';tmp.write_text(json.dumps(list(entries.values()),ensure_ascii=False,indent=2)+'\n');tmp.replace(out/'repair-manifest.json')
  print(json.dumps({'repaired':job['file'],'text':job['text'],'synthesisText':text,'duration':round(duration,3)},ensure_ascii=False),flush=True)

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'output/course-expansion-voices');p.add_argument('--require-asr-clean',action='store_true');p.add_argument('--synthesize-repairs',type=Path);args=p.parse_args()
 out=args.output.resolve()
 if args.synthesize_repairs:return synthesize_repairs(out,args.synthesize_repairs)
 previous_install=json.loads(PROVENANCE.read_text()).get('files',[]) if PROVENANCE.exists() else []
 subprocess.run(['node','scripts/prepare-course-expansion-audio.mjs','--verify'],cwd=ROOT,check=True)
 jobs_bytes=(out/'jobs.json').read_bytes();jobs=json.loads(jobs_bytes);packs=json.loads((out/'packs.json').read_text());expected={j['file']:j for j in jobs}
 entries=sum([json.loads((out/f'{lang}-manifest.json').read_text()) for lang in ['ja','ko']],[])
 generated={entry['file']:entry for entry in entries}
 assert len(generated)==len(entries)==len(expected)>0,'Incomplete or duplicated synthesis manifest'
 assert set(generated)==set(expected),'Synthesis manifest does not cover exactly the current course texts'
 repair_manifest=out/'repair-manifest.json'
 if repair_manifest.exists():
  for entry in json.loads(repair_manifest.read_text()):
   assert entry['file'] in expected,'Unknown pronunciation adjustment'
   generated[entry['file']]=entry
 report=json.loads((out/'asr-review.json').read_text());verified={r['file']:r for r in report['rows']}
 assert report['complete'] and set(verified)==set(expected),'Incomplete decoded AAC/ASR verification'
 assert not report['acousticIssues'],'Acoustic issues must be resolved before installation'
 if args.require_asr_clean:assert not report['mismatches'],'ASR disagreements require review'
 for key,pack in packs.items():assert set(pack['files'])<=set(expected),key
 installed=[]
 for file,job in expected.items():
  assert re.fullmatch(r'assets/course-voices/(?:ja-JP|ko-KR)-[0-9a-f]{16}\.m4a',file),file
  assert voice_path(job['locale'],job['text'])==file,f'Incorrect content identity: {file}'
  entry=generated[file];review=verified[file]
  assert entry['text']==job['text'] and entry['locale']==job['locale'],f'Stale voice metadata: {file}'
  source=out/entry['source'];data=source.read_bytes()
  assert sha(data)==entry['sha256']==review['sha256'] and len(data)==entry['bytes']==review['bytes'],f'Unverified AAC bytes: {file}'
  assert review['text']==job['text'] and review['locale']==job['locale'],f'Stale ASR review: {file}'
  target=ROOT/file;target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists() or target.read_bytes()!=data:
   tmp=target.with_suffix('.tmp.m4a');shutil.copyfile(source,tmp);tmp.replace(target)
  installed.append({'file':file,'text':job['text'],'locale':job['locale'],'sha256':entry['sha256'],'bytes':entry['bytes'],'duration':review['acoustic']['duration'],'voice':entry['voice'],'transcript':review['transcript'],'asrMatch':review['match'],**({'synthesisAdjustment':entry['synthesisAdjustment']} if entry.get('synthesisAdjustment') else {}),**({'repeatTranscript':review['repeatTranscript'],'repeatMatch':review['repeatMatch']} if review.get('repeatTranscript') is not None else {})})
 summary={k:report[k] for k in ['model','initialPrompt','expected','verified','complete','normalizedExact','japanesePhonetic','koreanNumberSpelling','repeatMatched','mismatches','acousticIssues']}
 unresolved=[{'file':r['file'],'expected':r['text'],'transcript':r['transcript'],'repeatTranscript':r.get('repeatTranscript'),'sha256':r['sha256'],'status':'unresolved-asr-disagreement','synthesisAdjustment':generated[r['file']].get('synthesisAdjustment')} for r in report['rows'] if r['file'] in report['mismatches']]
 adjustments=[{'file':e['file'],'text':e['text'],**e['synthesisAdjustment'],'finalAsrMatch':e['asrMatch'],'finalRepeatMatch':e.get('repeatMatch')} for e in installed if e.get('synthesisAdjustment')]
 attempts_path=out/'unresolved-repair-attempts.json'
 attempts=[{'file':e['file'],'text':e['text'],**e['synthesisAdjustment'],'retainedAudio':'Original unadjusted synthesis; this attempt did not resolve the ASR disagreement.',**({'attemptAsr':e['attemptAsr']} if e.get('attemptAsr') else {})} for e in json.loads(attempts_path.read_text())] if attempts_path.exists() else []
 provenance={'date':'2026-10-22','scope':'Original paired course expansions through lesson 17; new Korean alphabet continuation only for level 1. Existing lessons and remote audio catalogue are unchanged.','distribution':'Local app-bundled AAC. No upload or public catalogue release.','voices':{'ja-JP':'VOICEVOX Nemo 男声1 (style 10001)','ko-KR':'Supertonic 3 M1'},'content':'Original lesson prompts, taught answers, distractors, and new-situation choices. The exact displayed target text is retained.','jobsSha256':sha(jobs_bytes),'lessons':len(packs),'clips':len(installed),'bytes':sum(x['bytes'] for x in installed),'audioVerification':{'status':'asr-listening-review-needed' if unresolved else 'automated-comparison-complete','method':'Decode every installed AAC with afconvert; check duration, active samples, peak, and clipping; local mlx-whisper large-v3-turbo without expected-text prompts. Short mismatches also receive repeated-audio ASR; Japanese orthography may be compared with OpenJTalk readings. Context-specific Korean numeral spelling is counted separately.','verifiedMeans':'Number of files on which AAC decoding and ASR were executed, not the number certified correct. Inspect each comparison category and unresolvedAsrDisagreements.','humanListening':False,'devicePlayback':False,'limitations':'ASR can confuse homophones, spelling, numbers, and short isolated words. Disagreements listed below remain unresolved review items, not automatic passes and not proof that the speech is wrong. This report does not certify human listening or tomorrow’s device playback.','summary':summary,'synthesisAdjustments':adjustments,'inconclusiveSynthesisAttempts':attempts,'unresolvedAsrDisagreements':unresolved},'packs':packs,'files':installed}
 PROVENANCE.parent.mkdir(parents=True,exist_ok=True);tmp=PROVENANCE.with_suffix('.tmp.json');tmp.write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n');tmp.replace(PROVENANCE)
 # Retain superseded generated clips as local evidence without shipping stale
 # lesson audio. Only archive files named by our previous verified installation.
 for old in previous_install:
  if old['file'] in expected:continue
  assert re.fullmatch(r'assets/course-voices/(?:ja-JP|ko-KR)-[0-9a-f]{16}\.m4a',old['file'])
  target=ROOT/old['file']
  if target.exists():
   assert sha(target.read_bytes())==old['sha256'],'Refusing to move an independently changed old clip'
   archive=out/'retired-bundled'/target.name;archive.parent.mkdir(parents=True,exist_ok=True)
   shutil.copyfile(target,archive);target.unlink()
 print(json.dumps({'installed':len(installed),'lessons':len(packs),'bytes':provenance['bytes'],'asrDisagreements':len(report['mismatches']),'provenance':str(PROVENANCE)},ensure_ascii=False))

if __name__=='__main__':main()
