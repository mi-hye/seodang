"""Generate original male/female Korean/Japanese previews locally; no voice cloning.
Uses Apache-2.0 Qwen3-TTS VoiceDesign. App assets remain untouched.
"""
import hashlib, json
from pathlib import Path
import numpy as np
import soundfile as sf
import mlx.core as mx
from mlx_audio.tts.utils import load_model
ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / 'output/voice-design/model'
DEST = ROOT / 'output/voice-design/samples'
DEST.mkdir(parents=True, exist_ok=True)
STYLE = ('A professional adult {gender} native {language} language teacher in their thirties. '
         '{timbre} A clear, dry, fully voiced tone with clean articulation. '
         'Neutral, matter-of-fact textbook narration at a normal pace. Restrained pitch variation '
         'and short, decisive sentence endings. Read only the provided words once. '
         'No breathiness, whispers, sighs, gasps, moaning, laughter or extra vocalizations.')
JOBS = [('ko-female', 'Korean', 'female', 'Medium-low pitch, mature and firm, with a plain speaking voice.',
         '안녕하세요. 물 두 병 주세요. 지금 역에 있어요. 출구 앞에서 기다려요.'),
        ('ko-male', 'Korean', 'male', 'Medium pitch, clear and firm, with a plain speaking voice.',
         '안녕하세요. 물 두 병 주세요. 지금 역에 있어요. 출구 앞에서 기다려요.'),
        ('ja-female', 'Japanese', 'female', 'Medium-low pitch, mature and firm, with a plain speaking voice.',
         'こんにちは。水を二本ください。今、駅にいます。改札の前で待っています。'),
        ('ja-male', 'Japanese', 'male', 'Medium pitch, clear and firm, with a plain speaking voice.',
         'こんにちは。水を二本ください。今、駅にいます。改札の前で待っています。')]
model = load_model(str(MODEL.resolve()))
entries = []
for name, language, gender, timbre, text in JOBS:
    instruction = STYLE.format(gender=gender, language=language, timbre=timbre)
    for attempt in range(3):
        seed = 42 + attempt * 1000
        mx.random.seed(seed)
        results = list(model.generate_voice_design(text=text, instruct=instruction, language=language,
                       temperature=.6, max_tokens=450, verbose=False))
        data = np.concatenate([np.asarray(r.audio).reshape(-1) for r in results])
        sr = results[0].sample_rate
        duration = len(data) / sr
        if np.isfinite(data).all() and 2 < duration < 16 and .01 < np.max(np.abs(data)) < 1:
            break
    else:
        raise RuntimeError(f'Invalid generated sample: {name}')
    path = DEST / (name + '.wav')
    sf.write(path, data, sr, subtype='PCM_16')
    entries.append(dict(file=path.name, language=language, gender=gender, text=text,
                        instruction=instruction, seed=seed, duration=duration,
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (DEST / 'manifest.json').write_text(json.dumps(dict(model='mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-8bit',
        revision=(MODEL/'revision.txt').read_text().strip(), license='Apache-2.0', temperature=.6,
        referenceRecording=None, listeningReview='pending', files=entries),ensure_ascii=False,indent=2)+'\n')
    print(name, round(duration, 2), 'seconds', flush=True)
    mx.clear_cache()
(DEST / 'LICENSE.txt').write_bytes((ROOT/'assets/audio/LICENSE-Qwen3-TTS.txt').read_bytes())
(DEST / 'NOTICE.txt').write_text('AI-generated previews, made locally with Qwen3-TTS VoiceDesign.\n'
    'Original voice descriptions; no reference recording or imitation of a named person.\n'
    'Model license: Apache-2.0. Model source: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign\n'
    'The model permits commercial use. Published model materials reviewed on 2026-10-16 contain no separate noncommercial output restriction.\n'
    'This is not a guarantee of third-party rights or exclusive copyright in generated audio.\n')
