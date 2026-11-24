// THE DEN: the recurring skit office (night window, bookshelf, framed charts, plant, whiteboard, filing cabinet, desk lamp).
// Dot and Gus sit here by default; their side monitor shows one short reaction line.
// cfg: { monitorText: "97 NEW", monitorColor: "#ff5a4a", cast: { dot: {...}, gus: {...} } }
import * as THREE from 'three';
import { mat, basic, box, cyl, plane, canvasTex, glow, bokehDisc, pointLight } from '../toon.js';
import { rng } from '../util.js';
import { FONT, HAND, paint, placeCast, fitSize } from './common.js';

export function makeDen(cfg = {}, ctx) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x120c0a, 6, 16);
  const wallTex = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#5a3b2a', { top: '#62412e', bottom: '#46301f', seed: 31 }); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 8; i++) g.fillRect(i * 64 + 30, 0, 6, h); g.fillStyle = '#3a2618'; g.fillRect(0, h * 0.66, w, 14); }, { repeat: [6, 2] });
  scene.add(plane(12, 4, mat(0xffffff, { map: wallTex.tex }), [0, 2, -2.6]));
  const floorT = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#3a2a20', { seed: 4 }); g.strokeStyle = '#2a1d16'; g.lineWidth = 4; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, { repeat: [6, 5] });
  scene.add(plane(12, 10, mat(0xffffff, { map: floorT.tex }), [0, 0, -1], [-Math.PI / 2, 0, 0]));
  const night = canvasTex(1024, 512, null);
  const R0 = rng(4); const bld = []; for (let i = 0; i < 18; i++) { const x = R0() * 1024, bw = 60 + R0() * 120, bh = 160 + R0() * 300; const win = []; for (let y = 512 - bh + 14; y < 512; y += 26) for (let xx = x + 8; xx < x + bw - 8; xx += 20) if (R0() < 0.4) win.push([xx, y, R0() < 0.7, R0() * 10]); bld.push({ x, bw, bh, win }); }
  night.redraw = (T) => night.draw((g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0c1430'); gr.addColorStop(1, '#22305a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (const b of bld) { g.fillStyle = '#121a33'; g.fillRect(b.x, h - b.bh, b.bw, b.bh); for (const [x, y, warm, ph] of b.win) { if (Math.sin(T * 0.8 + ph * 3) < -0.92) continue; g.fillStyle = warm ? '#ffd98a' : '#bfe0ff'; g.fillRect(x, y, 10, 12); } } }, Math.floor(T * 4));
  night.redraw(0);
  const winM = basic(0xffffff, { map: night.tex }); winM.color.setScalar(0.9);
  scene.add(plane(3.4, 1.7, winM, [0.2, 1.75, -2.58]));
  for (const x of [-1.5, 0.2, 1.9]) scene.add(box(0.08, 1.8, 0.1, 0x2a1b14, [x, 0.85, -2.55], { outline: 0.012 }));
  for (const y of [0.88, 2.62]) scene.add(box(3.5, 0.08, 0.12, 0x2a1b14, [0.2, y, -2.55], { outline: 0.012 }));
  const R = rng(13); const bok = [];
  for (let i = 0; i < 22; i++) { const b = bokehDisc(R() < 0.7 ? 0xffc77a : 0x9fd0ff, 0.12 + R() * 0.2, [-1.4 + R() * 3.2, 1.0 + R() * 1.5, -2.5], 0.18 + R() * 0.25); scene.add(b); bok.push([b, R() * 10, b.material.opacity]); }
  // bookshelf, framed pictures, plant, whiteboard, coat stand, filing cabinet
  scene.add(box(1.1, 2.2, 0.4, 0x3d281c, [2.9, 0, -2.3], { outline: 0.015 }));
  for (const y of [0.45, 1.0, 1.55]) { scene.add(box(1.06, 0.03, 0.38, 0x2e1e14, [2.9, y - 0.03, -2.3], { outline: 0.006 })); for (let i = 0; i < 7; i++) { const b = box(0.1, 0.36 + (i % 3) * 0.06, 0.28, [0xa33c32, 0x2f5a8a, 0xd9a03a, 0x3a7a4a, 0x6a4a8a][(i + Math.round(y * 3)) % 5], [2.5 + i * 0.12, y, -2.25], { outline: 0.008 }); if (i === 6) b.rotation.z = -0.25; scene.add(b); } }
  for (const [x, y, c] of [[-2.3, 1.9, '#2f9a5a'], [-2.95, 1.55, '#c0392b']]) { const fr = canvasTex(256, 200, (g, w, h) => { g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.lineWidth = 8; g.beginPath(); g.moveTo(20, 150); g.lineTo(90, 110); g.lineTo(150, 130); g.lineTo(230, 40); g.stroke(); }); scene.add(box(0.6, 0.48, 0.04, 0x6a4a2a, [x, y - 0.24, -2.56], { outline: 0.008 })); scene.add(plane(0.52, 0.4, basic(0xcccccc, { map: fr.tex }), [x, y, -2.53])); }
  scene.add(cyl(0.22, 0.17, 0.45, 0x8a5a3a, [-2.4, 0, -2.0], { outline: 0.012 }));
  const plant = new THREE.Group(); plant.position.set(-2.4, 0.45, -2.0); scene.add(plant);
  for (let k = 0; k < 9; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0x3f7a44)); lf.position.set(Math.cos(k * 0.8) * 0.18, 0.15 + (k % 3) * 0.22, Math.sin(k * 0.8) * 0.12); lf.scale.set(0.7, 1.6, 0.5); lf.rotation.z = Math.cos(k * 0.8) * 0.5; plant.add(lf); }
  const wb = canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a4a9a'; g.lineWidth = 6; g.beginPath(); g.moveTo(40, 260); g.lineTo(140, 180); g.lineTo(220, 220); g.lineTo(330, 90); g.lineTo(470, 60); g.stroke(); g.fillStyle = '#c0392b'; g.font = `44px ${HAND}`; g.fillText('?!', 400, 200); g.strokeStyle = '#c0392b'; g.beginPath(); g.arc(330, 90, 30, 0, Math.PI * 2); g.stroke(); });
  scene.add(box(1.1, 0.72, 0.03, 0xb0b4bc, [-2.75, 0.78, -2.55], { outline: 0.01 })); scene.add(plane(1.0, 0.62, basic(0xdddddd, { map: wb.tex }), [-2.75, 1.14, -2.53]));
  scene.add(box(0.5, 1.1, 0.5, 0x6a7078, [3.5, 0, -1.4], { outline: 0.012 }));
  for (const y of [0.3, 0.65, 0.95]) scene.add(box(0.2, 0.03, 0.02, 0xc0c4cc, [3.5, y, -1.14], { outline: 0.004 }));
  const cards = placeCast(scene, ctx, cfg.cast ?? { dot: { pos: [-0.55, 0, -0.55], worldH: 1.62 }, gus: { pos: [0.62, 0, -0.75], worldH: 1.78 } });
  const DY = 0.5;
  scene.add(box(3.4, DY, 0.9, 0x6b4a33, [0, 0, 0.35], { outline: 0.016 }));
  scene.add(box(3.46, 0.05, 0.95, 0x7a5639, [0, DY, 0.35], { outline: 0.012 }));
  scene.add(cyl(0.08, 0.1, 0.035, 0x2b2b2b, [0.05, DY + 0.05, -0.02], { outline: 0.008 }));
  scene.add(cyl(0.012, 0.012, 0.22, 0xb8962e, [0.05, DY + 0.05, -0.02], { outline: 0.006 }));
  scene.add(box(0.26, 0.07, 0.11, mat(0x2d6a44, { emissive: 0x1a3a26, ei: 0.4 }), [0.05, DY + 0.25, 0.0], { outline: 0.012 }));
  const lampGlow = glow(0xffc070, 0.35, [0.05, DY + 0.22, 0.06], 0.6); scene.add(lampGlow);
  const lampL = pointLight(0xffb060, 7, 5, [0.05, DY + 0.22, -0.1]); scene.add(lampL);
  { const pool = canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 4, 128, 128, 128); r.addColorStop(0, 'rgba(255,214,140,0.85)'); r.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }); const pm = new THREE.MeshBasicMaterial({ map: pool.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); scene.add(plane(1.8, 0.9, pm, [0.05, DY + 0.031, 0.32], [-Math.PI / 2, 0, 0])); }
  const monTex = canvasTex(640, 400, null);
  const mon = new THREE.Group();
  mon.add(box(0.95, 0.6, 0.06, 0x16171c, [0, 0, 0], { outline: 0.012 }));
  mon.add(plane(0.88, 0.52, basic(0xffffff, { map: monTex.tex }), [0, 0.3, 0.032]));
  mon.position.set(1.35, DY + 0.16, 0.42); mon.rotation.y = -2.5; scene.add(mon);
  scene.add(box(0.08, 0.16, 0.08, 0x16171c, [1.35, DY + 0.02, 0.42], { outline: 0.008 }));
  scene.add(pointLight(0x7fe8c0, 4, 4, [1.0, 0.95, 0.1]));
  scene.add(box(0.5, 0.012, 0.35, 0xf2ece0, [-0.4, DY + 0.025, 0.45], { outline: 0.005 }));
  scene.add(box(0.48, 0.012, 0.33, 0xe8e0d0, [-0.35, DY + 0.037, 0.43], { outline: 0.005 }));
  scene.add(box(0.3, 0.05, 0.2, 0x2a2a30, [-1.1, DY + 0.05, 0.4], { outline: 0.006 })); // phone
  scene.add(cyl(0.05, 0.05, 0.12, 0x3a5a8a, [-1.4, DY + 0.025, 0.35], { outline: 0.006 }));
  scene.add(new THREE.HemisphereLight(0x8a90b8, 0x2a1810, 0.28));
  scene.add(pointLight(0xffd4a0, 2, 8, [0, 2.6, 1.6]));
  for (const x of [-1.9, 2.15]) { scene.add(box(0.14, 0.2, 0.08, mat(0x8a6a2a, { emissive: 0xffc070, ei: 0.6 }), [x, 1.7, -2.5], { outline: 0.01 })); scene.add(glow(0xffc070, 0.7, [x, 1.85, -2.45], 0.55)); scene.add(pointLight(0xffb060, 2.5, 3, [x, 1.9, -2.3])); }
  const monText = cfg.monitorText ?? '';
  return {
    scene, cards,
    update(st) {
      const T = st.T;
      night.redraw(T);
      for (const [b, ph, o] of bok) b.material.opacity = o * (0.75 + 0.25 * Math.sin(T * 1.3 + ph));
      const fl = 1 + 0.04 * Math.sin(T * 17) * Math.sin(T * 3.1); lampL.intensity = 7 * fl; lampGlow.material.opacity = 0.6 * fl;
      plant.rotation.z = Math.sin(T * 0.8) * 0.02;
      monTex.draw((g, w, h) => { g.fillStyle = '#0a1612'; g.fillRect(0, 0, w, h); g.font = `64px ${FONT}`; if (g.measureText(monText).width > w - 40) g.font = `${fitSize(g, monText, 64, w - 40)}px ${FONT}`; g.fillStyle = cfg.monitorColor || '#ff5a4a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(monText, w / 2, h / 2); }, 1);
    },
  };
}
