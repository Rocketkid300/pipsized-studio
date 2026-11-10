# Pipsized Studio

<img src="brand/pip-avatar-800.png" width="160" align="right" alt="Pip, the Pipsized mascot">

Type an idea, get a YouTube Short. A local dashboard runs [Claude Code](https://claude.com/claude-code) headless to
write, voice, animate and check a 30–40 second 3D Short in the **Pipsized** style: a scale comparison on a bright blue
grid, with **Pip** (the mascot) for scale, a deadpan narrator, real numbers, word-by-word captions and sound effects.
Everything is code: Remotion + three.js for the picture, ElevenLabs for the voice and sounds, ffmpeg for the mix.

## Quick start

1. Install [Node.js](https://nodejs.org) LTS, ffmpeg, Python 3 and Claude Code, and log in to Claude Code once
   (`claude`, then `/login`). Full steps: [docs/SETUP.md](docs/SETUP.md).
2. Copy `.env.example` to `.env` and put your ElevenLabs key in it (a free account works).
3. Start the dashboard: double-click **START.bat** (Windows) or run `./start.sh`. It opens http://localhost:4777.
4. Type an idea, pick **Scale Short**, tick **Render the video too** on a PC with a graphics card, press **Make video**.

No graphics card? Leave Render unticked: the finished project lands in `batch/`. Press **Download batch** and on a
fast PC double-click **RENDER-ALL.bat**; the videos, with sound, appear in `batch/finished/`.

## What's in here

| Folder | What |
|---|---|
| `dashboard/` | the idea-to-video web app (`server.mjs`, `public/index.html`) |
| `template/obese-scale/` | the reference Short every job copies: 3D kit, scenes, captions, voice and sound scripts |
| `batch/` | `RENDER-ALL.bat` / `render-all.sh`: render every waiting Short in one go |
| `tools/elevenlabs.py` | the tiny ElevenLabs client the scripts share (reads the key from `.env`) |
| `brand/` | Pip's profile picture (800 and 1080 px) |
| `examples/` | earlier experiments: the "Day N" 3D Short and a silent maths proof |
| `docs/` | [SETUP](docs/SETUP.md) · [FORMAT](docs/FORMAT.md) (the Pipsized recipe) · [PROCESS](docs/PROCESS.md) (how this was built) |

## Costs

- **Claude:** each Short is one Claude Code session (roughly 15–40 minutes of work on a Pro plan's usage).
- **ElevenLabs:** about 500 credits for a voice; sound effects come from `sfx/` for free. The free plan gives 10,000
  credits a month, but is **non-commercial with attribution**: for a monetised channel use a paid plan.
- **Rendering:** free. ~1 minute with a graphics card, ~25 minutes on a CPU.

## Licence

MIT for this repo's code. The template's 2D-to-3D character design follows Pip from the MIT-licensed
[what-if-animation](https://github.com/kelano86/what-if-animation) skill (© FreshStack). Remotion is free for
individuals and teams of up to 3; bigger companies need a [Remotion licence](https://www.remotion.dev/license).
