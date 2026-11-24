#!/usr/bin/env node
// One command from takes to finished cold open:
//   node template/tools/make.mjs <project> [--stills] [--from <step>] [--only step,step] [--lock <dir>]
//   steps: voice, mouths, shots, mix, video, mux, check   (e.g. --only mix,mux,check after changing sound.json)
// Steps: voice (voice_build.py) -> mouths (visemes.py) -> shots (render.mjs info) -> [--stills: render a still per shot and stop]
//        -> mix (mix.py) -> video (render.mjs video, holding --lock if given) -> mux (ffmpeg) -> check (editcheck.py, audiocheck.py)
// Python: see pyenv.mjs ($PYTHON, else <skill>/.venv, else isolated <skill>/pydeps, else python3).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATE, ROOT, python } from './pyenv.mjs';

const T = (f) => path.join(TEMPLATE, 'tools', f);
const argv = process.argv.slice(2);
const flag = (n, hasValue = true) => { const i = argv.indexOf(n); if (i < 0) return null; const v = hasValue ? argv[i + 1] : true; argv.splice(i, hasValue ? 2 : 1); return v; };
const lock = flag('--lock'), from = flag('--from'), stillsOnly = flag('--stills', false), only = flag('--only');
const dir = argv[0];
if (!dir) { console.log('usage: node template/tools/make.mjs <project> [--stills] [--from <step>] [--only step,step] [--lock <dir>]\n  steps: voice, mouths, shots, mix, video, mux, check'); process.exit(1); }
const proj = path.resolve(dir);
if (!fs.existsSync(path.join(proj, 'project.json'))) { console.error(`error: ${proj} has no project.json`); process.exit(1); }
const P = JSON.parse(fs.readFileSync(path.join(proj, 'project.json'), 'utf8'));
const FF = process.env.FFMPEG || 'ffmpeg';

const pyenv = python();
process.env.PYTHONPATH = pyenv.env.PYTHONPATH || process.env.PYTHONPATH || '';
if (!process.env.PYTHONPATH) delete process.env.PYTHONPATH;
const PY = [pyenv.cmd, ...pyenv.args];
const run = (cmd, args, what) => {
  console.log(`\n== ${what}: ${[cmd, ...args].join(' ')}${cmd === PY[0] && process.env.PYTHONPATH ? `  (PYTHONPATH=${process.env.PYTHONPATH})` : ''}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.error) { console.error(`error: cannot run ${cmd}: ${r.error.message}`); process.exit(1); }
  if (r.status !== 0) { console.error(`error: ${what} failed (exit ${r.status})`); process.exit(r.status || 1); }
};
const py = (tool, args, what) => run(PY[0], [...PY.slice(1), T(tool), ...args], what);

// preflight: the tools this run needs
const chk = spawnSync(PY[0], [...PY.slice(1), '-c', 'import numpy'], { encoding: 'utf8' });
if (chk.status !== 0) { console.error(`error: Python with numpy is needed (${PY.join(' ')}). In ${ROOT} run:\n  python3 -m venv .venv && .venv/bin/pip install -r template/requirements.txt\n${chk.stderr || chk.error?.message || ''}`); process.exit(1); }
const ff = spawnSync(FF, ['-version'], { encoding: 'utf8' });
if (ff.status !== 0) { console.error(`error: ffmpeg not found (${FF}). Install it (brew install ffmpeg / apt install ffmpeg) or set FFMPEG=/path/to/ffmpeg.`); process.exit(1); }

const STEPS = ['voice', 'mouths', 'shots', 'mix', 'video', 'mux', 'check'];
let i0 = from ? STEPS.indexOf(from) : 0;
if (i0 < 0) { console.error(`--from must be one of ${STEPS.join(', ')}`); process.exit(1); }
const out = path.join(proj, 'out');
const final = path.join(out, P.output || 'cold_open.mp4');
const todo = only ? only.split(',') : STEPS.slice(i0);
for (const s of todo) if (!STEPS.includes(s)) { console.error(`--only: unknown step ${s} (steps: ${STEPS.join(', ')})`); process.exit(1); }
for (const step of todo) {
  if (step === 'voice') py('voice_build.py', [proj], 'voice track');
  if (step === 'mouths') py('visemes.py', [proj], 'mouth shapes');
  if (step === 'shots') {
    run(process.execPath, [T('render.mjs'), proj, 'info'], 'shot list');
    if (stillsOnly) { run(process.execPath, [T('render.mjs'), proj, 'stills', path.join(out, 'stills')], 'stills (one per shot)'); console.log(`\nstills in ${path.join(out, 'stills')} -- check them (references/10-still-check.md), then run again without --stills`); process.exit(0); }
  }
  if (step === 'mix') py('mix.py', [proj], 'mix');
  if (step === 'video') run(process.execPath, [T('render.mjs'), proj, 'video', path.join(out, 'video.mp4'), ...(lock ? ['--lock', lock] : [])], 'render video');
  if (step === 'mux') {
    const mux = (vol) => run(FF, ['-v', 'error', '-y', '-i', path.join(out, 'video.mp4'), '-i', path.join(out, 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', ...(vol ? ['-af', `volume=${vol}dB`] : []), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final], vol ? `mux at ${vol} dB` : 'mux');
    const tp = () => { const r = spawnSync(FF, ['-hide_banner', '-i', final, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }); const m = [...(r.stderr || '').matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].pop(); return m ? parseFloat(m[1]) : null; };
    // ffmpeg's AAC encoder can overshoot a limited transient by several dB, and not in step with the input level (turning the mix
    // down 0.6 dB once took a file from -0.6 to +1.0 dBTP). So try a few small reductions and keep the first at or under
    // -0.5 dBTP (what the approved example shipped at).
    const TP_MAX = -0.5;
    let best = null;
    for (const v of [0, -0.3, -0.6, -1.0, -1.5, -2.0]) {
      mux(v);
      const p = tp();
      console.log(`true peak ${p?.toFixed(1)} dBTP at ${v} dB`);
      if (p == null || p <= TP_MAX) { best = null; break; }
      if (!best || p < best.p) best = { v, p };
    }
    if (best) { console.log(`no setting reached ${TP_MAX} dBTP; using the lowest peak (${best.p.toFixed(1)} dBTP at ${best.v} dB)`); mux(best.v); }
  }
  if (step === 'check') { py('editcheck.py', [proj], 'edit check'); py('audiocheck.py', [proj, final], 'audio check'); }
}
console.log(todo.includes('mux') ? `\ndone: ${final}` : `\ndone: ${todo.join(', ')}`);
