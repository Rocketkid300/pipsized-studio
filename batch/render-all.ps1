# Renders every Short project in this folder (any subfolder with a package.json) and puts the finished videos,
# with sound, in .\finished. Already finished videos are skipped, so it's safe to run again after adding more.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$done = Join-Path $root 'finished'
New-Item -ItemType Directory -Force $done | Out-Null

foreach ($p in Get-ChildItem $root -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'package.json') }) {
  $titleFile = Join-Path $p.FullName 'title.txt'
  $title = if (Test-Path $titleFile) { (Get-Content $titleFile -Raw).Trim() } else { $p.Name }
  $final = Join-Path $done "$title.mp4"
  if (Test-Path $final) { Write-Host "Skipping '$title' (already in finished)"; continue }

  Write-Host "`n=== $title ===" -ForegroundColor Cyan
  Push-Location $p.FullName
  try {
    if (-not (Test-Path 'node_modules')) {
      npm install --no-audit --no-fund
      if ($LASTEXITCODE) { throw 'npm install failed' }
    }
    # The graphics card first (fast); software rendering if that fails.
    npx remotion render src/index.ts Short out/video-silent.mp4 --codec h264 --muted --gl=angle
    if ($LASTEXITCODE) {
      Write-Host 'GPU render failed, trying software rendering (slower)...' -ForegroundColor Yellow
      npx remotion render src/index.ts Short out/video-silent.mp4 --codec h264 --muted --gl=swangle
      if ($LASTEXITCODE) { throw 'render failed' }
    }
    # The picture is rendered silent on purpose: this adds the finished sound mix.
    ffmpeg -v error -y -i out/video-silent.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k -shortest $final
    if ($LASTEXITCODE) { throw 'adding the sound failed (is ffmpeg installed?)' }
    Write-Host "Done: $final" -ForegroundColor Green
  } catch {
    Write-Host "FAILED: $title - $_" -ForegroundColor Red
  } finally {
    Pop-Location
  }
}
Write-Host "`nAll done. The videos are in: $done" -ForegroundColor Green
Read-Host 'Press Enter to close'
