// 2D overlay drawn over the WebGL picture: black typing cards and chapter card in an UPRIGHT hand font (Patrick Hand),
// big enough to read on a phone; marker labels, shaking counters and the title in an upright comic font (Luckiest Guy);
// the title sits on a plain dark panel; white flash; speed lines. No italic or slanted type, no rotated text.
import { clamp, easeOutBack, rng } from './util.js';

const INK = '#141014';
export const W = 1920, H = 1080;
const LUCKY = 'Lucky', HAND = 'Hand';

function marker(g, text, x, y, size, fill, o = {}) {
  g.save();
  g.font = `${size}px ${LUCKY}`; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
  g.lineJoin = 'round'; g.miterLimit = 2;
  if (o.shadow !== false) { g.lineWidth = size * 0.22; g.strokeStyle = 'rgba(0,0,0,0.4)'; g.strokeText(text, x + size * 0.05, y + size * 0.07); }
  g.lineWidth = size * (o.edge ?? 0.16); g.strokeStyle = o.edgeColor || INK; g.strokeText(text, x, y);
  g.fillStyle = fill; g.fillText(text, x, y);
  g.restore();
}
export function tag(g, text, u, x, y, size = 64, fill = '#ffffff') {
  const n = Math.floor(clamp(u) * text.length + 0.0001);
  if (n > 0) marker(g, text.slice(0, n), x, y, size, fill);
}

// split the full text into the fewest centred lines (up to 4) that each fit 86% of the width, balanced so the longest is shortest
function layout(g, full, maxW) {
  if (g.measureText(full).width <= maxW) return [full];
  const words = full.split(' '); let best = null;
  for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '); const m = Math.max(g.measureText(a).width, g.measureText(b).width); if (!best || m < best.m) best = { a, b, m }; }
  if (best.m <= maxW || words.length < 3) return [best.a, best.b];
  // long title questions: 3 or 4 lines (fewest that fit; if none fits, the most balanced 4-line split)
  const w = (i, j) => g.measureText(words.slice(i, j).join(' ')).width;
  let split = null;
  for (const n of [3, 4]) {
    const memo = new Map();
    const solve = (i, k) => { // best split of words[i:] into k lines -> { m, cuts }
      const key = i + ':' + k; if (memo.has(key)) return memo.get(key);
      let r = null;
      if (k === 1) r = { m: w(i, words.length), cuts: [] };
      else for (let j = i + 1; j <= words.length - k + 1; j++) { const s = solve(j, k - 1); const m = Math.max(w(i, j), s.m); if (!r || m < r.m) r = { m, cuts: [j, ...s.cuts] }; }
      memo.set(key, r); return r;
    };
    if (words.length < n) break;
    split = solve(0, n);
    if (split.m <= maxW) break;
  }
  const out = []; let i0 = 0; for (const j of [...split.cuts, words.length]) { out.push(words.slice(i0, j).join(' ')); i0 = j; }
  return out;
}
// black typing card: segments [[text, t0, t1], ...] revealed in sync with the voice
export function typingCard(g, segs, T, o = {}) {
  g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
  let size = o.size || 124;
  g.font = `${size}px ${HAND}`; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const full = segs.map((s) => s[0]).join('').trim();
  // never let a line run off the frame: shrink the type until the chosen layout fits
  while (size > 60 && Math.max(...layout(g, full, W * 0.86).map((l) => g.measureText(l).width)) > W * 0.86) { size -= 6; g.font = `${size}px ${HAND}`; }
  let shown = 0;
  let acc = 0;
  for (const [txt, t0, t1] of segs) { if (T < t0) break; const u = clamp((T - t0) / Math.max(0.05, t1 - t0)); shown = acc + Math.ceil(u * txt.length); acc += txt.length; if (u < 1) break; }
  const lines = layout(g, full, W * 0.86);
  const lh = size * 1.12, y0 = H * 0.47 - (lines.length - 1) * lh / 2 + size * 0.3;
  let used = 0;
  g.fillStyle = '#f6f6f4';
  lines.forEach((ln, i) => {
    const lw = g.measureText(ln).width, x = W / 2 - lw / 2;
    const vis = Math.max(0, Math.min(ln.length, shown - used));
    g.fillText(ln.slice(0, vis), x, y0 + i * lh);
    used += ln.length + 1;
  });
}
export function chapterCard(g, text, size = 136) {
  g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
  g.font = `${size}px ${HAND}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#f6f6f4'; g.fillText(text, W / 2, H * 0.5 + size * 0.3);
}
// rolling counter that shakes while it climbs (counters roll as the number is said)
export function counter(g, label, value, x, y, o = {}) {
  const sz = o.size || 130, sh = o.shake || 0;
  const dx = sh * Math.sin(o.t * 63) * 10, dy = sh * Math.cos(o.t * 71) * 8, s = 1 + sh * 0.05 * Math.sin(o.t * 40);
  marker(g, label, x, y - sz * 1.0, sz * 0.46, o.labelColor || '#ffffff', { align: 'right' });
  g.save(); g.translate(x + dx, y + dy); g.scale(s, s); marker(g, value, 0, 0, sz, o.color || '#ff4a3a', { align: 'right' }); g.restore();
}
export function ringLines(g, x, y, r, u, n = 9, text = 'RIIING!') {
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2, r0 = r * (1.05 + 0.25 * u), r1 = r * (1.3 + 0.35 * u);
    g.lineWidth = 18; g.strokeStyle = INK; g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke();
    g.lineWidth = 9; g.strokeStyle = '#fff6d8'; g.stroke();
  }
  if (text) marker(g, text, x + r * 0.7, y + r * 1.75, 96, '#ffd34a');
  g.restore();
}
// title card: plain dark panel behind the lettering, words build in sequence, key phrase on a red box, speed-line burst + flash exit
export function titleCard(g, t, spec) {
  const a = clamp(t / 0.18);
  g.save();
  const pw = spec.panelW ?? 0.66;
  const gr = g.createLinearGradient(0, 0, W * pw, 0);
  gr.addColorStop(0, `rgba(6,5,9,${0.97 * a})`); gr.addColorStop(0.78, `rgba(6,5,9,${0.94 * a})`); gr.addColorStop(1, 'rgba(6,5,9,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const xs = {};
  for (const w of spec.words) {
    const L = spec.lines[w.line];
    g.font = `${L.size}px ${LUCKY}`;
    const xx = xs[w.line] ?? L.x; const ww = g.measureText(w.text).width;
    xs[w.line] = xx + ww + L.size * 0.24;
    const u = (t - w.at) / 0.16; if (u < 0) continue;
    const s = 1 + 0.7 * (1 - easeOutBack(clamp(u)));
    g.save(); g.globalAlpha = clamp(u * 2);
    g.translate(xx + ww / 2, L.y - L.size * 0.35); g.scale(s, s); g.translate(-(xx + ww / 2), -(L.y - L.size * 0.35));
    if (w.key) {
      const pad = L.size * 0.16;
      g.fillStyle = INK; g.fillRect(xx - pad - 10, L.y - L.size * 0.95 - 10, ww + 2 * pad + 20, L.size * 1.18 + 20);
      g.fillStyle = spec.keyColor || '#d92a20'; g.fillRect(xx - pad, L.y - L.size * 0.95, ww + 2 * pad, L.size * 1.18);
    }
    marker(g, w.text, xx, L.y, L.size, '#ffffff', { edge: w.key ? 0.1 : 0.17 });
    g.restore();
  }
  g.restore();
  if (t >= spec.burstAt) {
    const u = clamp((t - spec.burstAt) / 0.4);
    speedLines(g, spec.burstX ?? W * 0.5, spec.burstY ?? H * 0.45, u);
    const fl = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
    g.fillStyle = `rgba(255,255,255,${0.95 * clamp(fl)})`; g.fillRect(0, 0, W, H);
  }
}
export function speedLines(g, cx, cy, u, seed = 3) {
  const R = rng(seed); g.save();
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2, w = 6 + R() * 26;
    const r0 = (260 + R() * 260) * (1 - 0.5 * u) + u * 300, r1 = r0 + 500 + R() * 900;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a + w / r1) * r1, cy + Math.sin(a + w / r1) * r1); g.lineTo(cx + Math.cos(a - w / r1) * r1, cy + Math.sin(a - w / r1) * r1); g.closePath();
    g.fillStyle = i % 3 ? 'rgba(255,255,255,0.92)' : 'rgba(20,16,20,0.75)'; g.fill();
  }
  g.restore();
}
export function flash(g, a) { if (a > 0) { g.fillStyle = `rgba(255,255,250,${clamp(a)})`; g.fillRect(0, 0, W, H); } }
export { marker };
