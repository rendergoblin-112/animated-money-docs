// Flat, outlined, drawn characters on billboard cards placed in the lit 3D sets (references/04-characters-and-mouths.md).
// Round head 32-42% of height, bean body with no neck, single-stroke arms/legs, 3-4 stroke fingers, dot eyes, arc brows,
// no nose. Every ink line goes through the brush renderer (brush.js): bold (0.066 x head radius), swelling and thinning along
// the stroke, tapered at open ends. Shapes are lit from the scene's nearest lamp (litFill: a hard warm rim crescent on the lamp
// side, a soft cool shadow crescent on the far side, a warm glow); the light comes from the cast data or the shot ("light").
// Characters ACT: every frame is drawn from interpolated pose parameters (arms, hands, lean, squash, head tilt), so there are
// in-betweens, not pose swaps. Hands can grip props (mug, drive, papers, phone), sit flat on a head or chest, point, or make fists.
// Reactions are their own drawings: eye kinds (open, wide, pin, side, half, closed, happy), per-brow raise, mouth scale,
// glasses pop, sparkles, surprise marks.
// Mouths: 6 drawn shapes timed to the sounds of the words: X closed, A small open, E wide/teeth, D open, O round, F teeth-on-lip,
// plus rest mouths (smile, flat, frown, bigSmile, OO scream).
// The designs themselves (colours, hair, glasses, arm weight...) are data: template/cast/default.json.
import * as THREE from 'three';
import { brushify } from './brush.js';

const INK = '#141014';
const hexToRgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgbToHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
export const shade = (c, t) => (t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));

// ------------------------------------------------------------------ primitives
function inkStroke(g, lw) { g.lineWidth = lw; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
// Scene lighting on every drawn shape. L = the nearest practical light as seen from the character: direction (x, y in
// -1..1, +x = toward screen right), colour, rim strength, shadow depth. Layers, all clipped to the shape:
//  1. a hard BRIGHT RIM crescent on the lit edge (the shape shifted away from the light leaves it uncovered),
//  2. a soft cool SHADOW crescent on the far side (a blurred copy of the shape pushed toward the light is lit, the rest is shade),
//  3. a warm glow spilling in from the light side.
function litFill(g, path, base, L, box, lw, o = {}) {
  const [x0, y0, x1, y1] = box; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.max(x1 - x0, y1 - y0) / 2;
  const lx = L.x ?? -0.6, ly = L.y ?? -0.5, ln = Math.hypot(lx, ly) || 1, ux = lx / ln, uy = ly / ln;
  const warm = L.color || '#ffe2b8';
  const lit = shade(mix(base, warm, 0.14), 0.0);
  const rimC = shade(mix(base, warm, 0.7), 0.3);
  const shadowC = shade(mix(base, '#3d2f5c', 0.2), -((L.dark ?? 0.26) + 0.1));
  const rw = r * (o.rimW ?? 0.07) * (0.6 + 0.5 * (L.rim ?? 0.7));
  const so = r * (o.shadow ?? 0.36);
  const big = [x0 - 40, y0 - 40, x1 - x0 + 80, y1 - y0 + 80];
  g.save(); path(); g.clip();
  g.fillStyle = rimC; g.fillRect(...big);
  g.save(); g.translate(-ux * rw, -uy * rw); path(); g.restore(); g.clip();
  g.fillStyle = shadowC; g.fillRect(...big);
  g.save(); g.filter = `blur(${Math.max(2, Math.round(r * 0.045))}px)`; g.translate(ux * so * 0.9, uy * so * 0.9); path(); g.fillStyle = lit; g.fill(); g.restore();
  const gx = cx + ux * r * 0.75, gy = cy + uy * r * 0.75;
  const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r * 1.25);
  gr.addColorStop(0, warm + '40'); gr.addColorStop(0.55, warm + '14'); gr.addColorStop(1, warm + '00');
  g.fillStyle = gr; g.fillRect(...big);
  g.restore();
  if (lw > 0) { path(); inkStroke(g, lw); }
}
const circlePath = (g, x, y, r) => () => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };
function beanPath(g, cx, top, bot, w, o = {}) {
  const h = bot - top, sh = o.shoulder ?? 0.42;
  return () => {
    g.beginPath(); g.moveTo(cx, top);
    g.bezierCurveTo(cx + w * sh, top, cx + w * 0.52, top + h * 0.35, cx + w * 0.5, top + h * 0.72);
    g.bezierCurveTo(cx + w * 0.49, bot, cx + w * 0.22, bot, cx, bot);
    g.bezierCurveTo(cx - w * 0.22, bot, cx - w * 0.49, bot, cx - w * 0.5, top + h * 0.72);
    g.bezierCurveTo(cx - w * 0.52, top + h * 0.35, cx - w * sh, top, cx, top);
    g.closePath();
  };
}
function strokeLine(g, pts, lw, color = INK) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 3) g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  else for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = lw; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
// hands: stroke fingers. open = 4 fanned; point = 1 + thumb; fist = dot; flat = 4 parallel fingers laid along `dir` (on a head/chest);
// grip = 3 curled fingers + thumb wrapping something held at the hand point
function hand(g, e, h, lw, kind = 'open', dir = null) {
  const a = dir ?? Math.atan2(h[1] - e[1], h[0] - e[0]);
  if (kind === 'fist') { g.beginPath(); g.arc(h[0], h[1], lw * 2.2, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); return; }
  if (kind === 'flat') {
    const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
    for (let i = 0; i < 4; i++) { const o = (i - 1.5) * lw * 1.5; const p0 = [h[0] + nx * o, h[1] + ny * o]; g.taper = [0, 0.6]; strokeLine(g, [p0, [p0[0] + Math.cos(a) * lw * 3.8, p0[1] + Math.sin(a) * lw * 3.8]], lw * 1.6); }
    return;
  }
  if (kind === 'grip') {
    for (let i = 0; i < 3; i++) { const o = (i - 1) * lw * 1.6; const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2); const p0 = [h[0] + nx * o, h[1] + ny * o]; const p1 = [p0[0] + Math.cos(a) * lw * 2.4, p0[1] + Math.sin(a) * lw * 2.4]; const p2 = [p1[0] + Math.cos(a + 1.9) * lw * 1.6, p1[1] + Math.sin(a + 1.9) * lw * 1.6]; strokeLine(g, [p0, p1, p2], lw * 1.4); }
    strokeLine(g, [h, [h[0] + Math.cos(a - 1.0) * lw * 2.8, h[1] + Math.sin(a - 1.0) * lw * 2.8]], lw * 1.4);
    return;
  }
  const n = kind === 'point' ? 1 : 4, spread = kind === 'point' ? 0 : 0.55, len = lw * (kind === 'point' ? 6.5 : 5);
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2; const b = a + t * spread; g.taper = [0, 0.7]; strokeLine(g, [h, [h[0] + Math.cos(b) * len, h[1] + Math.sin(b) * len]], lw * 1.75); }
  if (kind === 'point') strokeLine(g, [h, [h[0] + Math.cos(a + 1.3) * len * 0.5, h[1] + Math.sin(a + 1.3) * len * 0.5]], lw * 0.9);
}

// ------------------------------------------------------------------ props held in a hand (drawn under the gripping fingers)
// label: text printed on the prop (the drive's sticker); comes from the pose (arm.label) or the design (propLabel)
function drawProp(g, kind, x, y, r, L, t, lw, label = '') {
  if (kind === 'mug') {
    const w = r * 0.36, h = r * 0.42, mx = x - w * 0.15, my = y - h * 0.1;
    g.beginPath(); g.arc(mx - w * 0.5, my, h * 0.22, Math.PI / 2, Math.PI * 1.5); inkStroke(g, lw * 1.3); // handle on the hand side
    litFill(g, () => { g.beginPath(); g.roundRect(mx - w / 2, my - h / 2, w, h, w * 0.14); }, '#f3efe6', L, [mx - w / 2, my - h / 2, mx + w / 2, my + h / 2], lw);
    g.fillStyle = '#c23b31'; g.fillRect(mx - w / 2 + lw * 0.6, my - h * 0.06, w - lw * 1.2, h * 0.16);
    g.beginPath(); g.ellipse(mx, my - h / 2, w * 0.42, h * 0.07, 0, 0, Math.PI * 2); g.fillStyle = '#4a2a18'; g.fill();
    // steam wisps
    g.save(); g.globalAlpha = 0.55; g.strokeStyle = '#fffaf0'; g.lineWidth = lw * 0.7; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 10; i++) { const yy = my - h / 2 - i * h * 0.12; const xx = mx + (k - 0.5) * w * 0.35 + Math.sin(i * 0.7 + t * 5 + k * 2) * w * 0.12; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    g.restore();
  } else if (kind === 'drive') {
    const w = r * 0.9, h = r * 0.46;
    litFill(g, () => { g.beginPath(); g.roundRect(x - w * 0.2, y - h * 0.5, w, h, r * 0.05); }, '#30343c', L, [x - w * 0.2, y - h * 0.5, x + w * 0.8, y + h * 0.5], lw);
    g.fillStyle = '#ffd34a'; g.fillRect(x - w * 0.05, y - h * 0.3, w * 0.7, h * 0.6);
    if (label) { g.fillStyle = INK; g.font = `${Math.round(h * 0.36)}px Lucky`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x + w * 0.3, y + h * 0.04); }
  } else if (kind === 'papers') {
    for (let i = 0; i < 3; i++) { g.save(); g.translate(x, y); g.rotate(-0.25 + i * 0.12 + Math.sin(t * 6 + i) * 0.05); g.fillStyle = i === 2 ? '#fbf8ef' : '#ece6d6'; g.fillRect(-r * 0.3, -r * 0.4, r * 0.6, r * 0.75); g.strokeStyle = INK; g.lineWidth = lw * 0.8; g.strokeRect(-r * 0.3, -r * 0.4, r * 0.6, r * 0.75); if (i === 2) for (let k = 0; k < 5; k++) { g.fillStyle = '#9aa4b0'; g.fillRect(-r * 0.22, -r * 0.3 + k * r * 0.12, r * 0.44, r * 0.035); } g.restore(); }
  } else if (kind === 'phone') {
    // a desk-phone handset held to the ear (or out in front)
    const w = r * 0.2, h = r * 0.62;
    g.save(); g.translate(x, y); g.rotate(-0.35);
    litFill(g, () => { g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, w * 0.45); }, '#2a2c33', L, [-w / 2, -h / 2, w / 2, h / 2], lw);
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(0, s * h * 0.42, w * 0.75, w * 0.42, 0, 0, Math.PI * 2); g.fillStyle = '#2a2c33'; g.fill(); inkStroke(g, lw * 0.9); }
    g.restore();
  }
}

// ------------------------------------------------------------------ faces
function eyes(g, cx, cy, r, S, D) {
  const ex = r * (D.eyeX ?? 0.3), ey = cy + r * (D.eyeY ?? -0.02), lw = r * 0.062;
  const lk = S.look || [0, 0];
  for (const s of [-1, 1]) {
    const x = cx + s * ex + lk[0] * r * 0.06, y = ey + lk[1] * r * 0.05;
    const kind = S.blink ? 'closed' : (S.eyes || 'open');
    if (kind === 'closed') strokeLine(g, [[x - r * 0.08, y], [x, y + r * 0.04], [x + r * 0.08, y]], lw);
    else if (kind === 'happy') strokeLine(g, [[x - r * 0.08, y + r * 0.03], [x, y - r * 0.05], [x + r * 0.08, y + r * 0.03]], lw);
    else if (kind === 'pin') {
      const sc = S.eyeScale || 1.4;
      g.beginPath(); g.ellipse(x, y - r * 0.02, r * 0.135 * sc, r * 0.16 * sc, 0, 0, Math.PI * 2); g.fillStyle = '#fffdf6'; g.fill(); inkStroke(g, lw);
      g.beginPath(); g.arc(x + lk[0] * r * 0.03, y + lk[1] * r * 0.03, r * 0.032, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
    } else if (kind === 'side') {
      g.beginPath(); g.ellipse(x, y + r * 0.02, r * 0.085, r * 0.05, 0, 0, Math.PI * 2); g.fillStyle = '#fbf8f0'; g.fill(); inkStroke(g, lw * 0.8);
      g.beginPath(); g.arc(x + (lk[0] >= 0 ? 1 : -1) * r * 0.045, y + r * 0.025, r * 0.032, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      strokeLine(g, [[x - r * 0.1, y - r * 0.02], [x + r * 0.1, y - r * 0.02]], lw * 1.1);
    } else if (kind === 'wide') {
      const sc = S.eyeScale || 1;
      g.beginPath(); g.ellipse(x, y, r * 0.12 * sc, r * 0.14 * sc, 0, 0, Math.PI * 2); g.fillStyle = '#fbf8f0'; g.fill(); inkStroke(g, lw * 0.8);
      g.beginPath(); g.ellipse(x + lk[0] * r * 0.035, y + lk[1] * r * 0.035, r * 0.045, r * 0.055, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
    } else if (kind === 'half') {
      g.beginPath(); g.ellipse(x, y + r * 0.02, r * (D.eyeRx ?? 0.05), r * (D.eyeRy ?? 0.068) * 0.55, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      strokeLine(g, [[x - r * 0.09, y - r * 0.01], [x + r * 0.09, y - r * 0.01]], lw);
    } else {
      g.beginPath(); g.ellipse(x, y, r * (D.eyeRx ?? 0.05), r * (D.eyeRy ?? 0.068), 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      g.beginPath(); g.arc(x - r * 0.015, y - r * 0.025, r * 0.014, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
    }
  }
  const by = ey - r * (D.browY ?? 0.24), bw = r * 0.11, br = S.brows || 'neutral';
  const raise = S.browRaise || 0;
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    const tilt = br === 'worried' ? -0.08 : br === 'angry' ? 0.09 : 0;
    const own = s < 0 ? (S.browL ?? 0) : (S.browR ?? 0);   // per-brow raise: one-brow-up deadpan
    const up = (br === 'up' ? -r * 0.09 : br === 'worried' ? -r * 0.05 : 0) - (raise + own) * r * 0.09;
    g.taper = [0.5, 0.75];
    strokeLine(g, [[x - bw, by + up - tilt * r * s * -1], [x, by + up - r * 0.04], [x + bw, by + up + tilt * r * s * -1]], r * (D.browW ?? 0.04) * 1.45);
  }
}
function mouth(g, cx, my, r0, kind, D, sc = 1) {
  const r = r0 * 1.25 * sc, lw = r0 * 0.06, dark = '#4a1518', tongue = '#e0717a', teeth = '#fbf7ee';
  const k = kind || 'X';
  if (k === 'flat') { g.taper = [0.4, 0.4]; strokeLine(g, [[cx - r * 0.17, my + r * 0.01], [cx + r * 0.17, my + r * 0.01]], lw); }
  else if (k === 'bigSmile') {
    const w = r * 0.24, h = r * 0.22;
    const p = () => { g.beginPath(); g.moveTo(cx - w, my - r * 0.03); g.quadraticCurveTo(cx, my + r * 0.02, cx + w, my - r * 0.03); g.bezierCurveTo(cx + w * 0.9, my + h, cx - w * 0.9, my + h, cx - w, my - r * 0.03); g.closePath(); };
    p(); g.fillStyle = dark; g.fill(); g.save(); p(); g.clip(); g.fillStyle = teeth; g.fillRect(cx - w, my - r * 0.06, 2 * w, r * 0.08);
    g.beginPath(); g.ellipse(cx, my + h * 0.85, w * 0.55, h * 0.38, 0, 0, Math.PI * 2); g.fillStyle = tongue; g.fill(); g.restore(); p(); inkStroke(g, lw);
  } else if (k === 'X' || k === 'smile') strokeLine(g, [[cx - r * 0.13, my - r * 0.01], [cx, my + r * (k === 'smile' ? 0.09 : 0.035)], [cx + r * 0.13, my - r * 0.01]], lw);
  else if (k === 'frown') strokeLine(g, [[cx - r * 0.12, my + r * 0.04], [cx, my - r * 0.03], [cx + r * 0.12, my + r * 0.04]], lw);
  else if (k === 'A') {
    g.beginPath(); g.ellipse(cx, my + r * 0.02, r * 0.1, r * 0.07, 0, 0, Math.PI * 2); g.fillStyle = dark; g.fill();
    g.save(); g.clip(); g.beginPath(); g.ellipse(cx, my + r * 0.09, r * 0.07, r * 0.04, 0, 0, Math.PI * 2); g.fillStyle = tongue; g.fill(); g.restore();
    g.beginPath(); g.ellipse(cx, my + r * 0.02, r * 0.1, r * 0.07, 0, 0, Math.PI * 2); inkStroke(g, lw);
  } else if (k === 'E') {
    const w = r * 0.19, h = r * 0.085;
    const p = () => { g.beginPath(); g.moveTo(cx - w, my - h * 0.4); g.quadraticCurveTo(cx, my - h * 0.9, cx + w, my - h * 0.4); g.quadraticCurveTo(cx + w * 0.9, my + h * 1.3, cx, my + h * 1.3); g.quadraticCurveTo(cx - w * 0.9, my + h * 1.3, cx - w, my - h * 0.4); g.closePath(); };
    p(); g.fillStyle = dark; g.fill(); g.save(); p(); g.clip(); g.fillStyle = teeth; g.fillRect(cx - w, my - h, 2 * w, h * 1.05); g.fillRect(cx - w, my + h * 0.95, 2 * w, h); g.restore(); p(); inkStroke(g, lw);
  } else if (k === 'F') {
    const w = r * 0.15, h = r * 0.07;
    g.beginPath(); g.roundRect(cx - w, my - h, 2 * w, h * 1.6, h * 0.6); g.fillStyle = dark; g.fill();
    g.fillStyle = teeth; g.fillRect(cx - w * 0.9, my - h, w * 1.8, h * 0.9); inkStroke(g, lw * 0.6);
    strokeLine(g, [[cx - w * 1.05, my + h * 0.55], [cx, my + h * 0.2], [cx + w * 1.05, my + h * 0.55]], lw); // lower lip tucked under the teeth
  } else if (k === 'D') {
    const w = r * 0.2, h = r * 0.24;
    const p = () => { g.beginPath(); g.moveTo(cx - w, my - r * 0.03); g.quadraticCurveTo(cx, my - r * 0.06, cx + w, my - r * 0.03); g.bezierCurveTo(cx + w * 0.95, my + h, cx - w * 0.95, my + h, cx - w, my - r * 0.03); g.closePath(); };
    p(); g.fillStyle = dark; g.fill(); g.save(); p(); g.clip();
    g.fillStyle = teeth; g.fillRect(cx - w, my - r * 0.08, 2 * w, r * 0.085);
    g.beginPath(); g.ellipse(cx, my + h * 0.82, w * 0.62, h * 0.4, 0, 0, Math.PI * 2); g.fillStyle = tongue; g.fill(); g.restore(); p(); inkStroke(g, lw);
  } else if (k === 'O' || k === 'OO') {
    const s = k === 'OO' ? 1.6 : 1;
    g.beginPath(); g.ellipse(cx, my + r * 0.04, r * 0.085 * s, r * 0.12 * s, 0, 0, Math.PI * 2); g.fillStyle = dark; g.fill(); inkStroke(g, lw);
    g.save(); g.beginPath(); g.ellipse(cx, my + r * 0.04, r * 0.085 * s, r * 0.12 * s, 0, 0, Math.PI * 2); g.clip(); g.beginPath(); g.ellipse(cx, my + r * 0.14 * s, r * 0.06 * s, r * 0.04 * s, 0, 0, Math.PI * 2); g.fillStyle = tongue; g.fill(); g.restore();
  }
}

// background extras (traders, passers-by): a design generated from an index. front = facing camera with legs and a tie.
export function bgPerson(i, front = false) {
  const shirts = ['#7a8fb8', '#b85c4a', '#e0d6c2', '#5d7f6a', '#9a7ab0', '#c9a24a', '#d8d2c4', '#4f6d9a'], hairs = ['#2b201b', '#6b4a2f', '#1d1a1a', '#a98c5c', '#3d2b1f', '#8a8a8a'], skins = ['#f0c4a0', '#c98e66', '#8d5a3b', '#f3d0b0', '#e2a77f', '#b97a55'];
  return { headR: 205, headY: 560, skin: skins[i % 6], body: { top: 705, bot: 1330, w: 430, color: shirts[i % 8], style: front ? 'tie' : 'shirt' }, hair: { style: front ? (i % 3 === 2 ? 'bald' : 'short') : (i % 3 === 2 ? 'bald' : 'back'), color: hairs[i % 6] }, back: !front, legs: front ? { top: 1300, foot: 1488, shoe: '#2a2220' } : null, eyeX: 0.3, browY: 0.26 };
}

function drawHairBack(g, cx, cy, r, H, skin) {
  if (H.style === 'back') for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.98, cy + r * 0.12, r * 0.14, r * 0.2, 0, 0, Math.PI * 2); g.fillStyle = shade(skin || '#e8b48c', -0.1); g.fill(); inkStroke(g, r * 0.04); }
  if (H.style === 'bob') {
    g.beginPath(); g.moveTo(cx - r * 1.1, cy + r * 0.62);
    g.bezierCurveTo(cx - r * 1.22, cy - r * 0.6, cx - r * 0.8, cy - r * 1.18, cx, cy - r * 1.12);
    g.bezierCurveTo(cx + r * 0.8, cy - r * 1.18, cx + r * 1.22, cy - r * 0.6, cx + r * 1.1, cy + r * 0.62);
    g.quadraticCurveTo(cx, cy + r * 0.74, cx - r * 1.1, cy + r * 0.62); g.closePath();
    g.fillStyle = H.color; g.fill(); inkStroke(g, r * 0.062);
  }
}
function drawHairFront(g, cx, cy, r, H, L) {
  const lw = r * 0.062;
  if (H.style === 'bob') {
    g.save(); g.beginPath(); g.arc(cx, cy, r * 1.04, 0, Math.PI * 2); g.clip();
    const p = () => { g.beginPath(); g.moveTo(cx - r * 1.1, cy - r * 0.05); g.lineTo(cx - r * 0.95, cy - r * 0.34); g.quadraticCurveTo(cx - r * 0.45, cy - r * 0.42, cx - r * 0.1, cy - r * 0.36); g.quadraticCurveTo(cx + r * 0.5, cy - r * 0.46, cx + r * 0.98, cy - r * 0.3); g.lineTo(cx + r * 1.1, cy - r * 0.05); g.lineTo(cx + r * 1.1, cy - r * 1.2); g.lineTo(cx - r * 1.1, cy - r * 1.2); g.closePath(); };
    p(); g.fillStyle = H.color; g.fill();
    g.globalAlpha = 0.25; g.beginPath(); g.ellipse(cx + (L.x ?? -0.6) * r * 0.45, cy - r * 0.72, r * 0.32, r * 0.1, (L.x ?? -0.6) * 0.4, 0, Math.PI * 2); g.fillStyle = L.color || '#ffe2b8'; g.fill(); g.globalAlpha = 1;
    p(); inkStroke(g, lw); g.restore();
    g.beginPath(); g.arc(cx, cy, r * 1.04, Math.PI * 1.03, Math.PI * 1.97); inkStroke(g, lw);
    strokeLine(g, [[cx - r * 0.1, cy - r * 0.37], [cx - r * 0.05, cy - r * 0.7], [cx + r * 0.05, cy - r * 1.0]], lw * 0.7);
  } else if (H.style === 'bald') {
    g.globalAlpha = 0.35; g.beginPath(); g.ellipse(cx + (L.x ?? -0.6) * r * 0.35, cy - r * 0.62, r * 0.22, r * 0.09, -0.3, 0, Math.PI * 2); g.fillStyle = '#fff6e6'; g.fill(); g.globalAlpha = 1;
    for (const s of [-1, 1]) {
      const p = () => { g.beginPath(); g.moveTo(cx + s * r * 0.86, cy - r * 0.42); g.quadraticCurveTo(cx + s * r * 1.16, cy - r * 0.32, cx + s * r * 1.08, cy - r * 0.08); g.quadraticCurveTo(cx + s * r * 1.18, cy + r * 0.08, cx + s * r * 1.0, cy + r * 0.24); g.quadraticCurveTo(cx + s * r * 0.98, cy, cx + s * r * 0.92, cy - r * 0.2); g.closePath(); };
      p(); g.fillStyle = H.color; g.fill(); inkStroke(g, lw * 0.9);
    }
  } else if (H.style === 'short') {
    g.save(); g.beginPath(); g.arc(cx, cy, r * 1.03, 0, Math.PI * 2); g.clip();
    const p = () => { g.beginPath(); g.moveTo(cx - r * 1.1, cy - r * 0.1); g.quadraticCurveTo(cx - r * 0.6, cy - r * 0.55, cx, cy - r * 0.5); g.quadraticCurveTo(cx + r * 0.6, cy - r * 0.6, cx + r * 1.1, cy - r * 0.15); g.lineTo(cx + r * 1.1, cy - r * 1.2); g.lineTo(cx - r * 1.1, cy - r * 1.2); g.closePath(); };
    p(); g.fillStyle = H.color; g.fill(); p(); inkStroke(g, lw); g.restore();
    g.beginPath(); g.arc(cx, cy, r * 1.03, Math.PI * 1.05, Math.PI * 1.95); inkStroke(g, lw);
  } else if (H.style === 'back') {
    const p = () => {
      g.beginPath(); g.moveTo(cx - r * 1.02, cy + r * 0.05);
      g.bezierCurveTo(cx - r * 1.08, cy - r * 0.75, cx - r * 0.55, cy - r * 1.08, cx - r * 0.05, cy - r * 1.06);
      g.lineTo(cx + r * 0.06, cy - r * 1.22); g.lineTo(cx + r * 0.14, cy - r * 1.05); g.lineTo(cx + r * 0.26, cy - r * 1.16); g.lineTo(cx + r * 0.3, cy - r * 1.02);
      g.bezierCurveTo(cx + r * 0.75, cy - r * 0.95, cx + r * 1.1, cy - r * 0.6, cx + r * 1.02, cy + r * 0.05);
      const n = 7; for (let i = 0; i <= n; i++) { const x = cx + r * 1.0 - i * (2 * r / n); const y = cy + r * (0.8 + (i % 2 ? 0.1 : 0) - Math.pow((i / n - 0.5) * 2, 2) * 0.55); g.lineTo(x, y); }
      g.closePath();
    };
    const gr = g.createLinearGradient(cx + (L.x ?? -0.6) * r, cy - r, cx - (L.x ?? -0.6) * r * 0.5, cy + r);
    gr.addColorStop(0, mix(H.color, L.color || '#ffe2b8', 0.45)); gr.addColorStop(0.35, H.color); gr.addColorStop(1, shade(H.color, -0.35));
    p(); g.fillStyle = gr; g.fill(); p(); inkStroke(g, lw);
    g.save(); p(); g.clip();
    for (let i = -2; i <= 2; i++) strokeLine(g, [[cx + i * r * 0.2, cy - r * 0.85], [cx + i * r * 0.27, cy - r * 0.25], [cx + i * r * 0.33, cy + r * 0.3]], lw * 0.4, shade(H.color, -0.5));
    g.restore();
  }
}

// person: def (a cast design) + state S (interpolated pose)
export function drawPerson(g, D, S) {
  const L = S.light || {};
  const cx = 512 + (S.dx || 0), r = D.headR, lw = r * 0.066; // bold brush line
  const B = D.body, bob = S.bob || 0, t = S.t || 0;
  const sx = S.sx || 1, sy = S.sy || 1;
  g.save();
  // lean pivots at the feet; squash/stretch scales about the feet
  g.translate(cx, 1500); g.rotate(S.lean || 0); g.scale(sx, sy); g.translate(-cx, -1500);
  // legs (walk cycle when S.walk is a phase)
  if (D.legs && !S.noLegs) {
    for (const s of [-1, 1]) {
      const x = cx + s * B.w * 0.16;
      const sw = S.walk != null ? Math.sin(S.walk * Math.PI * 2 + (s > 0 ? Math.PI : 0)) : 0;
      const fx = x + sw * 70, fy = D.legs.foot - 6 - Math.max(0, -Math.cos(S.walk * Math.PI * 2 + (s > 0 ? Math.PI : 0))) * (S.walk != null ? 30 : 0);
      g.taper = [0, 0.2]; strokeLine(g, [[x, D.legs.top], [fx, fy]], lw * 1.6);
      g.beginPath(); g.ellipse(fx + s * 18, fy + 2, r * 0.17, r * 0.075, 0, 0, Math.PI * 2); g.fillStyle = D.legs.shoe; g.fill(); inkStroke(g, lw * 0.8);
    }
  }
  const top = B.top + bob, bot = B.bot;
  const shL = [cx - B.w * 0.36, top + (bot - top) * 0.2 + (S.shrug || 0) * -40], shR = [cx + B.w * 0.36, top + (bot - top) * 0.2 + (S.shrug || 0) * -40];
  const front = S.armsFront;
  // arms are thick brush strokes (full at the shoulder, thinning toward the wrist), weight S.armW (per shot) or D.armW (design);
  // fingers are bold tapered strokes
  const hu = r * 0.052;
  const fullArm = (A, sh) => {
    if (!A) return;
    g.taper = [0.0, 0.42]; strokeLine(g, [sh, A.e, A.h], lw * (S.armW ?? D.armW ?? 2.3));
    if (A.prop) { drawProp(g, A.prop, A.h[0], A.h[1], r, L, t, lw, A.label ?? D.propLabel ?? ''); hand(g, A.e, A.h, hu, 'grip', A.dir ?? null); }
    else hand(g, A.e, A.h, hu, A.hand || 'open', A.dir ?? null);
  };
  if (S.armBehind === 'L') fullArm(S.armL, shL);
  if (S.armBehind === 'R') fullArm(S.armR, shR);
  const bp = beanPath(g, cx, top, bot, B.w);
  litFill(g, bp, B.color, L, [cx - B.w / 2, top, cx + B.w / 2, bot], lw);
  g.save(); bp(); g.clip();
  if (B.style === 'cardigan') {
    g.beginPath(); g.moveTo(cx - r * 0.42, top - 4); g.lineTo(cx, top + r * 0.55); g.lineTo(cx + r * 0.42, top - 4); g.closePath(); g.fillStyle = '#f6f1e6'; g.fill(); inkStroke(g, lw * 0.8);
    g.beginPath(); g.moveTo(cx - r * 0.06, top + r * 0.5); g.lineTo(cx - r * 0.06, bot); g.moveTo(cx + r * 0.06, top + r * 0.5); g.lineTo(cx + r * 0.06, bot); inkStroke(g, lw * 0.6);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(cx + r * 0.16, top + r * 0.8 + i * r * 0.5, r * 0.035, 0, Math.PI * 2); g.fillStyle = shade(B.color, -0.45); g.fill(); }
    g.beginPath(); g.roundRect(cx - r * 0.75, top + r * 1.6, r * 0.42, r * 0.3, 8); g.fillStyle = shade(B.color, -0.12); g.fill(); inkStroke(g, lw * 0.5); // pocket
  } else if (B.style === 'braces') {
    g.beginPath(); g.moveTo(cx - r * 0.36, top); g.lineTo(cx, top + r * 0.42); g.lineTo(cx + r * 0.36, top); g.closePath(); g.fillStyle = shade(B.color, 0.55); g.fill(); inkStroke(g, lw * 0.7);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * r * 0.52, top + 6); g.lineTo(cx + s * r * 0.4, bot); g.lineWidth = r * 0.11; g.strokeStyle = '#b8322c'; g.stroke(); g.lineWidth = lw * 0.5; g.strokeStyle = INK; g.stroke(); }
    // tie
    g.beginPath(); g.moveTo(cx - r * 0.08, top + r * 0.38); g.lineTo(cx + r * 0.08, top + r * 0.38); g.lineTo(cx + r * 0.12, top + r * 1.5); g.lineTo(cx, top + r * 1.7); g.lineTo(cx - r * 0.12, top + r * 1.5); g.closePath(); g.fillStyle = '#2b3550'; g.fill(); inkStroke(g, lw * 0.6);
    g.fillStyle = '#2a1e18'; g.fillRect(cx - B.w, bot - (bot - top) * 0.2, B.w * 2, r * 0.12);
    // pen in the shirt pocket
    g.fillStyle = '#e8e2d4'; g.fillRect(cx + r * 0.55, top + r * 0.7, r * 0.34, r * 0.3); g.strokeStyle = INK; g.lineWidth = lw * 0.5; g.strokeRect(cx + r * 0.55, top + r * 0.7, r * 0.34, r * 0.3);
    g.fillStyle = '#1d4a9a'; g.fillRect(cx + r * 0.62, top + r * 0.55, r * 0.05, r * 0.25);
  } else if (B.style === 'hoodie') {
    g.beginPath(); g.ellipse(cx, top + r * 0.12, r * 0.62, r * 0.3, 0, 0, Math.PI * 2); g.fillStyle = shade(B.color, -0.12); g.fill(); inkStroke(g, lw * 0.8);
    strokeLine(g, [[cx, top + r * 0.42], [cx, bot]], lw * 0.5, shade(B.color, -0.4));
  } else if (B.style === 'tie') {
    g.beginPath(); g.moveTo(cx - r * 0.3, top); g.lineTo(cx, top + r * 0.35); g.lineTo(cx + r * 0.3, top); g.fillStyle = '#ffffff'; g.fill();
    g.beginPath(); g.moveTo(cx - r * 0.07, top + r * 0.3); g.lineTo(cx + r * 0.07, top + r * 0.3); g.lineTo(cx + r * 0.1, top + r * 1.3); g.lineTo(cx, top + r * 1.45); g.lineTo(cx - r * 0.1, top + r * 1.3); g.closePath(); g.fillStyle = '#a8322c'; g.fill(); inkStroke(g, lw * 0.6);
  } else if (B.style === 'suit') {
    // dark jacket seen from behind: a centre vent and a collar band
    g.fillStyle = shade(B.color, -0.18); g.fillRect(cx - B.w, top, B.w * 2, r * 0.22);
    strokeLine(g, [[cx, bot - (bot - top) * 0.35], [cx, bot]], lw * 0.6, shade(B.color, -0.45));
  }
  g.restore();
  if (!front && S.armBehind !== 'L') fullArm(S.armL, shL);
  // head
  const hx = cx + (S.headDx || 0), hy = D.headY + bob + (S.headDy || 0);
  g.save(); g.translate(hx, hy); g.rotate(S.tilt || 0); g.scale(S.headS || 1, S.headS || 1); g.translate(-hx, -hy);
  drawHairBack(g, hx, hy, r, D.hair, D.skin);
  litFill(g, circlePath(g, hx, hy, r), D.skin, L, [hx - r, hy - r, hx + r, hy + r], lw, { rimW: 0.11 });
  if (!D.back) {
    for (const s of [-1, 1]) { g.globalAlpha = 0.2 + (S.blush || 0) * 0.4; g.beginPath(); g.ellipse(hx + s * r * 0.52, hy + r * 0.28, r * 0.13, r * 0.08, 0, 0, Math.PI * 2); g.fillStyle = '#e0605a'; g.fill(); g.globalAlpha = 1; }
    eyes(g, hx, hy, r, S, D);
    if (D.glasses) {
      for (const s of [-1, 1]) {
        const x = hx + s * r * (D.eyeX ?? 0.3) + (S.look?.[0] || 0) * r * 0.03, y = hy - r * 0.02 - (S.glassesUp || 0) * r * 0.2;
        g.beginPath(); g.arc(x, y, r * 0.25, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
        g.lineWidth = r * 0.085; g.strokeStyle = INK; g.stroke(); g.lineWidth = r * 0.055; g.strokeStyle = D.glasses; g.stroke();
        g.save(); g.globalAlpha = 0.6; strokeLine(g, [[x - r * 0.12, y - r * 0.08], [x - r * 0.05, y - r * 0.15]], r * 0.025, '#ffffff'); g.restore();
      }
      { const gy = -(S.glassesUp || 0) * r * 0.2; strokeLine(g, [[hx - r * 0.06, hy - r * 0.05 + gy], [hx, hy - r * 0.08 + gy], [hx + r * 0.06, hy - r * 0.05 + gy]], r * 0.05, D.glasses); }
    }
    if (D.moustache) {
      mouth(g, hx, hy + r * 0.54, r, S.mouth, D, S.mouthScale || 1);
      const lift = ['A', 'E', 'D', 'O', 'F'].includes(S.mouth) ? -r * 0.03 : 0;
      const p = () => { g.beginPath(); g.moveTo(hx, hy + r * 0.24 + lift); g.bezierCurveTo(hx + r * 0.28, hy + r * 0.14 + lift, hx + r * 0.5, hy + r * 0.3, hx + r * 0.46, hy + r * 0.5); g.quadraticCurveTo(hx + r * 0.3, hy + r * 0.42 + lift, hx + r * 0.2, hy + r * 0.47 + lift); g.quadraticCurveTo(hx + r * 0.08, hy + r * 0.4 + lift, hx, hy + r * 0.44 + lift); g.quadraticCurveTo(hx - r * 0.08, hy + r * 0.4 + lift, hx - r * 0.2, hy + r * 0.47 + lift); g.quadraticCurveTo(hx - r * 0.3, hy + r * 0.42 + lift, hx - r * 0.46, hy + r * 0.5); g.bezierCurveTo(hx - r * 0.5, hy + r * 0.3, hx - r * 0.28, hy + r * 0.14 + lift, hx, hy + r * 0.24 + lift); g.closePath(); };
      litFill(g, p, D.moustache, L, [hx - r * 0.5, hy + r * 0.14, hx + r * 0.5, hy + r * 0.5], lw);
      for (const s of [-1, 1]) strokeLine(g, [[hx + s * r * 0.12, hy + r * 0.3 + lift], [hx + s * r * 0.2, hy + r * 0.4 + lift]], lw * 0.5, shade(D.moustache, -0.35));
    } else mouth(g, hx, hy + r * 0.44, r, S.mouth, D, S.mouthScale || 1);
    if (S.sweat) { const sy2 = (S.sweat > 1 ? 0 : 0) + ((t * 1.5) % 1) * r * 0.25; const p = () => { g.beginPath(); g.moveTo(hx + r * 0.78, hy - r * 0.55 + sy2); g.quadraticCurveTo(hx + r * 0.92, hy - r * 0.3 + sy2, hx + r * 0.84, hy - r * 0.22 + sy2); g.arc(hx + r * 0.78, hy - r * 0.26 + sy2, r * 0.07, 0, Math.PI, false); g.closePath(); }; p(); g.fillStyle = '#9fd6ff'; g.fill(); inkStroke(g, lw * 0.6); }
    if (S.shock > 0.05) { for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + side * (0.95 + i * 0.32); g.taper = [0.25, 0.85]; strokeLine(g, [[hx + Math.cos(a) * r * 1.42, hy + Math.sin(a) * r * 1.42], [hx + Math.cos(a) * r * (1.56 + S.shock * 0.3), hy + Math.sin(a) * r * (1.56 + S.shock * 0.3)]], lw * 1.6); } } // surprise marks beside the head, clear of the hair
    if (S.sparkle) { for (const [ax, ay, k] of [[0.95, -0.75, 1], [1.15, -0.35, 0.6], [-1.05, -0.6, 0.7]]) { const sx2 = hx + ax * r, sy2 = hy + ay * r, q = r * 0.12 * k * S.sparkle; g.beginPath(); g.moveTo(sx2, sy2 - q); g.quadraticCurveTo(sx2, sy2, sx2 + q, sy2); g.quadraticCurveTo(sx2, sy2, sx2, sy2 + q); g.quadraticCurveTo(sx2, sy2, sx2 - q, sy2); g.quadraticCurveTo(sx2, sy2, sx2, sy2 - q); g.fillStyle = '#fff4c2'; g.fill(); inkStroke(g, lw * 0.6); } }
  } else if (S.shock) {
    // seen from behind: shock lines still read above the head
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35; strokeLine(g, [[hx + Math.cos(a) * r * 1.2, hy + Math.sin(a) * r * 1.2], [hx + Math.cos(a) * r * (1.38 + S.shock * 0.12), hy + Math.sin(a) * r * (1.38 + S.shock * 0.12)]], lw * 1.1); }
  }
  drawHairFront(g, hx, hy, r, D.hair, L);
  if (S.hairUp > 0.05 && D.hair.style === 'bob') { for (const k of [-1, 0, 1]) { const bx = hx + k * r * 0.28, by = hy - r * 1.08; const p = () => { g.beginPath(); g.moveTo(bx - r * 0.07, by + r * 0.08); g.quadraticCurveTo(bx + k * r * 0.12, by - r * 0.3 * S.hairUp, bx + k * r * 0.2 + r * 0.03, by - r * 0.36 * S.hairUp); g.quadraticCurveTo(bx + k * r * 0.05, by - r * 0.12 * S.hairUp, bx + r * 0.07, by + r * 0.08); g.closePath(); }; p(); g.fillStyle = D.hair.color; g.fill(); inkStroke(g, lw * 0.8); } }
  g.restore();
  // front arms (hands on the head, a mug raised to the mouth) go over the head; the right arm always comes last
  if (front && S.armBehind !== 'L') fullArm(S.armL, shL);
  if (S.armBehind !== 'R') fullArm(S.armR, shR);
  g.restore();
}

// ------------------------------------------------------------------ "the old code": an old beige computer creature (S.label = sticker)
export function drawPeg(g, _def, S) {
  const L = S.light || { x: 0.6, color: '#ff5a4a', rim: 0.5 };
  const lw = 9, t = S.t || 0;
  const cx = 512, base = 960;
  const sq = S.squash || 0; // + squashes, - stretches
  g.save(); g.translate(cx + (S.shake || 0) * 8, base - (S.jump || 0)); g.scale(1 + sq * 0.12, 1 - sq * 0.12); g.translate(-cx, -base);
  const w = 470, h = 380, x0 = cx - w / 2, y0 = base - 120 - h;
  for (const s of [-1, 1]) { const kick = S.arms === 'pump' ? Math.sin(t * 28 + (s > 0 ? Math.PI : 0)) * 26 : 0; strokeLine(g, [[cx + s * 120, base - 125], [cx + s * 130 + kick, base - 12]], lw * 1.3); g.beginPath(); g.ellipse(cx + s * 146 + kick, base - 10, 38, 16, 0, 0, Math.PI * 2); g.fillStyle = '#2a2420'; g.fill(); inkStroke(g, lw * 0.8); }
  const sh = [[x0 + 10, y0 + h * 0.62], [x0 + w - 10, y0 + h * 0.62]];
  const armA = S.arms || 'rest';
  const pumpV = Math.sin(t * 30);
  const hands = armA === 'up' ? [[x0 - 120, y0 - 60 + Math.sin(t * 20) * 20], [x0 + w + 120, y0 - 60 - Math.sin(t * 20) * 20]] : armA === 'pump' ? [[x0 - 140, y0 + h * 0.25 + pumpV * 90], [x0 + w + 140, y0 + h * 0.25 - pumpV * 90]] : [[x0 - 50, y0 + h + 30 + Math.sin(t * 2) * 6], [x0 + w + 50, y0 + h + 30 - Math.sin(t * 2) * 6]];
  for (let i = 0; i < 2; i++) { const e = [(sh[i][0] + hands[i][0]) / 2 + (i ? 34 : -34), (sh[i][1] + hands[i][1]) / 2 + 24]; strokeLine(g, [sh[i], e, hands[i]], lw * 1.25); hand(g, e, hands[i], lw, armA === 'rest' ? 'open' : 'open'); }
  const d = 70;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + d, y0 - d * 0.7); g.lineTo(x0 + w + d, y0 - d * 0.7); g.lineTo(x0 + w, y0); g.closePath(); g.fillStyle = '#e9e1c8'; g.fill(); inkStroke(g, lw);
  g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w + d, y0 - d * 0.7); g.lineTo(x0 + w + d, y0 + h - d * 0.7); g.lineTo(x0 + w, y0 + h); g.closePath(); g.fillStyle = '#a99f84'; g.fill(); inkStroke(g, lw);
  litFill(g, () => { g.beginPath(); g.roundRect(x0, y0, w, h, 22); }, '#d6ccb0', L, [x0, y0, x0 + w, y0 + h], lw);
  // dust, scuffs, a peeling sticker
  g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, 22); g.clip();
  g.globalAlpha = 0.22; g.fillStyle = '#8a7a50'; g.fillRect(x0, y0 + h * 0.82, w, h * 0.18);
  g.globalAlpha = 0.35; g.fillStyle = '#9a8c66'; for (let i = 0; i < 40; i++) { const a = (i * 97) % w, b = (i * 53) % h; g.fillRect(x0 + a, y0 + b, 3, 3); }
  g.globalAlpha = 1; g.restore();
  g.save(); g.translate(x0 + w - 110, y0 + h - 70); g.rotate(-0.12); g.fillStyle = '#f0e6b0'; g.fillRect(-40, -18, 84, 36); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(-40, -18, 84, 36); g.fillStyle = '#5a4a2a'; g.font = '22px Lucky'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.label ?? 'v1', 2, 2); g.restore();
  const sx = x0 + 45, sy = y0 + 40, sw = w - 90, shh = h * 0.56;
  g.beginPath(); g.roundRect(sx - 14, sy - 14, sw + 28, shh + 28, 26); g.fillStyle = '#bfb496'; g.fill(); inkStroke(g, lw * 0.8);
  const awake = S.awake || 0;
  const flick = awake ? (0.85 + 0.15 * Math.sin(t * 47)) : (0.8 + 0.2 * Math.sin(t * 3));
  g.beginPath(); g.roundRect(sx, sy, sw, shh, 30); g.fillStyle = awake ? mix('#1a0d0d', '#6a1010', awake * flick) : mix('#0e1812', '#16281e', flick); g.fill(); inkStroke(g, lw * 0.8);
  const fc = awake ? '#ff5444' : '#6fdc8c', fx = sx + sw / 2, fy = sy + shh / 2;
  g.save(); g.shadowColor = fc; g.shadowBlur = awake ? 34 : 14; g.strokeStyle = fc; g.fillStyle = fc; g.lineCap = 'round'; g.lineWidth = 12;
  if (!awake) {
    const br = Math.sin(t * 2.2);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(fx + s * 70, fy - 14, 28, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    g.beginPath(); g.ellipse(fx, fy + 40, 14 + br * 4, 16 + br * 6, 0, 0, Math.PI * 2); g.lineWidth = 8; g.stroke();
  } else {
    const ew = 34 + 12 * awake * (S.eyePop || 1);
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + s * 72, fy - 18, ew, ew * 1.1, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a0606'; g.beginPath(); g.arc(fx + s * 66 + (S.lookX || 0) * 12, fy - 14, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = fc; }
    g.lineWidth = 12; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(fx + s * 115, fy - 78); g.lineTo(fx + s * 35, fy - 52); g.stroke(); }
    g.beginPath(); g.moveTo(fx - 85, fy + 42); for (let i = 0; i <= 8; i++) g.lineTo(fx - 85 + i * 21.25, fy + (i % 2 ? 62 : 42)); g.lineWidth = 8; g.stroke();
    g.beginPath(); g.moveTo(fx - 90, fy + 38); g.quadraticCurveTo(fx, fy + 100, fx + 90, fy + 38); g.stroke();
  }
  g.restore();
  g.save(); g.beginPath(); g.roundRect(sx, sy, sw, shh, 30); g.clip(); g.globalAlpha = 0.13; g.fillStyle = '#000'; const so = (t * 60) % 8; for (let y = sy - 8 + so; y < sy + shh; y += 8) g.fillRect(sx, y, sw, 3); g.globalAlpha = 0.18; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sx + sw * 0.28, sy + shh * 0.22, sw * 0.22, shh * 0.1, -0.3, 0, Math.PI * 2); g.fill(); g.restore();
  const fy0 = y0 + h * 0.8;
  g.beginPath(); g.roundRect(x0 + 60, fy0, 180, 22, 6); g.fillStyle = '#3a342a'; g.fill(); inkStroke(g, lw * 0.6);
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x0 + 290 + i * 24, fy0 - 6); g.lineTo(x0 + 290 + i * 24, fy0 + 34); inkStroke(g, lw * 0.5); }
  const led = awake ? (Math.sin(t * 25) > 0 ? '#ff3a2a' : '#7a1a10') : (Math.sin(t * 3) > 0 ? '#3fbf6a' : '#1f5a32');
  g.beginPath(); g.arc(x0 + w - 44, fy0 + 12, 13, 0, Math.PI * 2); g.fillStyle = led; g.fill(); inkStroke(g, lw * 0.5);
  // the "peg": a plug sticking out of the top, wobbling
  const px = x0 + w * 0.62 + d * 0.5, py = y0 - d * 0.35, wob = Math.sin(t * (awake ? 18 : 2)) * (awake ? 0.25 : 0.06);
  g.save(); g.translate(px, py); g.rotate(wob); g.translate(-px, -py);
  strokeLine(g, [[px, py], [px - 10, py - 70], [px + 20, py - 130]], lw * 1.6, '#2c2c30');
  g.save(); g.translate(px + 20, py - 150); g.rotate(0.25);
  g.beginPath(); g.roundRect(-34, -30, 68, 60, 10); g.fillStyle = '#2c2c30'; g.fill(); inkStroke(g, lw * 0.7);
  for (const s of [-1, 1]) { g.fillStyle = '#d8c46a'; g.fillRect(s * 16 - 5, -62, 10, 34); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(s * 16 - 5, -62, 10, 34); }
  if (awake) { g.strokeStyle = '#ffe36a'; g.lineWidth = 6; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.5 + Math.sin(t * 40 + i) * 0.2; g.beginPath(); g.moveTo(Math.cos(a) * 70, -40 + Math.sin(a) * 70); g.lineTo(Math.cos(a + 0.2) * 95, -40 + Math.sin(a + 0.2) * 95); g.lineTo(Math.cos(a - 0.1) * 120, -40 + Math.sin(a - 0.1) * 120); g.stroke(); } }
  g.restore(); g.restore();
  if (!awake) {
    g.save(); g.globalAlpha = 0.75; g.strokeStyle = '#e8e8e8'; g.lineWidth = 3;
    const ox = x0 + 6, oy = y0 + 6;
    for (let i = 0; i < 6; i++) { const a = (i / 5) * Math.PI / 2; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a) * 150, oy + Math.sin(a) * 150); g.stroke(); }
    for (let k = 1; k <= 4; k++) { g.beginPath(); for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2, rr = k * 34 + (i % 2) * 6; const X = ox + Math.cos(a) * rr, Y = oy + Math.sin(a) * rr; i ? g.quadraticCurveTo(ox + Math.cos(a - 0.15) * rr * 0.85, oy + Math.sin(a - 0.15) * rr * 0.85, X, Y) : g.moveTo(X, Y); } g.stroke(); }
    g.restore();
    // floating Zzz
    for (let k = 0; k < 3; k++) { const u = ((t * 0.55 + k / 3) % 1); g.save(); g.globalAlpha = Math.sin(u * Math.PI); g.font = `${Math.round(50 + u * 40)}px Lucky`; g.lineWidth = 8; g.strokeStyle = INK; g.fillStyle = '#e8fff0'; g.textAlign = 'center'; const zx = x0 + w + 40 + u * 130 + Math.sin(u * 8) * 20, zy = y0 - 40 - u * 260; g.strokeText('Z', zx, zy); g.fillText('Z', zx, zy); g.restore(); }
  }
  g.restore();
}

// ------------------------------------------------------------------ card: a character drawn into a canvas texture on a plane
export class Card {
  constructor(drawFn, def, { worldH = 1.5, cw = 1024, ch = 1536, footY = 1500 } = {}) {
    this.drawFn = drawFn; this.def = def;
    this.canvas = document.createElement('canvas'); this.canvas.width = cw; this.canvas.height = ch;
    this.g = brushify(this.canvas.getContext('2d'));
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const worldW = worldH * cw / ch;
    const geo = new THREE.PlaneGeometry(worldW, worldH); geo.translate(0, worldH / 2 - worldH * (1 - footY / ch), 0);
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: false, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, toneMapped: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.group = new THREE.Group(); this.group.add(this.mesh);
    const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d');
    const gr = sg.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(worldW * 0.75, worldW * 0.22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.004;
    this.group.add(this.shadow);
    this.key = null;
    this.headY = def && def.headY ? worldH * (footY - def.headY) / ch : worldH * 0.55;
  }
  set(state, tint = 1) {
    const key = JSON.stringify(state);
    if (key !== this.key) { this.key = key; this.g.clearRect(0, 0, this.canvas.width, this.canvas.height); this.drawFn(this.g, this.def, state); this.tex.needsUpdate = true; }
    this.mat.color.setScalar(tint);
  }
  face(camera) {
    const p = new THREE.Vector3(); this.group.getWorldPosition(p);
    this.mesh.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) - this.group.rotation.y;
  }
}
