"""The Short's sound: generate missing clips with ElevenLabs (cached in sfx/, reusing the What If library), place
each one on its frame, lay a music bed under it, and master to -14 LUFS for YouTube.

python3 sound.py            generate what's missing, mix to out/audio.wav
python3 sound.py --dry      list what would be generated
"""
import json, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SFX = HERE / 'sfx'
SFX.mkdir(exist_ok=True)
FPS = 30
LENGTH = 30.0

CLIPS = {
    'inflate': ('a cartoon balloon inflating fast into a big rubbery boing, comedic', 1.2),
    'boom': ('a deep heavy cinematic bass boom impact with a long rumble tail, meme style', 1.8),
    'chair_smash': ('a wooden chair exploding into splinters, cartoon crash with wood debris', 1.2),
    'bonk': ('a cartoon metal elevator door bonking into something soft, short comedic boing', 0.6),
    'engines_down': ('jet engines powering down, a sad descending whine', 2.0),
    'kaching': ('a cash register ka-ching, bright', 0.8),
    'tuba': ('a single low deadpan tuba note, comedic, short', 1.0),
    'money': ('a flurry of paper money bills fluttering and a cash counting machine', 1.6),
    'creak': ('a heavy wooden chair creaking under weight, a long strained creak', 1.0),
    'floor_crack': ('a wooden floor cracking and collapsing, a splintering crash', 1.4),
    'fall_whistle': ('a cartoon falling whistle descending in pitch', 1.6),
    'whoosh': ('a quick short swoosh transition', 0.6),
    'music': ('dark comedic bass-heavy trap beat with a quirky detuned synth melody, slightly unhinged meme music, no vocals, 140 bpm', 30.0),
}

# (frame, clip, gain 0..1): every hit in the picture, plus a whoosh on each cut.
CUTS = [90, 205, 315, 420, 525, 635, 760]
EVENTS = [
    (2, 'title_boom', 0.5),
    (36, 'inflate', 0.8),
    (38, 'boom', 0.9),
    (90 + 30, 'creak', 0.5),
    (90 + 40, 'chair_smash', 0.9),
    (90 + 41, 'boom', 0.6),
    (90 + 47, 'land', 0.7),
    (205 + 8, 'bonk', 0.7),
    (205 + 42, 'bonk', 0.7),
    (205 + 76, 'bonk', 0.8),
    (315 + 46, 'engines_down', 0.6),
    (420 + 44, 'kaching', 0.7),
    (525 + 60, 'tuba', 0.8),
    (635 + 4, 'money', 0.5),
    (635 + 48, 'kaching', 0.5),
    (760 + 22, 'creak', 0.6),
    (760 + 64, 'floor_crack', 0.9),
    (760 + 64, 'boom', 0.8),
    (760 + 68, 'fall_whistle', 0.7),
] + [(c - 3, 'whoosh', 0.35) for c in CUTS]
MUSIC_GAIN = 0.32


def clip_path(name):
    return SFX / f'{name}.mp3'


def generate(dry):
    sys.path.insert(0, str(HERE.parents[1] / 'tools'))
    from elevenlabs import api  # reads the key from .env in the repo root, never prints it
    for name in sorted({e[1] for e in EVENTS} | {'music'}):
        p = clip_path(name)
        if p.exists():
            continue
        prompt, secs = CLIPS[name]
        print(f'generate {name}: {secs}s')
        if dry:
            continue
        try:
            p.write_bytes(api('/v1/sound-generation?output_format=mp3_44100_128', {'text': prompt, 'duration_seconds': secs, 'prompt_influence': 0.45}))
        except Exception as e:  # the API caps a clip's length: fall back to 22 s and loop it
            if name != 'music':
                raise
            print(f'  music at {secs}s failed ({str(e)[:80]}); trying 22 s')
            p.write_bytes(api('/v1/sound-generation?output_format=mp3_44100_128', {'text': prompt, 'duration_seconds': 22, 'prompt_influence': 0.45}))


def mix():
    inputs, filters = [], []
    music = clip_path('music')
    inputs += ['-stream_loop', '-1', '-i', str(music)]
    filters.append(f'[0]atrim=0:{LENGTH},afade=t=in:d=0.3,afade=t=out:st={LENGTH - 1.2}:d=1.2,volume={MUSIC_GAIN}[m]')
    labels = ['[m]']
    for i, (fr, name, gain) in enumerate(EVENTS, start=1):
        inputs += ['-i', str(clip_path(name))]
        ms = int(fr / FPS * 1000)
        filters.append(f'[{i}]aformat=sample_rates=44100:channel_layouts=stereo,volume={gain},adelay={ms}|{ms}[e{i}]')
        labels.append(f'[e{i}]')
    filters.append(f'{"".join(labels)}amix=inputs={len(labels)}:normalize=0:duration=first,atrim=0:{LENGTH},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
    out = HERE / 'out/audio.wav'
    out.parent.mkdir(exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]', '-ar', '44100', str(out)], check=True)
    print(f'mixed {len(EVENTS)} events + music -> {out}')


if __name__ == '__main__':
    dry = '--dry' in sys.argv
    generate(dry)
    if not dry:
        mix()
