// Shared painting helpers for the sets (references/06-sets-and-colour.md).
import * as THREE from 'three';
import { canvasTex, INK } from '../toon.js';
import { Card, drawPerson } from '../chars.js';
import { rng, clamp } from '../util.js';

export const INKC = '#141014';
export const FONT = 'Lucky', HAND = 'Hand';

export function inkText(g, text, x, y, size, fill, o = {}) {
  g.font = `${size}px ${o.font || FONT}`; g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
  if (o.edge !== 0) { g.lineJoin = 'round'; g.lineWidth = o.edge ?? size * 0.16; g.strokeStyle = o.edgeColor || INKC; g.strokeText(text, x, y); }
  g.fillStyle = fill; g.fillText(text, x, y);
}
// shrink a font size until the text fits maxW (keeps labels from running off a sign)
export function fitSize(g, text, size, maxW, font = FONT) {
  let s = size; g.font = `${s}px ${font}`;
  while (s > 8 && g.measureText(text).width > maxW) { s -= 2; g.font = `${s}px ${font}`; }
  return s;
}
// painted surface: vertical light falloff + soft grime blotches + a few dry-brush strokes
export function paint(g, w, h, base, o = {}) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, o.top || base); gr.addColorStop(1, o.bottom || base); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const R = rng(o.seed || 1);
  for (let i = 0; i < (o.blotches ?? 26); i++) { const x = R() * w, y = R() * h, r = 20 + R() * 90; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(0,0,0,${0.05 + R() * 0.07})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.globalAlpha = 0.08; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  for (let i = 0; i < (o.strokes ?? 30); i++) { const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + R() * 60, y + (R() - 0.5) * 6); g.stroke(); }
  g.globalAlpha = 1;
}
export function windowsTex(seed, cols, rows, lit = 0.35, warm = 0.7, w = 512, h = 1024, bg = '#0d1322') {
  const R = rng(seed); const state = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) state.push({ on: R() < lit, col: R() < warm ? ['#ffd98a', '#ffc46a', '#ffe6b0'][Math.floor(R() * 3)] : '#bfe0ff', off: ['#16203a', '#1b2744', '#111a2e'][Math.floor(R() * 3)], blind: R() < 0.3 });
  const ct = canvasTex(w, h, null);
  ct.redraw = (flip = 0) => ct.draw((g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows, RR = rng(seed * 31 + flip);
    state.forEach((s, i) => {
      const r = Math.floor(i / cols), c = i % cols; let on = s.on; if (flip && RR() < 0.04) on = !on;
      g.fillStyle = on ? s.col : s.off; g.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.2, cw * 0.64, rh * 0.6);
      if (on && s.blind) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.2, cw * 0.64, rh * 0.22); }
    });
  }, flip);
  ct.redraw(0); return ct;
}
export function chartTex(seed, kind = 'up') {
  const R = rng(seed); const pts = []; let y = kind === 'up' ? 0.75 : 0.3;
  for (let i = 0; i < 80; i++) { y += (R() - (kind === 'up' ? 0.6 : 0.4)) * 0.1; y = clamp(y, 0.1, 0.9); pts.push(y); }
  const ct = canvasTex(512, 320, null);
  ct.redraw = (off) => ct.draw((g, w, h) => {
    g.fillStyle = '#0b1612'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,200,160,0.15)'; g.lineWidth = 2;
    for (let x = -(off * 20) % 48; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let yy = 0; yy < h; yy += 40) { g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); }
    if (kind === 'list') { for (let i = 0; i < 9; i++) { const k = (i + off) % 9; g.fillStyle = k % 2 ? '#5fe08a' : '#ff6a5a'; g.fillRect(24, 26 + i * 32, 90 + ((k * 37) % 60), 14); g.fillStyle = '#9fb8ae'; g.fillRect(200, 26 + i * 32, 70 + ((k * 53) % 120), 14); } return; }
    g.strokeStyle = kind === 'up' ? '#5ff08e' : '#ff5a4a'; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i < 24; i++) { const v = pts[(i + off) % pts.length]; const x = 10 + i * 22; i ? g.lineTo(x, v * h) : g.moveTo(x, v * h); }
    g.stroke();
  }, off);
  ct.redraw(0); return ct;
}
// flying paper sprites (tumbling sheets); returns update(T)
export function paperField(scene, n, seed, area, o = {}) {
  const tex = canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#f7f2e4'; g.fillRect(4, 4, w - 8, h - 8); g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#9aa4b0'; for (let i = 0; i < 6; i++) g.fillRect(20, 24 + i * 20, 70 + (i % 3) * 10, 6); });
  const R = rng(seed), P = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(o.size || 0.22, (o.size || 0.22) * 1.25), new THREE.MeshBasicMaterial({ map: tex.tex, side: THREE.DoubleSide, toneMapped: false }));
    scene.add(m); m.material.color.setScalar(o.tint ?? 0.85);
    P.push({ m, x: area[0] + R() * (area[1] - area[0]), z: area[4] + R() * (area[5] - area[4]), y0: area[2] + R() * (area[3] - area[2]), ph: R() * 10, sp: 0.25 + R() * 0.35, sw: 0.2 + R() * 0.5 });
  }
  return (T) => { const H = area[3] - area[2] + 1; for (const p of P) { const y = area[3] + 0.5 - (((T * p.sp + p.ph) * 0.6) % H); p.m.position.set(p.x + Math.sin(T * 1.3 + p.ph) * p.sw, y, p.z + Math.cos(T + p.ph) * 0.2); p.m.rotation.set(T * 2 + p.ph, T * 1.4 + p.ph, Math.sin(T + p.ph)); } };
}
// put cast members into a set: list = { castId: { pos: [x, y, z], worldH, rotY } }. Returns the cards it made.
export function placeCast(scene, ctx, list, cards = {}) {
  for (const [id, p] of Object.entries(list || {})) {
    const def = ctx.cast[id];
    if (!def) throw new Error(`set cast: "${id}" is not in the cast (cast ids: ${Object.keys(ctx.cast).join(', ')})`);
    const c = new Card(drawPerson, ctx.design(id), { worldH: p.worldH ?? def.worldH ?? 1.6 });
    c.group.position.set(...(p.pos || [0, 0, 0]));
    if (p.rotY) c.group.rotation.y = p.rotY;
    scene.add(c.group); c.castId = id; cards[id] = c;
  }
  return cards;
}
export { INK };
