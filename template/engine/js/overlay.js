// 2D overlay drawn over the WebGL picture: black typing cards and chapter card in an UPRIGHT hand font (Patrick Hand),
// big enough to read on a phone; marker labels and shaking counters in an upright comic font (Luckiest Guy); the title is
// hand-lettered with the skill's own brush alphabet on a plain dark panel; white flash; speed lines. No italic or slanted
// type, no rotated text.
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
// ------------------------------------------------------------------ HAND-LETTERED BRUSH TITLE (the skill's own letterforms)
// Each glyph is a few stroke skeletons in a unit box (x 0..1 across the glyph's own width, y 0 = cap height, 1 = baseline).
// They are painted like a flat brush: thick on downstrokes, thinner across (width depends on stroke direction), a heavier
// press at the start of a stroke and a lift at the end, slight wobble, dry-brush bristle streaks, and an ink edge underneath.
// Letters vary a little in size and sit a little off the baseline, but stay perfectly upright (no slant, no rotation).
// Capitals only (lower case is drawn as capitals). BRUSH_CHARS lists every character the alphabet has.
const C = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const PI = Math.PI;
const SGLYPH = [...C(0.5, 0.26, 0.34, 0.24, -0.15 * PI, -PI, 12), ...C(0.5, 0.26, 0.34, 0.24, PI, 0.62 * PI, 6).slice(1), [0.62, 0.53], ...C(0.5, 0.75, 0.37, 0.25, -0.45 * PI, 0.9 * PI, 16).slice(1)];
const GLYPHS = {
  // the round-3 Knight title letters (unchanged: the example renders frame for frame with them)
  H: { w: 0.78, s: [[[0.14, 0], [0.14, 1]], [[0.86, 0.02], [0.86, 1]], [[0.14, 0.5], [0.86, 0.48]]] },
  O: { w: 0.86, s: [C(0.5, 0.5, 0.42, 0.5, -0.55 * PI, 1.5 * PI, 30)] },
  W: { w: 1.05, s: [[[0.02, 0], [0.24, 1], [0.5, 0.32], [0.76, 1], [0.98, 0]]] },
  N: { w: 0.8, s: [[[0.13, 1], [0.13, 0]], [[0.13, 0], [0.87, 1]], [[0.87, 1], [0.87, 0]]] },
  E: { w: 0.66, s: [[[0.16, 0], [0.16, 1]], [[0.16, 0], [0.86, 0]], [[0.16, 0.49], [0.74, 0.49]], [[0.16, 1], [0.88, 1]]] },
  S: { w: 0.7, s: [SGLYPH] },
  R: { w: 0.74, s: [[[0.15, 1], [0.15, 0]], [[0.15, 0], ...C(0.5, 0.26, 0.36, 0.26, -0.5 * PI, 0.5 * PI, 12), [0.15, 0.52]], [[0.42, 0.52], [0.9, 1]]] },
  V: { w: 0.82, s: [[[0.03, 0], [0.5, 1], [0.97, 0]]] },
  L: { w: 0.62, s: [[[0.16, 0], [0.16, 1]], [[0.16, 1], [0.88, 1]]] },
  T: { w: 0.74, s: [[[0.02, 0.01], [0.98, 0]], [[0.5, 0], [0.5, 1]]] },
  I: { w: 0.34, s: [[[0.5, 0], [0.5, 1]]] },
  M: { w: 1.0, s: [[[0.08, 1], [0.12, 0]], [[0.12, 0], [0.5, 0.62], [0.88, 0]], [[0.88, 0], [0.92, 1]]] },
  $: { w: 0.7, s: [SGLYPH, [[0.5, -0.14], [0.5, 1.14]]] },
  4: { w: 0.76, s: [[[0.68, 1], [0.68, 0]], [[0.68, 0], [0.05, 0.68], [0.95, 0.68]]] },
  6: { w: 0.72, s: [[[0.8, 0.06], ...C(0.55, 0.62, 0.42, 0.56, -0.62 * PI, -PI, 10).slice(1), ...C(0.5, 0.7, 0.36, 0.3, PI, 3 * PI, 24).slice(1)]] },
  0: { w: 0.74, s: [C(0.5, 0.5, 0.38, 0.5, -0.55 * PI, 1.5 * PI, 30)] },
  ' ': { w: 0.34, s: [] },
  // the rest of the alphabet, drawn the same way
  A: { w: 0.82, s: [[[0.04, 1], [0.5, 0], [0.96, 1]], [[0.24, 0.62], [0.76, 0.62]]] },
  B: { w: 0.72, s: [[[0.15, 1], [0.15, 0]], [[0.15, 0], ...C(0.48, 0.24, 0.34, 0.24, -0.5 * PI, 0.5 * PI, 10), [0.15, 0.48]], [[0.15, 0.48], ...C(0.5, 0.74, 0.38, 0.26, -0.5 * PI, 0.5 * PI, 12), [0.15, 1]]] },
  C: { w: 0.78, s: [C(0.55, 0.5, 0.43, 0.5, -0.22 * PI, -1.78 * PI, 26)] },
  D: { w: 0.78, s: [[[0.15, 1], [0.15, 0]], [[0.15, 0], [0.42, 0], ...C(0.42, 0.5, 0.44, 0.5, -0.5 * PI, 0.5 * PI, 16), [0.15, 1]]] },
  F: { w: 0.62, s: [[[0.16, 0], [0.16, 1]], [[0.16, 0], [0.86, 0]], [[0.16, 0.48], [0.72, 0.48]]] },
  G: { w: 0.84, s: [[...C(0.54, 0.5, 0.42, 0.5, -0.22 * PI, -1.95 * PI, 26), [0.6, 0.58]]] },
  J: { w: 0.62, s: [[[0.78, 0], [0.78, 0.68], ...C(0.48, 0.68, 0.3, 0.32, 0, PI, 10).slice(1)]] },
  K: { w: 0.76, s: [[[0.15, 0], [0.15, 1]], [[0.88, 0], [0.15, 0.58]], [[0.38, 0.42], [0.9, 1]]] },
  P: { w: 0.7, s: [[[0.15, 1], [0.15, 0]], [[0.15, 0], ...C(0.48, 0.27, 0.36, 0.27, -0.5 * PI, 0.5 * PI, 12), [0.15, 0.54]]] },
  Q: { w: 0.86, s: [C(0.5, 0.5, 0.42, 0.5, -0.55 * PI, 1.5 * PI, 30), [[0.56, 0.68], [0.94, 1.04]]] },
  U: { w: 0.78, s: [[[0.14, 0], [0.14, 0.62], ...C(0.5, 0.62, 0.36, 0.38, PI, 0, 12).slice(1), [0.86, 0]]] },
  X: { w: 0.8, s: [[[0.06, 0], [0.94, 1]], [[0.94, 0], [0.06, 1]]] },
  Y: { w: 0.8, s: [[[0.04, 0], [0.5, 0.52]], [[0.96, 0], [0.5, 0.52], [0.5, 1]]] },
  Z: { w: 0.74, s: [[[0.08, 0], [0.92, 0], [0.08, 1], [0.94, 1]]] },
  1: { w: 0.5, s: [[[0.2, 0.18], [0.58, 0], [0.58, 1]]] },
  2: { w: 0.72, s: [[...C(0.5, 0.3, 0.36, 0.3, -0.95 * PI, 0.2 * PI, 14), [0.08, 1], [0.94, 1]]] },
  3: { w: 0.7, s: [[...C(0.48, 0.25, 0.34, 0.25, -0.9 * PI, 0.5 * PI, 14), ...C(0.48, 0.74, 0.4, 0.26, -0.5 * PI, 0.9 * PI, 14).slice(1)]] },
  5: { w: 0.7, s: [[[0.84, 0], [0.22, 0], [0.18, 0.44], ...C(0.48, 0.68, 0.38, 0.32, -0.75 * PI, 0.85 * PI, 16)]] },
  7: { w: 0.7, s: [[[0.06, 0], [0.94, 0], [0.36, 1]]] },
  8: { w: 0.7, s: [C(0.5, 0.25, 0.3, 0.25, 0.5 * PI, 2.5 * PI, 20), C(0.5, 0.74, 0.38, 0.26, -0.5 * PI, 1.5 * PI, 22)] },
  9: { w: 0.72, s: [C(0.48, 0.3, 0.36, 0.3, 0, 2 * PI, 24), [[0.84, 0.3], [0.78, 0.72], [0.52, 1], [0.2, 0.94]]] },
  '¥': { w: 0.8, s: [[[0.04, 0], [0.5, 0.5]], [[0.96, 0], [0.5, 0.5], [0.5, 1]], [[0.2, 0.56], [0.8, 0.56]], [[0.2, 0.76], [0.8, 0.76]]] },
  '£': { w: 0.74, s: [[[0.78, 0.12], ...C(0.55, 0.2, 0.24, 0.2, -0.2 * PI, -PI, 8).slice(1), [0.31, 0.6], [0.22, 1], [0.9, 1]], [[0.12, 0.52], [0.64, 0.52]]] },
  '€': { w: 0.8, s: [C(0.58, 0.5, 0.4, 0.5, -0.25 * PI, -1.75 * PI, 24), [[0.06, 0.4], [0.62, 0.4]], [[0.06, 0.6], [0.58, 0.6]]] },
  '%': { w: 0.84, s: [[[0.86, 0], [0.14, 1]], C(0.22, 0.18, 0.14, 0.18, 0, 2 * PI, 14), C(0.78, 0.82, 0.14, 0.18, 0, 2 * PI, 14)] },
  '.': { w: 0.3, s: [[[0.5, 0.9], [0.5, 1]]] },
  ',': { w: 0.3, s: [[[0.55, 0.88], [0.5, 1.0], [0.36, 1.16]]] },
  '?': { w: 0.66, s: [[...C(0.5, 0.27, 0.34, 0.27, -0.95 * PI, 0.4 * PI, 14), [0.5, 0.66]], [[0.5, 0.9], [0.5, 1]]] },
  '!': { w: 0.3, s: [[[0.5, 0], [0.5, 0.66]], [[0.5, 0.9], [0.5, 1]]] },
  "'": { w: 0.26, s: [[[0.5, 0], [0.48, 0.26]]] },
  '-': { w: 0.5, s: [[[0.12, 0.56], [0.88, 0.56]]] },
  ':': { w: 0.3, s: [[[0.5, 0.32], [0.5, 0.42]], [[0.5, 0.9], [0.5, 1]]] },
  '/': { w: 0.5, s: [[[0.85, 0], [0.15, 1]]] },
  '+': { w: 0.7, s: [[[0.5, 0.25], [0.5, 0.85]], [[0.2, 0.55], [0.8, 0.55]]] },
};
export const BRUSH_CHARS = Object.keys(GLYPHS).join('');
const glyph = (ch) => GLYPHS[ch] || GLYPHS[ch.toUpperCase()] || GLYPHS[' '];
// characters in a title the brush alphabet can't paint (main.js refuses to render a brush title that has any)
export const missingGlyphs = (text) => [...new Set([...text].filter((ch) => !GLYPHS[ch] && !GLYPHS[ch.toUpperCase()]))];
const hsh = (n) => { const s = Math.sin(n * 91.7 + 13.3) * 43758.5; return s - Math.floor(s); };
function glyphMetrics(text, size) { let w = 0; for (const ch of text) w += (glyph(ch).w + 0.12) * size * 0.62; return w - 0.12 * size * 0.62; }
function strokePts(pts, ox, oy, gw, gh) {
  const out = []; for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; if (i) { const [px, py] = pts[i - 1]; const n = Math.max(1, Math.ceil(Math.hypot((x - px) * gw, (y - py) * gh) / 4)); for (let k = 1; k <= n; k++) out.push([ox + (px + (x - px) * k / n) * gw, oy + (py + (y - py) * k / n) * gh]); } else out.push([ox + x * gw, oy + y * gh]); }
  return out;
}
function paintStroke(g, P, W, color, seed, mode) {
  let L = 0; const cum = [0]; for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(L); }
  g.lineCap = 'round'; g.strokeStyle = color;
  for (let i = 1; i < P.length; i++) {
    const a = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]);
    const u = cum[i] / Math.max(1, L);
    const dirW = 0.62 + 0.38 * Math.abs(Math.sin(a - 0.35));          // flat brush held at an angle
    const press = (u < 0.12 ? 1.12 - u : 1) * (u > 0.82 ? 1 - (u - 0.82) * 1.6 : 1);
    const wob = 1 + 0.08 * Math.sin(cum[i] * 0.05 + seed * 3);
    const w = W * dirW * press * wob + (mode === 'edge' ? W * 0.34 : 0);
    g.lineWidth = Math.max(1, w); g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0], P[i][1]); g.stroke();
  }
  if (mode === 'paint') {  // dry-brush bristle streaks along the stroke
    for (let k = 0; k < 4; k++) {
      const off = (hsh(seed * 7 + k) - 0.5) * W * 0.7;
      g.strokeStyle = k % 2 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.18)'; g.lineWidth = Math.max(1, W * 0.06);
      const a0 = 0.15 + hsh(seed + k) * 0.3, a1 = 0.55 + hsh(seed * 3 + k) * 0.4;
      g.beginPath(); let st = false;
      for (let i = 1; i < P.length; i++) { const u = cum[i] / L; if (u < a0 || u > a1) continue; const a = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]); const x = P[i][0] - Math.sin(a) * off, y = P[i][1] + Math.cos(a) * off; if (!st) { g.moveTo(x, y); st = true; } else g.lineTo(x, y); }
      g.stroke();
    }
  }
}
export function brushWord(g, text, x, baseline, size, fill, o = {}) {
  const W = size * (o.weight ?? 0.17), seed0 = o.seed ?? 1;
  const letters = []; let xx = x;
  [...text].forEach((ch, i) => {
    const G = glyph(ch); const sc = 0.93 + hsh(seed0 * 31 + i) * 0.14; const gw = G.w * size * 0.62 * sc, gh = size * 0.74 * sc;
    const oy = baseline - gh + (hsh(seed0 * 17 + i) - 0.5) * size * 0.05;
    letters.push(G.s.map((s, k) => ({ P: strokePts(s, xx + (G.w * size * 0.62 - gw) / 2, oy, gw, gh), seed: seed0 * 13 + i * 5 + k })));
    xx += (G.w + 0.12) * size * 0.62;
  });
  g.save(); g.lineJoin = 'round';
  if (o.shadow !== false) { g.save(); g.translate(size * 0.05, size * 0.06); for (const L of letters) for (const s of L) paintStroke(g, s.P, W, 'rgba(0,0,0,0.45)', s.seed, 'edge'); g.restore(); }
  for (const L of letters) for (const s of L) paintStroke(g, s.P, W, INK, s.seed, 'edge');
  for (const L of letters) for (const s of L) paintStroke(g, s.P, W, fill, s.seed, 'paint');
  g.restore();
  return xx;
}
// a painted brush swipe (the red "key phrase" band): a few overlapping horizontal strokes with ragged ends
function brushSwipe(g, x, y, w, h, color, seed = 2) {
  g.save(); g.lineCap = 'round';
  for (const pass of ['edge', 'paint']) {
    for (let k = 0; k < 4; k++) {
      const yy = y + h * (0.2 + k * 0.2) + (hsh(seed + k) - 0.5) * h * 0.06, x0 = x + (hsh(seed * 2 + k) - 0.5) * h * 0.25, x1 = x + w + (hsh(seed * 5 + k) - 0.5) * h * 0.3;
      const P = []; for (let i = 0; i <= 40; i++) P.push([x0 + (x1 - x0) * i / 40, yy + Math.sin(i * 0.4 + k) * h * 0.015]);
      g.strokeStyle = pass === 'edge' ? INK : color; g.lineWidth = h * 0.34 + (pass === 'edge' ? h * 0.16 : 0);
      g.beginPath(); P.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
    }
  }
  g.globalAlpha = 0.22; g.strokeStyle = '#000'; g.lineWidth = Math.max(1, h * 0.025);
  for (let k = 0; k < 7; k++) { const yy = y + h * (0.12 + k * 0.12); g.beginPath(); g.moveTo(x + w * hsh(seed + k * 3) * 0.3, yy); g.lineTo(x + w * (0.6 + hsh(seed + k * 7) * 0.4), yy + h * 0.01); g.stroke(); }
  g.restore();
}

// title card: plain dark panel behind the lettering, words build in sequence, key phrase on a painted red swipe, speed-line burst +
// flash exit. spec.style: "brush" (default: the hand-lettered brush alphabet above) or "marker" (the Luckiest Guy font on a red box,
// the pre-round-3 look; it has every character the font has).
export function titleCard(g, t, spec) {
  const a = clamp(t / 0.18);
  const brush = (spec.style ?? 'brush') === 'brush';
  g.save();
  const pw = spec.panelW ?? 0.66;
  const gr = g.createLinearGradient(0, 0, W * pw, 0);
  gr.addColorStop(0, `rgba(6,5,9,${0.97 * a})`); gr.addColorStop(0.78, `rgba(6,5,9,${0.94 * a})`); gr.addColorStop(1, 'rgba(6,5,9,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const xs = {};
  for (const w of spec.words) {
    const L = spec.lines[w.line];
    let xx, ww, pad;
    if (brush) {
      pad = w.key ? L.size * 0.2 : 0;
      xx = (xs[w.line] ?? L.x) + pad; ww = glyphMetrics(w.text, L.size);
      xs[w.line] = xx + ww + pad + L.size * 0.3;
    } else {
      g.font = `${L.size}px ${LUCKY}`;
      xx = xs[w.line] ?? L.x; ww = g.measureText(w.text).width;
      xs[w.line] = xx + ww + L.size * 0.24;
    }
    const u = (t - w.at) / 0.16; if (u < 0) continue;
    const s = 1 + 0.7 * (1 - easeOutBack(clamp(u)));
    g.save(); g.globalAlpha = clamp(u * 2);
    g.translate(xx + ww / 2, L.y - L.size * 0.35); g.scale(s, s); g.translate(-(xx + ww / 2), -(L.y - L.size * 0.35));
    if (brush) {
      if (w.key) { brushSwipe(g, xx - pad, L.y - L.size * 0.98, ww + 2 * pad, L.size * 1.24, spec.keyColor || '#d92a20', 3); }
      brushWord(g, w.text, xx, L.y, L.size, w.key ? '#fff7e6' : '#fbf6ea', { seed: w.line * 7 + w.text.length, shadow: !w.key });
    } else {
      if (w.key) {
        const kp = L.size * 0.16;
        g.fillStyle = INK; g.fillRect(xx - kp - 10, L.y - L.size * 0.95 - 10, ww + 2 * kp + 20, L.size * 1.18 + 20);
        g.fillStyle = spec.keyColor || '#d92a20'; g.fillRect(xx - kp, L.y - L.size * 0.95, ww + 2 * kp, L.size * 1.18);
      }
      marker(g, w.text, xx, L.y, L.size, '#ffffff', { edge: w.key ? 0.1 : 0.17 });
    }
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
