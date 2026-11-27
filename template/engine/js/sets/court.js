// COURT: a panelled courtroom with nobody in it (so no real judge or lawyer is drawn): the bench with an empty high-backed chair,
// a gavel on its block, a green banker's lamp, scales of justice that can tip, a round seal on the wall, tall windows with light
// shafts and dust, and the claim papers on counsel's table in front.
// cfg: { seal: "COURT NAME" (ring text on the wall seal), document: { title: "CLAIM", amount: "¥41.5 BILLION", lines: 7 },
//        scales: { left: "EXCHANGE", right: "", tilt: 0.32 }   tilt > 0 tips the LEFT pan down (more weight/blame on the left) }
// shot cues: gavelAt: t (gavel bangs, the block jumps)   tiltAt: t (scales tip to cfg.scales.tilt with an overshoot)
//            tilted: true (already tipped)   paperAt: t (the claim papers slap down onto the table)
// Dressed with brass pendants, a law-book shelf, plants, counsel's chairs and a clerk's lamp (dress.js; "dress": false = plain).
// foregrounds (shot "fg"): courtFgTitle (a brass pendant by the lens + a lectern with books, for the bench shot), courtFgTable (jug, books)
import * as THREE from 'three';
import { mat, basic, box, cyl, plane, canvasTex, glow, pointLight, INK } from '../toon.js';
import { rng, clamp } from '../util.js';
import { INKC, FONT, HAND, paint, fitSize, inkText, placeCast } from './common.js';
import { dress } from './dress.js';

export function makeCourt(cfg = {}, ctx) {
  const SCL = { left: '', right: '', tilt: 0.3, ...(cfg.scales || {}) };
  const DOC = { title: 'CLAIM', amount: '', lines: 7, ...(cfg.document || {}) };
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x120c08, 6, 15);
  // wood panelling: vertical boards with inset panels and a dado rail
  const panel = canvasTex(512, 512, (g, w, h) => {
    paint(g, w, h, '#5e3a24', { top: '#6a4329', bottom: '#46291a', seed: 41 });
    for (let i = 0; i < 2; i++) { const x = 24 + i * 256; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 40, 208, 260); g.strokeStyle = '#2e1a10'; g.lineWidth = 6; g.strokeRect(x, 40, 208, 260); g.fillStyle = 'rgba(255,220,170,0.06)'; g.fillRect(x + 8, 48, 192, 18); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 340, 208, 140); g.strokeRect(x, 340, 208, 140); }
    g.fillStyle = '#2e1a10'; g.fillRect(0, 316, w, 10); g.fillRect(0, 0, 8, h);
  }, { repeat: [6, 1] });
  scene.add(plane(14, 4.4, mat(0xffffff, { map: panel.tex }), [0, 2.2, -3.4]));
  scene.add(plane(10, 4.4, mat(0xffffff, { map: panel.tex }), [-4.6, 2.2, 0.5], [0, Math.PI / 2, 0]));
  scene.add(plane(10, 4.4, mat(0xffffff, { map: panel.tex }), [4.6, 2.2, 0.5], [0, -Math.PI / 2, 0]));
  const floorT = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#3b2418', { seed: 43 }); g.strokeStyle = '#26150d'; g.lineWidth = 5; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); for (let k = 0; k < 3; k++) { const x = ((i * 157 + k * 199) % 512); g.beginPath(); g.moveTo(x, i * 64); g.lineTo(x, i * 64 + 64); g.stroke(); } } }, { repeat: [5, 5] });
  scene.add(plane(14, 12, mat(0xffffff, { map: floorT.tex }), [0, 0, -0.5], [-Math.PI / 2, 0, 0]));
  scene.add(plane(14, 12, mat(0x1a100a), [0, 4.4, -0.5], [Math.PI / 2, 0, 0]));
  // the seal: a ring of text around a simple balance icon (no real emblem)
  const seal = canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.beginPath(); g.arc(256, 256, 240, 0, Math.PI * 2); g.fillStyle = '#c9a24a'; g.fill(); g.lineWidth = 14; g.strokeStyle = INKC; g.stroke();
    g.beginPath(); g.arc(256, 256, 170, 0, Math.PI * 2); g.fillStyle = '#2a3a5a'; g.fill(); g.lineWidth = 10; g.stroke();
    const txt = (cfg.seal || '').toUpperCase(); g.font = `40px ${FONT}`; g.fillStyle = INKC; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = txt.length, span = Math.min(Math.PI * 1.6, n * 0.17);
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 - span / 2 + (i + 0.5) * span / n; g.save(); g.translate(256 + Math.cos(a) * 205, 256 + Math.sin(a) * 205); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore(); }
    g.strokeStyle = '#e8d7a6'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(256, 150); g.lineTo(256, 340); g.moveTo(170, 190); g.lineTo(342, 190); g.moveTo(210, 345); g.lineTo(302, 345); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256 + s * 86, 190); g.lineTo(256 + s * 60, 260); g.moveTo(256 + s * 86, 190); g.lineTo(256 + s * 112, 260); g.stroke(); g.beginPath(); g.arc(256 + s * 86, 262, 30, 0, Math.PI); g.stroke(); }
  });
  scene.add(plane(1.3, 1.3, new THREE.MeshBasicMaterial({ map: seal.tex, transparent: true, toneMapped: false }), [0, 3.15, -3.37]));
  // tall windows on the left wall with cool light shafts
  const win = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fc4e8'); gr.addColorStop(1, '#5a7aa8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2a1a10'; g.fillRect(w / 2 - 6, 0, 12, h); g.fillRect(0, h / 2 - 6, w, 12); g.lineWidth = 16; g.strokeStyle = '#2a1a10'; g.strokeRect(0, 0, w, h); });
  for (const z of [-2.2, 0.3]) scene.add(plane(1.0, 2.0, basic(0xcfe0f0, { map: win.tex }), [-4.58, 2.4, z], [0, Math.PI / 2, 0]));
  const shaftT = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(190,220,255,0.35)'); gr.addColorStop(1, 'rgba(190,220,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const shafts = [];
  for (const z of [-2.2, 0.3]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 4.2), new THREE.MeshBasicMaterial({ map: shaftT.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide })); m.position.set(-3.2, 1.6, z); m.rotation.set(0, Math.PI / 2, 0.75); scene.add(m); shafts.push(m); }
  // dais + bench (front panel with insets) + empty high-backed chair
  scene.add(box(5.2, 0.3, 2.0, 0x4a2c1a, [0, 0, -2.4], { outline: 0.016 }));
  const benchFront = canvasTex(1024, 256, (g, w, h) => { paint(g, w, h, '#6b4128', { top: '#774a2e', bottom: '#4e2e1c', seed: 47 }); for (let i = 0; i < 4; i++) { const x = 40 + i * 248; g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, 40, 200, 170); g.strokeStyle = '#2e1a10'; g.lineWidth = 8; g.strokeRect(x, 40, 200, 170); } });
  scene.add(box(3.6, 1.15, 0.9, mat(0x6b4128), [0, 0.3, -2.1], { outline: 0.016 }));
  scene.add(plane(3.6, 1.15, mat(0xffffff, { map: benchFront.tex }), [0, 0.875, -1.645]));
  scene.add(box(3.8, 0.07, 1.0, 0x7a4c2e, [0, 1.45, -2.1], { outline: 0.012 }));
  scene.add(box(0.9, 1.9, 0.18, 0x5a1e1e, [0, 0.3, -2.75], { outline: 0.014 }));
  scene.add(cyl(0.45, 0.45, 0.18, 0x5a1e1e, [0, 2.2, -2.75], { outline: 0.014 }));
  // gavel + sound block, banker's lamp
  const block = cyl(0.11, 0.12, 0.05, 0x3a2214, [-0.6, 1.52, -1.95], { outline: 0.008 }); scene.add(block);
  const gavel = new THREE.Group(); gavel.position.set(-0.86, 1.55, -1.95); scene.add(gavel);
  const handle = cyl(0.016, 0.016, 0.34, 0x4a2a16, [0, 0, 0], { outline: 0.006 }); handle.rotation.z = Math.PI / 2; handle.position.set(0.17, 0.02, 0); gavel.add(handle);
  const head = cyl(0.045, 0.045, 0.16, 0x5a3420, [0, 0, 0], { outline: 0.008 }); head.position.set(0.34, -0.06, 0); gavel.add(head);
  scene.add(box(0.36, 0.1, 0.16, mat(0x2d6a44, { emissive: 0x1a3a26, ei: 0.4 }), [1.35, 1.75, -2.25], { outline: 0.01 }));
  scene.add(cyl(0.012, 0.012, 0.25, 0xb8962e, [1.35, 1.5, -2.25], { outline: 0.005 }));
  scene.add(glow(0xffc070, 0.6, [1.35, 1.72, -2.15], 0.6));
  scene.add(pointLight(0xffb060, 5, 4, [1.3, 1.7, -1.9]));
  // scales of justice on the bench (beam + two pans on strings), labels on the pans
  const scales = new THREE.Group(); scales.position.set(0.75, 1.48, -2.0); scene.add(scales);
  scales.add(cyl(0.12, 0.14, 0.04, 0xc9a24a, [0, 0, 0], { outline: 0.006 }));
  scales.add(cyl(0.015, 0.015, 0.62, 0xc9a24a, [0, 0, 0], { outline: 0.005 }));
  const beam = new THREE.Group(); beam.position.set(0, 0.62, 0); scales.add(beam);
  beam.add(box(0.6, 0.025, 0.025, mat(0xd9b25a, { metal: 0.3, rough: 0.4 }), [0, -0.012, 0], { outline: 0.005 }));
  const pans = [];
  const labelTex = (txt) => canvasTex(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); if (!txt) return; g.fillStyle = '#f2ece0'; g.fillRect(4, 8, w - 8, h - 16); g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(4, 8, w - 8, h - 16); const s = fitSize(g, txt, 48, w - 30); g.font = `${s}px ${FONT}`; g.fillStyle = '#3a2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 2); });
  for (const [s, txt] of [[-1, SCL.left], [1, SCL.right]]) {
    const pg = new THREE.Group(); pg.position.set(s * 0.29, 0, 0); beam.add(pg);
    for (const k of [-1, 1]) { const st = cyl(0.003, 0.003, 0.3, 0x9a8040, [0, 0, 0], { outline: 0 }); st.position.set(k * 0.07, -0.15, 0); st.rotation.z = -k * 0.24; pg.add(st); }
    pg.add(cyl(0.11, 0.07, 0.03, 0xd9b25a, [0, -0.33, 0], { outline: 0.006 }));
    if (txt) { const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.165), new THREE.MeshBasicMaterial({ map: labelTex(txt).tex, transparent: true, toneMapped: false })); lm.position.set(0, -0.46, 0.12); pg.add(lm); }
    pans.push(pg);
  }
  // counsel's table in front with the claim papers (on a tilted clipboard so the camera can read them) and a pen
  scene.add(box(2.6, 0.74, 0.9, 0x5c3a24, [0, 0, 0.6], { outline: 0.015 }));
  scene.add(box(2.66, 0.05, 0.95, 0x6d4a34, [0, 0.74, 0.6], { outline: 0.012 }));
  const doc = canvasTex(420, 560, (g, w, h) => {
    g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h); g.strokeStyle = INKC; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    inkText(g, DOC.title, w / 2, 70, 64, '#2a2a2a', { edge: 0 });
    if (DOC.amount) { const s = fitSize(g, DOC.amount, 66, w - 40); g.fillStyle = '#c0392b'; g.fillRect(20, 120, w - 40, 96); inkText(g, DOC.amount, w / 2, 170, s, '#ffffff', { edge: 0 }); }
    g.fillStyle = '#9aa4b0'; for (let i = 0; i < DOC.lines; i++) g.fillRect(40, 250 + i * 38, 260 + ((i * 53) % 80), 12);
  });
  const docG = new THREE.Group(); docG.position.set(-0.35, 0.79, 0.62); scene.add(docG);
  docG.add(box(0.46, 0.012, 0.6, 0x7a5a32, [0, -0.006, 0], { outline: 0.004, center: true }));
  const docM = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshBasicMaterial({ map: doc.tex, toneMapped: false })); docM.material.color.setScalar(0.72); docM.rotation.x = -Math.PI / 2; docM.position.y = 0.004; docG.add(docM);
  docG.rotation.x = 1.05;
  scene.add(box(0.5, 0.012, 0.36, 0xece6d6, [0.55, 0.77, 0.55], { outline: 0.004 }));
  const pen = cyl(0.008, 0.008, 0.16, 0x1d4a9a, [0, 0, 0], { outline: 0.003 }); pen.rotation.set(Math.PI / 2, 0, 0.6); pen.position.set(0.5, 0.79, 0.6); scene.add(pen);
  // dust in the window light
  const R = rng(51); const motes = [];
  for (let i = 0; i < 36; i++) { const m = glow(0xe8f2ff, 0.02 + R() * 0.02, [-3.6 + R() * 2.4, 0.4 + R() * 2.6, -2.6 + R() * 3.4], 0.45); scene.add(m); motes.push([m, R() * 10, m.position.clone()]); }
  scene.add(new THREE.HemisphereLight(0x8a9ac8, 0x2a1810, 0.6));
  const key = new THREE.DirectionalLight(0xbfd8ff, 0.9); key.position.set(-6, 5, 1); scene.add(key);
  scene.add(pointLight(0xffd4a0, 10, 9, [0, 3.6, 0.5]));
  scene.add(pointLight(0xffc890, 1.6, 3, [-0.3, 1.6, 1.1])); // a reading light over counsel's table
  for (const x of [-2.6, 2.6]) { scene.add(box(0.16, 0.24, 0.08, mat(0x8a6a2a, { emissive: 0xffc070, ei: 0.6 }), [x, 2.3, -3.35], { outline: 0.01 })); scene.add(glow(0xffc070, 0.8, [x, 2.45, -3.3], 0.5)); scene.add(pointLight(0xffb060, 3, 4, [x, 2.4, -3.0])); }
  const cards = placeCast(scene, ctx, cfg.cast ?? {});
  const DR = dress('court', scene, cfg);
  return {
    scene, setFg: DR.set, fgGroups: Object.keys(DR.groups), cards,
    update(st) {
      const T = st.T, cue = st.cue || {};
      DR.update(T);
      // gavel: lift, then bang down onto the block
      let ga = 0.15, jump = 0;
      if (cue.gavelAt != null) { const u = T - cue.gavelAt; if (u > -0.25 && u < 0) ga = 0.15 + 0.9 * (1 + u / 0.25); else if (u >= 0 && u < 0.08) { ga = -0.25; jump = 0.02 * (1 - u / 0.08); } else if (u >= 0.08 && u < 0.4) ga = -0.25 + 0.4 * ((u - 0.08) / 0.32); }
      gavel.rotation.z = ga; block.position.y = 1.52 + jump;
      // scales: level, then tip with an overshoot; a slow sway all the time
      let tilt = cue.tilted ? SCL.tilt : 0;
      if (cue.tiltAt != null) { const u = clamp((T - cue.tiltAt) / 0.7); const e = 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2); tilt = SCL.tilt * (T < cue.tiltAt ? 0 : e); }
      beam.rotation.z = tilt + Math.sin(T * 1.6) * 0.015;
      for (const p of pans) p.rotation.z = -beam.rotation.z;
      // the claim papers slap down
      if (cue.paperAt != null) { const u = clamp((T - cue.paperAt) / 0.18); docG.position.y = 0.79 + (1 - u) * 0.25; docG.rotation.x = 1.05 - (1 - u) * 0.4; }
      for (const [m, s, p0] of motes) m.position.set(p0.x + Math.sin(T * 0.3 + s) * 0.08, p0.y + Math.sin(T * 0.25 + s * 2) * 0.1, p0.z + Math.cos(T * 0.2 + s) * 0.06);
      for (const [i, m] of shafts.entries()) m.material.opacity = 0.85 + 0.15 * Math.sin(T * 0.7 + i * 2);
    },
    anchors: { gavel: [-0.6, 1.55, -1.95], scales: [0.75, 2.1, -2.0] },
  };
}
