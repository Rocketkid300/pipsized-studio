# Setup

## Windows (one time)

1. **Node.js:** download the LTS installer from nodejs.org, install with defaults.
2. **ffmpeg and Python:** open PowerShell and run
   ```
   winget install ffmpeg
   winget install Python.Python.3.12
   ```
   Close and reopen PowerShell afterwards.
3. **Claude Code:** `npm install -g @anthropic-ai/claude-code`, then run `claude` once and log in with `/login`
   (a Pro plan is enough). Type `/exit` when it says you're logged in.
4. **Get the repo:** `git clone https://github.com/Rocketkid300/pipsized-studio` (or Code → Download ZIP and extract).
5. **ElevenLabs key:** sign up at elevenlabs.io, create an API key with Text to Speech, Sound Effects, Voices (read),
   User (read) and History (read). Copy `.env.example` to `.env` and paste the key after `=`. Never paste the key in a
   chat or commit it (`.env` is git-ignored). Check it: `python tools\elevenlabs.py`.
6. **Template packages:** in `template\obese-scale` run `npm install` once.

Then double-click **START.bat**.

## Linux / macOS

Same steps with your package manager (`pacman -S nodejs npm ffmpeg python`, `brew install node ffmpeg python`),
then `./start.sh`. Renders without a GPU use software WebGL (`swangle`) automatically: slow but fine.

## Troubleshooting

- **"Not logged in · Please run /login"** in a job's log: the dashboard runs the `claude` command, which has its own
  login. Run `claude`, `/login`, `/exit`.
- **The video has no sound:** the picture is rendered silent on purpose; the sound is added in the last step
  (`ffmpeg ... out/audio.wav ...`). RENDER-ALL does it for you; open the file in `finished/`, not `video-silent.mp4`.
- **ElevenLabs 401 "missing the permission":** the key is restricted; give it the permissions in step 5.
- **WebGL error when rendering:** the GPU path failed; the scripts retry with `--gl=swangle`.
