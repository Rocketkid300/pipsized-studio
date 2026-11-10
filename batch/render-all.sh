#!/usr/bin/env bash
# Renders every Short project in this folder and puts the finished videos (with sound) in ./finished.
# Linux/macOS twin of RENDER-ALL.bat. Already finished videos are skipped.
cd "$(dirname "$0")"; mkdir -p finished
for p in */; do
  [ -f "$p/package.json" ] || continue
  title=$( [ -f "$p/title.txt" ] && tr -d '\r\n' < "$p/title.txt" || basename "$p")
  final="finished/$title.mp4"; [ -f "$final" ] && { echo "Skipping '$title'"; continue; }
  echo "=== $title ==="
  ( cd "$p" && { [ -d node_modules ] || npm install --no-audit --no-fund; } &&
    { npx remotion render src/index.ts Short out/video-silent.mp4 --codec h264 --muted --gl=angle ||
      npx remotion render src/index.ts Short out/video-silent.mp4 --codec h264 --muted --gl=swangle; } &&
    ffmpeg -v error -y -i out/video-silent.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k -shortest "../$final" ) \
    && echo "Done: $final" || echo "FAILED: $title"
done
