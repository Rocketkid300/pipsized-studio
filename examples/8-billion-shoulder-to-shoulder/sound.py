"""The Short's mix: the narration on top, a cartoon hit on every action, and the music bed ducked under the voice.
All clips are already in sfx/ (from the first Short) or the What If library (wave_roar was generated for this one).

python3 sound.py   ->  out/audio.wav, mastered to -14 LUFS
"""
import json, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
FPS = 30
WORDS = json.loads((HERE / 'src/words.json').read_text())
LENGTH = round(WORDS[-1]['e'] + 1.7, 2)


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
CUT_WORDS = [('What', 1), ('Four', 1), ('A', 1), ('We', 1), ('Stand', 1), ('A', 2), ('Walking', 1)]
STAT_WORDS = [('two', 1), ('forty', 1), ('four', 2), ('edge', 1), ('hour', 1), ('nine', 1), ('rest', 1)]
WAVE_LATE = (751 + 0.78 * 98) / FPS  # S5: Pip's arms go up, late (CUTS[6] + 78% of the scene)
EVENTS = [
    (0.0, 'class_murmur', 0.35),
    (at('foot', shift=0.08), 'big_step', 0.6),
    (at('foot', shift=0.14), 'bonk', 0.5),
    *[(at(w, n, -0.2), 'whoosh', 0.45) for w, n in CUT_WORDS],
    (at('rest', shift=-0.47), 'whoosh', 0.45),
    (at('Everyone', 2, -0.2), 'whoosh', 0.35),
    *[(at(w, n, 0.03), 'pop', 0.4) for w, n in STAT_WORDS],
    (at('What', shift=-0.1), 'title_boom', 0.45),
    *[(at('eight', shift=0.05 + i * 0.16), 'pop', 0.2) for i in range(14)],
    *[(at('Four', shift=-0.05 + i * 0.17), 'pop', 0.3) for i in range(4)],
    (at('Smaller', shift=0.0), 'big_step', 0.5),
    (at('Seventy', shift=0.15), 'boom', 0.6),
    (at('Seventy', shift=0.3), 'big_step', 0.5),
    (at('horizon', shift=-0.3), 'roof_wind', 0.45),
    (at('A', 2, 0.3), 'wave_roar', 0.55),
    (WAVE_LATE, 'tuba', 0.55),
    *[(at('Walking', shift=0.1 + i * 0.36), 'step', 0.35) for i in range(8)],
    (at('empty', shift=0.1), 'power_down', 0.45),
    (at('Everyone', 2, -0.3), 'drone_hit', 0.4),
    (at('on', 3, 0.45), 'ding', 0.6),
]


def mix():
    inputs = ['-i', str(HERE / 'public/voice.mp3'), '-stream_loop', '-1', '-i', str(clip('music'))]
    f = [
        '[0]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[v][vkey]',
        # the music fades out under the last line, so "Everyone left the oven on." lands in near silence
        f'[1]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:{LENGTH},volume=0.28,afade=t=out:st={at("Everyone", 2) - 1.4}:d=1.0[m0]',
        '[m0][vkey]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[m]',
    ]
    labels = ['[v]', '[m]']
    for i, (t, name, gain) in enumerate(EVENTS, start=2):
        inputs += ['-i', str(clip(name))]
        ms = max(0, int(t * 1000))
        f.append(f'[{i}]aformat=sample_rates=44100:channel_layouts=stereo,volume={gain},adelay={ms}|{ms}[e{i}]')
        labels.append(f'[e{i}]')
    f.append(f'{"".join(labels)}amix=inputs={len(labels)}:normalize=0:duration=longest,apad=whole_dur={LENGTH},atrim=0:{LENGTH},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
    out = HERE / 'out/audio.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(f), '-map', '[out]', '-ar', '44100', str(out)], check=True)
    print(f'voice + music + {len(EVENTS)} hits -> {out} ({LENGTH} s)')


if __name__ == '__main__':
    mix()
