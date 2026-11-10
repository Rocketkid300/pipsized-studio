"""The narration: one ElevenLabs take with character timestamps, cached by its text.

Run from anywhere (the key comes from .env in the repo root, see tools/elevenlabs.py):
    python voice.py
Writes public/voice.mp3 and src/words.json ({w, s, e} per word, in seconds).
"""
import base64, hashlib, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# the studio's ElevenLabs helper: tools/ in the repo root, found by walking up from this project
for up in HERE.parents:
    if (up / 'tools' / 'elevenlabs.py').exists():
        sys.path.insert(0, str(up / 'tools'))
        break
from elevenlabs import api  # noqa: E402

LINES = [
    'Your chair is about to file a lawsuit.',
    'What if everyone on Earth became obese overnight?',
    'Eight billion people. Thirty extra kilos each.',
    "That's almost two hundred and fifty million tonnes of brand new human.",
    'More than two thousand three hundred aircraft carriers.',
    'A full airliner is now five tonnes heavier. It stays on the ground.',
    'Elevators fit one person. Chairs just give up.',
    'And the Earth gets heavier by zero point zero zero zero zero zero zero zero zero zero zero four percent.',
    "It doesn't notice.",
    'You do.',
]
VOICE = 'TX3LPaxmHKxFdv7VOQHJ'
SETTINGS = {'stability': 0.72, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}  # flat and deadpan

text = '  '.join(LINES)
sig = hashlib.sha1(json.dumps([text, VOICE, SETTINGS]).encode()).hexdigest()[:12]
mp3 = HERE / 'public/voice.mp3'
meta = HERE / 'out/voice_meta.json'
mp3.parent.mkdir(exist_ok=True)
if mp3.exists() and meta.exists() and json.loads(meta.read_text()).get('sig') == sig:
    print('Voice unchanged: reusing it (no credits).')
    sys.exit(0)

print(f'{len(text)} characters to ElevenLabs')
res = json.loads(api(f'/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128', {'text': text, 'model_id': 'eleven_multilingual_v2', 'voice_settings': SETTINGS}))
mp3.write_bytes(base64.b64decode(res['audio_base64']))
al = res['alignment']
words, cur = [], None
for ch, s, e in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
    if re.match(r"[\w'’]", ch):
        if cur is None:
            cur = {'w': '', 's': round(s, 3), 'e': round(e, 3)}
        cur['w'] += ch
        cur['e'] = round(e, 3)
    elif cur is not None:
        words.append(cur)
        cur = None
if cur:
    words.append(cur)
(HERE / 'src/words.json').write_text(json.dumps(words, indent=1))
meta.write_text(json.dumps({'sig': sig, 'chars': len(text)}))
print(f'{len(words)} words, {words[-1]["e"]:.2f} s')
