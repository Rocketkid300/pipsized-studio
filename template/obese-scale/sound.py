"""The Short's mix: the narration on top, a cartoon hit on every action, and the music bed ducked under the voice.
All clips are in sfx/, so this costs no credits. Needs ffmpeg on the PATH.

python sound.py   ->  out/audio.wav, mastered to -14 LUFS
"""
import json, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
FPS = 30
WORDS = json.loads((HERE / 'src/words.json').read_text())
LENGTH = round(WORDS[-1]['e'] + 1.0, 2)


def at(w, n=1, shift=0.0):
    """Seconds where the n-th `w` is spoken (case-insensitive), plus `shift`."""
    k = 0
    for x in WORDS:
        if x['w'].lower() == w.lower():
            k += 1
            if k == n:
                return x['s'] + shift
    raise SystemExit(f'{w}#{n} not in the voice')


def clip(name):
    p = HERE / 'sfx' / f'{name}.mp3'
    if not p.exists():
        raise SystemExit(f'sfx/{name}.mp3 is missing')
    return p


# (seconds, clip, gain): the hits land in the pause after the word they illustrate, not on it.
# Every scene switch gets a whoosh (just before the cut) and every big number a pop as it lands.
CUT_WORDS = [('What', 1), ('Eight', 1), ("That's", 1), ('More', 1), ('A', 2), ('Elevators', 1), ('Chairs', 1), ('And', 2), ('You', 1)]
STAT_WORDS = [('Eight', 1), ('two', 1), ('two', 2), ('five', 1), ('one', 1), ('give', 1), ('zero', 1)]
EVENTS = [
    (0.15, 'creak', 0.5),
    (at('file', shift=0.1), 'creak', 0.55),
    (at('lawsuit', shift=0.45), 'boom', 0.55),
    *[(at(w, n, -0.2), 'whoosh', 0.45) for w, n in CUT_WORDS],
    *[(at(w, n, 0.03), 'pop', 0.4) for w, n in STAT_WORDS],
    (at('obese', shift=0.02), 'inflate', 0.55),
    (at('obese', shift=0.1), 'boom', 0.6),
    *[(at('Thirty', shift=0.1 + i * 0.11), 'pop', 0.22) for i in range(8)],
    (at("That's", shift=-0.1), 'title_boom', 0.45),
    (at('More', shift=-0.1), 'whoosh', 0.4),
    (at('heavier', 1, 0.0), 'creak', 0.45),
    (at('ground', shift=0.35), 'boom', 0.6),
    (at('Elevators', shift=0.6), 'bonk', 0.5),
    (at('Elevators', shift=1.33), 'bonk', 0.5),
    (at('Chairs', shift=0.95), 'chair_smash', 0.7),
    (at('And', 2, -0.1), 'whoosh', 0.35),
    (at('percent', shift=0.45), 'tuba', 0.6),
    (at('You', shift=-0.3), 'drone_hit', 0.4),
]


def mix():
    inputs = ['-i', str(HERE / 'public/voice.mp3'), '-stream_loop', '-1', '-i', str(clip('music'))]
    f = [
        '[0]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[v][vkey]',
        # the music fades out under the last line, so "You do." lands in near silence
        f'[1]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:{LENGTH},volume=0.28,afade=t=out:st={at("You") - 1.2}:d=1.0[m0]',
        '[m0][vkey]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[m]',
    ]
    labels = ['[v]', '[m]']
    for i, (t, name, gain) in enumerate(EVENTS, start=2):
        inputs += ['-i', str(clip(name))]
        ms = max(0, int(t * 1000))
        f.append(f'[{i}]aformat=sample_rates=44100:channel_layouts=stereo,volume={gain},adelay={ms}|{ms}[e{i}]')
        labels.append(f'[e{i}]')
    f.append(f'{"".join(labels)}amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{LENGTH},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
    out = HERE / 'out/audio.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(f), '-map', '[out]', '-ar', '44100', str(out)], check=True)
    print(f'voice + music + {len(EVENTS)} hits -> {out} ({LENGTH} s)')


if __name__ == '__main__':
    mix()
