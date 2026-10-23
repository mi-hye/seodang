"""Generate the local 2-17 colour-question correction; never publish audio."""
from pathlib import Path
import hashlib, json, subprocess, wave
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

root = Path(__file__).resolve().parents[1]
runtime = Path('/tmp/seodang-voicevox/runtime')
synth = Synthesizer(Onnxruntime.load_once(filename=str(next((runtime/'onnxruntime/lib').glob('*.dylib')))), OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')), acceleration_mode='CPU', cpu_num_threads=2)
with VoiceModelFile.open(str(runtime/'models/vvms/n0.vvm')) as model:
    synth.load_voice_model(model)
text = '何色の傘ですか。'
spoken = 'なにいろの傘ですか。'
original = synth.create_audio_query(text, 10001)
query = synth.create_audio_query(spoken, 10001)
moras = [m.text for phrase in query.accent_phrases for m in phrase.moras]
assert ''.join(moras).startswith('ナニイロノカサデスカ'), moras
query.speed_scale = 1.
query.intonation_scale = 1.
out = root/'output/lost-item-pronunciation'
out.mkdir(parents=True, exist_ok=True)
wav = out/'naniiro.wav'
wav.write_bytes(synth.synthesis(query, 10001))
file = 'assets/course-voices/ja-JP-c61d393d9fe47e1f.m4a'
target = root/file
subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', str(wav), str(target)], check=True)
decoded = out/'decoded.wav'
subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', str(target), str(decoded)], check=True)
with wave.open(str(decoded)) as audio:
    duration = audio.getnframes()/audio.getframerate()
assert 1 < duration < 5, duration
data = target.read_bytes()
report = dict(lesson='Japanese 2-17', scenario='17', text=text, synthesisText=spoken,
    originalKana=original.kana, correctedKana=query.kana, correctedMoras=moras,
    voice='VOICEVOX Nemo 男声1', styleId=10001, file=file,
    sha256=hashlib.sha256(data).hexdigest(), bytes=len(data), duration=duration,
    verification='Explicit synthesis moras and AAC decode. Not independent human listening.',
    distribution='App-bundled replacement. Existing remote catalogue/cache is bypassed. No upload.')
(root/'docs/asset-provenance/lost-item-pronunciation-20261023.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
