"""A tiny ElevenLabs client for the studio's scripts: no packages needed, works on Windows, macOS and Linux.

The key is read from the ELEVENLABS_API_KEY environment variable, or from a .env file in the repo root (see
.env.example). It is never printed.
"""
import json, os, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def api_key():
    key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if key:
        return key
    for env in (ROOT / '.env', Path.cwd() / '.env'):
        if env.exists():
            for line in env.read_text(encoding='utf-8').splitlines():
                name, _, value = line.partition('=')
                if name.strip() == 'ELEVENLABS_API_KEY' and value.strip():
                    return value.strip().strip('"').strip("'")
    raise SystemExit('No ElevenLabs key: copy .env.example to .env in the repo root and put your key in it.')


def api(path, body=None, timeout=180):
    """POST `body` as JSON (or GET when body is None) to the ElevenLabs API; returns the raw response bytes."""
    req = urllib.request.Request(
        'https://api.elevenlabs.io' + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={'xi-api-key': api_key(), 'Content-Type': 'application/json'},
        method='GET' if body is None else 'POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')[:300]
        raise SystemExit(f'ElevenLabs {e.code} on {path}: {detail}') from None


def credits_left():
    s = json.loads(api('/v1/user/subscription'))
    return s.get('character_limit', 0) - s.get('character_count', 0)


if __name__ == '__main__':
    print(f'Key works. Credits left this month: {credits_left()}')
