"""Preview dry, neutral delivery without replacing any app recordings."""
import hashlib, json, os
from pathlib import Path
import numpy as np
import soundfile as sf
import mlx.core as mx
from mlx_audio.tts.utils import load_model
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'output/clean-voice-samples'
DEST.mkdir(parents=True, exist_ok=True)
MODEL = Path(os.environ.get('QWEN_MODEL_PATH', ROOT / 'output/qwen-samples/model'))
INSTRUCTION = ('Read only the supplied text, exactly once, as a neutral language teacher. '
               'Use a clear, steady, fully voiced speaking tone with crisp articulation and a normal pace. '
               'Keep the delivery matter-of-fact and the endings short and level. '
               'No audible inhalations or exhalations, whispering, sighs, gasps, moans, laughter, '
               'humming, filler sounds, or additional vocalizations. Start and end with the words.')
JOBS = [('ko-short', 'Korean', 'Sohee', '물 두 병 주세요.'),
        ('ko-sentence', 'Korean', 'Sohee', '지금 역에 있어요. 출구 앞에서 기다려요. 세 시에 만나요.'),
        ('ja-short', 'Japanese', 'Ono_Anna', '水を二本ください。'),
        ('ja-sentence', 'Japanese', 'Ono_Anna', '今、駅にいます。改札の前で待っています。三時に会いましょう。')]
model = load_model(str(MODEL.resolve()))
records = []
for name, language, speaker, text in JOBS:
    for attempt in range(3):
        seed = 42 + attempt * 1000
        mx.random.seed(seed)
        results = list(model.generate_custom_voice(text=text, speaker=speaker, language=language,
                       instruct=INSTRUCTION, max_tokens=400, temperature=.5, verbose=False))
        data = np.concatenate([np.asarray(r.audio).reshape(-1) for r in results])
        sr = results[0].sample_rate
        duration = len(data) / sr
        if np.isfinite(data).all() and .3 < duration < max(4, len(text) * .35) and .01 < np.max(np.abs(data)) < 1:
            break
    else:
        raise RuntimeError(f'Invalid sample: {name}')
    path = DEST / (name + '.wav')
    sf.write(path, data, sr, subtype='PCM_16')
    records.append(dict(file=path.name, text=text, speaker=speaker, language=language, seed=seed,
                        duration=duration, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (DEST / 'manifest.json').write_text(json.dumps(dict(instruction=INSTRUCTION, temperature=.5,
         modelRevision=(MODEL/'revision.txt').read_text().strip(), listeningReview='pending', files=records),
         ensure_ascii=False, indent=2)+'\n')
    print(name, round(duration, 2), 'seconds', flush=True)
    mx.clear_cache()
