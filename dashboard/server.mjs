// Pipsized Studio dashboard: type an idea, get a Short. A local server that queues video jobs and runs each one as a
// headless Claude Code session (`claude -p`) that follows a template project in this repo. One job at a time, since
// every render takes the whole machine. Works on Windows, macOS and Linux.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4777);
const WIN = process.platform === 'win32';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, '..');
const JOBS = path.join(ROOT, 'jobs');
const PUBLIC = path.join(ROOT, 'public');
const SHORTS = path.join(REPO, 'shorts'); // where jobs build their projects (git-ignored)
const BATCH = path.join(REPO, 'batch'); // finished projects wait here for the render script
const TEMPLATE = path.join(REPO, 'template', 'obese-scale');
const MATHS = path.join(REPO, 'examples', 'pythagoras-proof');
for (const d of [JOBS, SHORTS, BATCH]) fs.mkdirSync(d, { recursive: true });

// Windows usually has `python`, Linux and macOS `python3`.
const PY = spawnSync('python3', ['--version'], { shell: WIN }).status === 0 ? 'python3' : 'python';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';

// ---------------------------------------------------------------- formats: what each job asks Claude to do
const RULES = `You are running unattended from a dashboard: there is no human in the loop. Never ask a question, never wait
for approval; make the sensible choice yourself and note it. Do not install system packages or use sudo. Never print
or log API keys. This machine runs ${WIN ? 'Windows (use PowerShell commands)' : process.platform}; run Python as \`${PY}\`.`;

const FORMATS = {
  scale: {
    label: 'Scale Short (Pipsized: 9:16, narrated)',
    cwd: (job) => path.join(SHORTS, job.slug),
    prompt: (idea, dir, job) => {
      const out = path.join(SHORTS, job.slug);
      const dest = path.join(BATCH, job.slug);
      const finish = job.render
        ? `Then render the full video: npx remotion render src/index.ts Short out/video-silent.mp4 --codec h264 --muted
--gl=angle (if that fails, --gl=swangle), add the sound with ffmpeg (ffmpeg -y -i out/video-silent.mp4 -i out/audio.wav
-c:v copy -c:a aac -b:a 192k -shortest "out/<title>.mp4"), and look at 6 frames of the final file. Put its absolute
path in "video" below.`
        : `Do NOT render the full video here: it goes to the batch folder for a faster PC. Put null in "video" below.`;
      return `${RULES}

Make a funny YouTube Short for the channel Pipsized in ${out}, about: "${idea}".
The finished template is ${TEMPLATE}: read docs/FORMAT.md in ${REPO} and the template's voice.py, sound.py,
src/scenes.tsx, src/Short.tsx and src/kit.tsx first, and follow the format exactly. Copy package.json (renamed),
package-lock.json, tsconfig.json, remotion.config.ts, title.txt, src/index.ts, src/Root.tsx, src/kit.tsx, voice.py,
sound.py and the sfx folder into ${out}, then run npm install there.

The format: a 3D scale comparison on the bright blue grid studio, with Pip (the mascot, from kit.tsx) as the human
for scale. A deadpan narrator, 30 to 40 seconds, about 75 to 95 words:
- line 1 is a funny HOOK that makes people stay (a flash-forward of the punchline or an absurd claim, like the
  template's "Your chair is about to file a lawsuit."), with its own hook scene;
- line 2 is the title question; the same question is the TITLE pinned at the top after the hook;
- then 7 or 8 escalating beats, each a scale comparison with a REAL number (work every number out in PLAN.md with
  its source; round honestly), each with a stat in STATS (big number centred, mustard label);
- a short, dry last line that lands the joke, ending on the dark fade like the template.
Dark, absurd humour about the situation; never mock a group of people or anyone's body.

Steps: write PLAN.md (lines, beats, numbers with sources); edit LINES in voice.py and run it (${PY} voice.py; the
ElevenLabs key is in ${path.join(REPO, '.env')}); write src/scenes.tsx (scenes cued with wordAt, CUTS from the words;
wordAt matches case-insensitively, so pick the right occurrence) and the STATS and TITLE in src/Short.tsx; set
CUT_WORDS, STAT_WORDS and EVENTS in sound.py (a whoosh on every cut, a pop on every stat, one hit per action; reuse
the clips in sfx/, generate at most 3 new short clips) and run it.
Bundle once (npx remotion bundle src/index.ts --out-dir build) and render one still per scene with
npx remotion still build Short out/stills/<n>.png --frame=<f> --scale=0.5. Look at every still and fix anything
cropped, overlapping (a big stat over a 3D sign, captions over a face), unreadable or empty, then check again.
Make a contact sheet of the stills with ffmpeg at ${path.join(out, 'out', 'sheet.png')}.
${finish}
Copy the project into the batch folder without node_modules, build, stills or videos (to ${dest}), and write the
title question to ${path.join(dest, 'title.txt')}. Then write this JSON to ${path.join(dir, 'result.json')}:
{"video": <absolute path of the final mp4, or null>, "batch": "${dest.replace(/\\/g, '\\\\')}", "storyboard": "<absolute path of sheet.png>",
 "title": "<the title question>", "credits": <ElevenLabs credits used>, "notes": "<two sentences: the hook and jokes, and what you'd still improve>"}`;
    },
  },
  maths: {
    label: 'Silent maths animation (15–20 s, 16:9)',
    cwd: (job) => path.join(SHORTS, job.slug),
    prompt: (idea, dir, job) => `${RULES}

Build a silent maths animation as a Remotion project in ${path.join(SHORTS, job.slug)} about: "${idea}".
Copy the setup of ${MATHS} (package.json with a renamed project and composition id, package-lock.json,
tsconfig.json, src/index.ts, src/Root.tsx) and run npm install. Requirements: 1920x1080, 30 fps, 15 to 20 seconds,
no audio track (render with --muted); a matte near-black background, manim-style clean vector strokes and smooth
easing, KaTeX labels, one colour per quantity used consistently; title in the top band, the key equation in the
bottom band. The maths must be correct. Write a short PLAN.md of the scenes first. Render with npm run render to
out/video.mp4, then extract 4 stills with ffmpeg, look at them, fix any layout or maths problem and re-render.
When done, write this JSON to ${path.join(dir, 'result.json')}:
{"video": "<absolute path of the mp4>", "storyboard": "<absolute path of one still>", "title": "<title>", "credits": 0,
 "notes": "<two sentences: what it shows and what you'd still improve>"}`,
  },
};

// ---------------------------------------------------------------- jobs on disk
const jobDir = (id) => path.join(JOBS, id);
const readJob = (id) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(jobDir(id), 'job.json'), 'utf8'));
  } catch {
    return null;
  }
};
const writeJob = (job) => fs.writeFileSync(path.join(jobDir(job.id), 'job.json'), JSON.stringify(job, null, 1));
const allJobs = () =>
  fs
    .readdirSync(JOBS)
    .map(readJob)
    .filter(Boolean)
    .sort((a, b) => b.created - a.created);

// A server restart kills its children: anything left running is marked as stopped.
for (const j of allJobs()) {
  if (j.status === 'running' || j.status === 'queued') {
    j.status = 'stopped';
    j.error = 'The dashboard restarted while this job was in progress.';
    writeJob(j);
  }
}

// ---------------------------------------------------------------- live events (server-sent events)
const listeners = new Map(); // id -> Set(res)
const emit = (id, ev) => {
  const line = JSON.stringify({ at: Date.now(), ...ev });
  fs.appendFileSync(path.join(jobDir(id), 'events.jsonl'), line + '\n');
  for (const res of listeners.get(id) || []) res.write(`data: ${line}\n\n`);
};
const broadcastList = new Set();
const pushList = () => {
  const data = JSON.stringify(allJobs());
  for (const res of broadcastList) res.write(`data: ${data}\n\n`);
};

// Turn one stream-json message from claude into short, readable progress lines.
const summarise = (msg) => {
  const out = [];
  if (msg.type === 'assistant' && msg.message?.content) {
    for (const c of msg.message.content) {
      if (c.type === 'text' && c.text.trim()) out.push({ kind: 'say', text: c.text.trim() });
      if (c.type === 'tool_use') {
        const i = c.input || {};
        const what = i.description || i.command || i.file_path || i.skill || i.query || i.pattern || '';
        out.push({ kind: 'tool', text: `${c.name}${what ? ': ' + String(what).slice(0, 160) : ''}` });
      }
    }
  } else if (msg.type === 'user' && Array.isArray(msg.message?.content)) {
    for (const c of msg.message.content) {
      if (c.type === 'tool_result' && c.is_error) {
        const txt = Array.isArray(c.content) ? c.content.map((x) => x.text || '').join(' ') : String(c.content || '');
        out.push({ kind: 'error', text: txt.slice(0, 300) });
      }
    }
  } else if (msg.type === 'result') {
    out.push({ kind: 'done', text: msg.result ? String(msg.result).slice(0, 1200) : msg.subtype, cost: msg.total_cost_usd, turns: msg.num_turns });
  }
  return out;
};

// ---------------------------------------------------------------- the queue: one claude session at a time
let current = null; // { id, child }
const runNext = () => {
  if (current) return;
  const next = allJobs()
    .filter((j) => j.status === 'queued')
    .sort((a, b) => a.created - b.created)[0];
  if (!next) return;
  const fmt = FORMATS[next.format];
  const dir = jobDir(next.id);
  const cwd = fmt.cwd(next);
  fs.mkdirSync(cwd, { recursive: true });
  const prompt = fmt.prompt(next.idea, dir, next);
  // The prompt goes in on stdin: safe for long text with quotes and newlines on every OS (Windows needs a shell
  // to find claude.cmd, so arguments with spaces are quoted).
  const args = ['-p', '--permission-mode', 'auto', '--output-format', 'stream-json', '--verbose', '--add-dir', REPO, '--add-dir', dir];
  const child = spawn('claude', WIN ? args.map((a) => (/\s/.test(a) ? `"${a}"` : a)) : args, {
    cwd,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: WIN,
  });
  child.stdin.end(prompt);
  current = { id: next.id, child };
  next.status = 'running';
  next.started = Date.now();
  writeJob(next);
  emit(next.id, { kind: 'info', text: `Started in ${cwd}` });
  pushList();

  let buf = '';
  child.stdout.on('data', (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        for (const ev of summarise(JSON.parse(line))) emit(next.id, ev);
      } catch {
        emit(next.id, { kind: 'info', text: line.slice(0, 300) });
      }
    }
  });
  child.stderr.on('data', (d) => emit(next.id, { kind: 'error', text: d.toString().slice(0, 300) }));
  child.on('close', (code) => {
    const job = readJob(next.id);
    job.finished = Date.now();
    let result = null;
    try {
      result = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8'));
    } catch {}
    if (job.status === 'stopped') {
      // stopped by the user: keep that status
    } else if ((result?.video && fs.existsSync(result.video)) || (result?.batch && fs.existsSync(path.join(result.batch, 'package.json')))) {
      job.status = 'done';
      job.result = result;
    } else {
      job.status = 'failed';
      job.error = code === 0 ? 'Claude finished without producing a video file.' : `Claude exited with code ${code}.`;
    }
    writeJob(job);
    emit(next.id, { kind: 'info', text: `Finished: ${job.status}` });
    current = null;
    pushList();
    runNext();
  });
};

// ---------------------------------------------------------------- http
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let b = '';
    req.on('data', (d) => (b += d));
    req.on('end', () => {
      try {
        resolve(JSON.parse(b || '{}'));
      } catch {
        resolve({});
      }
    });
  });

// Stream a file with Range support, so the browser's video player can seek.
const sendFile = (req, res, file, type) => {
  if (!file || !fs.existsSync(file)) return send(res, 404, { error: 'not found' });
  const size = fs.statSync(file).size;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Number(m[2]) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'index.html')), 'text/html; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/api/formats') return send(res, 200, Object.entries(FORMATS).map(([id, f]) => ({ id, label: f.label })));
  if (req.method === 'GET' && url.pathname === '/api/jobs') return send(res, 200, allJobs());

  // Every Short waiting in the batch folder, zipped with the one-click render script, for the fast PC.
  if (req.method === 'GET' && url.pathname === '/api/batch.zip') {
    if (!fs.existsSync(BATCH)) return send(res, 404, { error: 'No batch folder yet.' });
    res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="pipsized-batch.zip"' });
    // zip on Linux and macOS; Windows 10+ ships bsdtar, which can write zip files
    const zip = WIN
      ? spawn('tar', ['--format', 'zip', '-cf', '-', '--exclude', 'node_modules', '--exclude', 'finished', '.'], { cwd: BATCH })
      : spawn('zip', ['-qr', '-', '.', '-x', '*/node_modules/*', 'finished/*'], { cwd: BATCH });
    zip.stdout.pipe(res);
    zip.on('error', () => res.end());
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/batch') {
    const items = fs.existsSync(BATCH)
      ? fs.readdirSync(BATCH, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(BATCH, d.name, 'package.json'))).map((d) => d.name)
      : [];
    return send(res, 200, { count: items.length, items });
  }

  if (req.method === 'GET' && url.pathname === '/api/jobs/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(allJobs())}\n\n`);
    broadcastList.add(res);
    req.on('close', () => broadcastList.delete(res));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/jobs') {
    const { idea, format, render } = await readBody(req);
    if (!idea || !String(idea).trim()) return send(res, 400, { error: 'Give the video an idea.' });
    if (!FORMATS[format]) return send(res, 400, { error: 'Unknown format.' });
    const id = `${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
    fs.mkdirSync(jobDir(id), { recursive: true });
    const job = { id, idea: String(idea).trim().slice(0, 500), format, slug: `${slugify(idea)}-${id.slice(-4)}`, status: 'queued', created: Date.now(), render: Boolean(render) };
    writeJob(job);
    fs.writeFileSync(path.join(jobDir(id), 'events.jsonl'), '');
    emit(id, { kind: 'info', text: current ? 'Queued behind the running job.' : 'Queued.' });
    pushList();
    runNext();
    return send(res, 201, job);
  }

  if (parts[0] === 'api' && parts[1] === 'jobs' && parts[2]) {
    const id = parts[2];
    const job = readJob(id);
    if (!job) return send(res, 404, { error: 'No such job.' });

    if (req.method === 'GET' && parts[3] === 'events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      const past = fs.readFileSync(path.join(jobDir(id), 'events.jsonl'), 'utf8').split('\n').filter(Boolean);
      for (const line of past) res.write(`data: ${line}\n\n`);
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(res);
      req.on('close', () => listeners.get(id)?.delete(res));
      return;
    }
    if (req.method === 'GET' && parts[3] === 'video') return sendFile(req, res, job.result?.video, 'video/mp4');
    if (req.method === 'GET' && parts[3] === 'storyboard') {
      const f = job.result?.storyboard;
      return sendFile(req, res, f, f?.endsWith('.png') ? 'image/png' : 'image/jpeg');
    }
    if (req.method === 'POST' && parts[3] === 'stop') {
      if (job.status === 'queued') {
        job.status = 'stopped';
        writeJob(job);
      } else if (job.status === 'running' && current?.id === id) {
        job.status = 'stopped';
        writeJob(job);
        current.child.kill('SIGTERM');
      }
      emit(id, { kind: 'info', text: 'Stopped by you.' });
      pushList();
      return send(res, 200, job);
    }
  }
  send(res, 404, { error: 'not found' });
});

// Local only: this server runs Claude with your files, so it never listens beyond this machine.
server.listen(PORT, '127.0.0.1', () => console.log(`Pipsized Studio on http://localhost:${PORT}`));
