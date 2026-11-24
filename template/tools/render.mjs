#!/usr/bin/env node
// Headless Chrome driver for the engine.
//   node template/tools/render.mjs <project> info                      resolve the shot list -> out/timeline/shots.json (+ print it)
//   node template/tools/render.mjs <project> stills <outdir> [mid|<frame>...] [--shots id,id]
//   node template/tools/render.mjs <project> video [<out.mp4>] [f0 f1] [--lock <dir>]
//   node template/tools/render.mjs sheet <dir> <out.jpg> [cols]        contact sheet of every png/jpg in dir
//   node template/tools/render.mjs pair <ours.png> <ref.png> <out.jpg> [label] [refLabel]   side by side (or: pair --list file.json)
// --lock <dir>: hold a shared mkdir lock for the whole video render (waits while another process holds it). No lock without it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildShots } from '../engine/js/timeline.js';

const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.dirname(TEMPLATE);
const ENGINE = path.join(TEMPLATE, 'engine');
process.env.PUPPETEER_CACHE_DIR ||= path.join(ROOT, '.cache', 'puppeteer');
let puppeteer;
try { ({ default: puppeteer } = await import('puppeteer')); } catch (e) { console.error(`puppeteer is not installed: run "npm install" in ${ROOT}\n${e.message}`); process.exit(1); }
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const only = flag('--shots');
const lockDir = flag('--lock');
const die = (m) => { console.error('error:', m); process.exit(1); };
const readJSON = (f, what) => { if (!fs.existsSync(f)) die(`missing ${f}${what ? ` (${what})` : ''}`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { die(`${f}: ${e.message}`); } };
const deepMerge = (a, b) => { if (!b) return a; const o = { ...a }; for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? deepMerge(a[k], b[k]) : b[k]; return o; };

// ---------------------------------------------------------------- project data
function loadProject(dir) {
  dir = path.resolve(dir);
  const P = readJSON(path.join(dir, 'project.json'), 'is this a project folder?');
  const castSrc = P.cast || 'default';
  const cast = deepMerge(readJSON(castSrc.endsWith('.json') ? path.join(dir, castSrc) : path.join(TEMPLATE, 'cast', castSrc + '.json')), P.castOverrides || {});
  const V = readJSON(path.join(dir, 'out', 'timeline', 'voice.json'), 'run tools/voice_build.py first');
  const visF = path.join(dir, 'out', 'timeline', 'visemes.json');
  const VIS = fs.existsSync(visF) ? readJSON(visF) : {};
  const spec = readJSON(path.join(dir, 'shots.json'));
  let TL;
  try { TL = buildShots(V, spec, P.fps || 30); } catch (e) { die(`shots.json: ${e.message}`); }
  return { dir, P, cast, V, VIS, TL };
}

function serve(proj) {
  const data = proj ? { '/tl.json': proj.TL, '/project.json': proj.P, '/cast.json': proj.cast, '/voice.json': proj.V, '/visemes.json': proj.VIS } : {};
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (data[url]) { rsp.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return rsp.end(JSON.stringify(data[url])); }
      let p;
      if (url.startsWith('/node_modules/')) p = path.join(ROOT, url);
      else if (url.startsWith('/img/')) p = url.slice(4); // absolute file path for sheets/pairs
      else p = path.join(ENGINE, url);
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
async function launch() {
  const gpu = process.platform === 'darwin' ? ['--use-angle=metal'] : [];
  return puppeteer.launch({ headless: 'shell', args: [...gpu, '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--force-color-profile=srgb', '--hide-scrollbars', '--mute-audio'], defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }, protocolTimeout: 900000 });
}
async function openEngine(proj) {
  const srv = await serve(proj); const browser = await launch(); const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (!/GPU stall|GroupMarker|Automatic fallback/.test(t)) console.log('[page]', t); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true || !!window.__error', { timeout: 600000 });
  const err = await page.evaluate(() => window.__error);
  if (err) { await browser.close(); srv.close(); die('engine failed:\n' + err); }
  const info = await page.evaluate(() => ({ renderer: window.__info, total: window.__total, shots: window.__shots }));
  const frame = async (f, type = 'png') => { await page.evaluate((f) => window.renderFrame(f), f); return page.screenshot({ type, quality: type === 'jpeg' ? 92 : undefined, clip: { x: 0, y: 0, width: 1920, height: 1080 }, optimizeForSpeed: true }); };
  return { page, info, frame, close: async () => { await browser.close(); srv.close(); } };
}
function writeShots(proj) {
  const S = proj.TL.shots.map((s) => ({ id: s.id, start: s.start, end: s.end, f0: s.f0, f1: s.f1, type: s.type || 'pic', set: s.set || null, move: s.move || null }));
  fs.writeFileSync(path.join(proj.dir, 'out', 'timeline', 'shots.json'), JSON.stringify({ total: proj.TL.total, shots: S }, null, 1));
  return S;
}

// ---------------------------------------------------------------- commands
const PROJECT_CMDS = new Set(['info', 'stills', 'video']);
let cmd, a, proj;
if (argv[0] && PROJECT_CMDS.has(argv[1])) { proj = loadProject(argv[0]); cmd = argv[1]; a = argv.slice(2); }
else { cmd = argv[0]; a = argv.slice(1); }

if (cmd === 'info') {
  const S = writeShots(proj);
  console.log(`total ${proj.TL.total} frames (${proj.TL.duration.toFixed(2)} s)`);
  for (const s of S) console.log(`${s.id.padEnd(10)} ${String(s.type).padEnd(8)} ${s.start.toFixed(2).padStart(6)}-${s.end.toFixed(2).padStart(6)}  ${(s.end - s.start).toFixed(2)}s  ${JSON.stringify(s.move || {})}`);
} else if (cmd === 'stills') {
  writeShots(proj);
  const out = path.resolve(a[0] || path.join(proj.dir, 'out', 'stills')); fs.mkdirSync(out, { recursive: true });
  const E = await openEngine(proj);
  let list = a.slice(1);
  if (!list.length || list[0] === 'mid') list = E.info.shots.filter((s) => !only || only.split(',').includes(s.id)).map((s) => s.f0 + Math.floor((s.f1 - s.f0) * 0.6));
  for (const x of list) { const f = parseInt(x, 10); const sh = E.info.shots.filter((s) => s.f0 <= f).pop(); fs.writeFileSync(path.join(out, `f${String(f).padStart(4, '0')}_${sh.id}.png`), await E.frame(f)); console.log('still', f, sh.id); }
  await E.close();
} else if (cmd === 'video') {
  writeShots(proj);
  if (lockDir) {
    // shared mkdir lock: only one heavy render at a time on this machine
    const LOCK = path.resolve(lockDir.replace(/^~(?=$|\/)/, process.env.HOME || ''));
    for (;;) { try { fs.mkdirSync(LOCK); break; } catch (e) { if (e.code !== 'EEXIST') die(`cannot create lock ${LOCK}: ${e.message}`); console.log(`render lock ${LOCK} busy, waiting 15 s`); await new Promise((r) => setTimeout(r, 15000)); } }
    const release = () => { try { fs.rmdirSync(LOCK); } catch {} };
    process.on('exit', release); process.on('SIGINT', () => { release(); process.exit(130); }); process.on('SIGTERM', () => { release(); process.exit(143); });
    console.log('holding render lock', LOCK);
  }
  const out = path.resolve(a[0] || path.join(proj.dir, 'out', 'video.mp4')); fs.mkdirSync(path.dirname(out), { recursive: true });
  const E = await openEngine(proj);
  const f0 = a[1] ? parseInt(a[1], 10) : 0, f1 = a[2] ? parseInt(a[2], 10) : E.info.total;
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.on('error', (e) => die(`cannot run ffmpeg (${FFMPEG}): ${e.message}`));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) { const b = await E.frame(f); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); if (f % 60 === 0) console.log(`frame ${f}/${f1} ${((Date.now() - t0) / 1000 / (f - f0 + 1)).toFixed(3)} s/frame`); }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await E.close();
  console.log('done', out, ((Date.now() - t0) / 1000).toFixed(1), 's');
} else if (cmd === 'sheet' || cmd === 'pair') {
  const srv = await serve(null); const browser = await launch(); const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`).catch(() => {});
  const base = `http://127.0.0.1:${srv.address().port}/img`;
  await page.evaluate(() => { window.load = (u) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('cannot load ' + u)); i.src = u; }); });
  const save = (d, o) => { fs.mkdirSync(path.dirname(path.resolve(o)), { recursive: true }); fs.writeFileSync(o, Buffer.from(d.split(',')[1], 'base64')); console.log('saved', o); };
  if (cmd === 'sheet') {
    const dir = a[0], files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
    const d = await page.evaluate(async (items, cols) => {
      const w = 480, h = 270, rows = Math.ceil(items.length / cols); const c = document.createElement('canvas'); c.width = cols * w; c.height = rows * (h + 22); const g = c.getContext('2d');
      g.fillStyle = '#1e1e1e'; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < items.length; i++) { const im = await window.load(items[i].u); const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 22); g.drawImage(im, x, y, w, h); g.fillStyle = '#ffe600'; g.font = '15px sans-serif'; g.fillText(items[i].n, x + 4, y + h + 16); }
      return c.toDataURL('image/jpeg', 0.88);
    }, files.map((f) => ({ u: base + path.resolve(dir, f), n: f })), parseInt(a[2] || '4', 10));
    save(d, a[1]);
  } else {
    const list = a[0] === '--list' ? JSON.parse(fs.readFileSync(a[1], 'utf8')) : [[a[0], a[1], a[2], a[3], a[4]]];
    for (const [A0, B0, O0, L0, R0] of list) {
      const d = await page.evaluate(async (A, B, la, lb) => {
        const a = await window.load(A), b = await window.load(B); const h = 720, wa = Math.round(a.width * h / a.height), wb = Math.round(b.width * h / b.height);
        const c = document.createElement('canvas'); c.width = wa + wb + 12; c.height = h + 40; const g = c.getContext('2d'); g.fillStyle = '#141414'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(a, 0, 40, wa, h); g.drawImage(b, wa + 12, 40, wb, h); g.font = 'bold 22px sans-serif'; g.fillStyle = '#ffe600'; g.fillText('OURS  ' + la, 8, 28); g.fillStyle = '#78dcff'; g.fillText('REFERENCE  ' + lb, wa + 20, 28);
        return c.toDataURL('image/jpeg', 0.9);
      }, base + path.resolve(A0), base + path.resolve(B0), L0 || path.basename(A0), R0 || path.basename(B0));
      save(d, O0);
    }
  }
  await browser.close(); srv.close();
} else {
  console.log('usage:\n  render.mjs <project> info | stills <outdir> [mid|frames...] [--shots a,b] | video [out.mp4] [f0 f1] [--lock <dir>]\n  render.mjs sheet <dir> <out.jpg> [cols]\n  render.mjs pair <ours> <ref> <out.jpg> [label] [refLabel]');
  if (cmd) process.exit(1);
}
void pathToFileURL;
