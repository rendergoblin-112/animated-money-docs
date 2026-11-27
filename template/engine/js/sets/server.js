// SERVER ROOM: a row of racks with status lamps (one of them the odd one out), a second row behind, cable trays, hazard tape,
// a workbench with a lamp, a laptop cart, an extinguisher, an exit sign. Sparks and a red alarm on the odd rack.
// The aisle is dressed (dress.js): caged work lamps, a second workbench, boxes, a ladder, a cable spool, a floor work-light.
// cfg: { racks: { count: 8, label: "SMARS", missed: 7 }, cast: { tech: { pos, worldH } }, dress?: false }
// shot cues: greenAt: [t, step]  lamps go green one by one (all but the missed rack)
//            allGreen: true      staleBlink: t (missed rack blinks amber)   alarmAt: t / alarm: true (missed rack red)   sparks: true
// foregrounds (shot "fg"): srvFgTech (crash cart, laptop, lamp, hanging cable), srvFgAisle (cart, boxes, floor cable),
//                           srvFgStale (hanging cables in front of the missed rack)
import * as THREE from 'three';
import { mat, basic, box, cyl, plane, canvasTex, glow, pointLight } from '../toon.js';
import { rng } from '../util.js';
import { INKC, FONT, paint, placeCast, fitSize } from './common.js';
import { dress } from './dress.js';

export function makeServer(cfg = {}, ctx) {
  const RK = { count: 8, label: '', missed: 7, ...(cfg.racks || {}) };
  const mx = -3.5 + RK.missed * 1.0; // x of the missed rack
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0f1a, 0.06);
  const tiles = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#3a4352', { top: '#3d4757', bottom: '#333b48', seed: 2, strokes: 6 }); g.strokeStyle = '#1b2029'; g.lineWidth = 10; g.strokeRect(0, 0, w, h); g.fillStyle = '#2c3340'; for (let y = 60; y < h - 40; y += 36) for (let x = 60; x < w - 40; x += 36) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); } }, { repeat: [20, 16] });
  scene.add(plane(20, 16, mat(0xffffff, { map: tiles.tex, rough: 0.6 }), [0, 0, -2], [-Math.PI / 2, 0, 0]));
  // hazard tape line on the floor in front of the racks
  const haz = canvasTex(512, 32, (g, w, h) => { for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#e8c22a' : '#1a1a1a'; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 - 16, h); g.fill(); } });
  scene.add(plane(9, 0.12, basic(0xffffff, { map: haz.tex }), [0, 0.006, -1.9], [-Math.PI / 2, 0, 0]));
  const wall = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#1c2431', { top: '#222b3a', bottom: '#151b26', seed: 8 }); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 4; i++) g.fillRect(i * 128 + 6, 6, 4, h - 12); }, { repeat: [10, 2] });
  scene.add(plane(24, 3.4, mat(0xffffff, { map: wall.tex }), [0, 1.7, -5.6]));
  scene.add(plane(16, 3.4, mat(0xffffff, { map: wall.tex }), [-7, 1.7, -2], [0, Math.PI / 2, 0]));
  scene.add(plane(24, 16, mat(0x10141b), [0, 3.3, -2], [Math.PI / 2, 0, 0]));
  for (const z of [-4.2, -1.6, 1.0]) { scene.add(box(9, 0.05, 0.22, mat(0x6a7a8c, { emissive: 0x9fbce0, ei: 0.16 }), [0, 3.2, z], { outline: 0.01 })); scene.add(pointLight(0x9fc4ff, 5, 9, [0, 3.0, z])); }
  // overhead cable tray with cable bundles
  scene.add(box(9, 0.04, 0.5, 0x2a2f38, [0, 2.75, -3.0], { outline: 0.01 }));
  for (const s of [-1, 1]) scene.add(box(9, 0.14, 0.03, 0x2a2f38, [0, 2.75, -3.0 + s * 0.25], { outline: 0.006 }));
  for (let i = 0; i < 5; i++) scene.add(box(9, 0.07, 0.07, [0x2f6fd0, 0xd0a02f, 0xc03a3a, 0x3aa060, 0x7a7a8a][i], [0, 2.82, -3.18 + i * 0.09], { outline: 0.006 }));
  // rack face texture with animated LEDs
  const rackFace = canvasTex(256, 600, null);
  rackFace.redraw = (k) => rackFace.draw((g, w, h) => {
    const R = rng(1000 + k);
    paint(g, w, h, '#161a22', { seed: 4, blotches: 6, strokes: 4 });
    for (let y = 30, i = 0; y < h - 40; y += 46, i++) {
      g.fillStyle = '#232936'; g.fillRect(14, y, w - 28, 38); g.strokeStyle = '#0b0d12'; g.lineWidth = 3; g.strokeRect(14, y, w - 28, 38);
      g.fillStyle = '#0c0f15'; for (let x = 30; x < 150; x += 10) g.fillRect(x, y + 8, 5, 22);
      g.fillStyle = '#3a4152'; g.fillRect(16, y + 14, 6, 10); g.fillRect(w - 22, y + 14, 6, 10);
      g.fillStyle = R() < 0.7 ? '#5fb0ff' : '#1a2a40'; g.fillRect(196, y + 12, 8, 8); g.fillStyle = R() < 0.6 ? '#4ae08a' : '#163a24'; g.fillRect(212, y + 12, 8, 8);
      if (R() < 0.15) { g.fillStyle = '#ffb43a'; g.fillRect(196, y + 24, 8, 6); }
    }
    if (RK.label) { g.fillStyle = '#d8d2c0'; g.fillRect(70, 6, 116, 20); g.fillStyle = INKC; g.font = `18px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (g.measureText(RK.label).width > 110) g.font = `${fitSize(g, RK.label, 18, 110)}px ${FONT}`; g.fillText(RK.label, 128, 17); }
  }, k);
  rackFace.redraw(0);
  const racks = [];
  for (let i = 0; i < RK.count; i++) {
    const x = -3.5 + i * 1.0;
    scene.add(box(0.9, 2.15, 1.1, 0x1a1e27, [x, 0, -3], { outline: 0.014 }));
    scene.add(plane(0.8, 2.0, basic(0xffffff, { map: rackFace.tex }), [x, 1.08, -2.445]));
    // perforated door frame + handle
    scene.add(box(0.04, 2.0, 0.03, 0x2c323e, [x - 0.41, 0.08, -2.43], { outline: 0.005 }));
    scene.add(box(0.03, 0.3, 0.05, 0x8a90a0, [x + 0.36, 0.95, -2.42], { outline: 0.005 }));
    const lampM = basic(0x333333);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.04), lampM); lamp.position.set(x, 2.06, -2.43); scene.add(lamp);
    const gl = glow(0x40ff80, 0.42, [x, 2.06, -2.36], 0); scene.add(gl);
    racks.push({ x, lampM, gl });
  }
  // a second, dimmer row behind for depth
  for (let i = 0; i < 9; i++) { scene.add(box(0.9, 2.15, 1.0, 0x141820, [-4 + i * 1.0, 0, -4.9], { outline: 0.012 })); scene.add(plane(0.8, 2.0, basic(0x777777, { map: rackFace.tex }), [-4 + i * 1.0, 1.08, -4.39])); }
  const alarm = pointLight(0xff3020, 0, 6, [mx, 1.6, -1.6]); scene.add(alarm);
  const alarmGlow = glow(0xff3a2a, 3.5, [mx, 1.3, -2.3], 0); scene.add(alarmGlow);
  // workbench, lamp, laptop on a cart, extinguisher, exit sign
  scene.add(box(1.4, 0.75, 0.7, 0x4a3628, [-5.6, 0, -1.4], { outline: 0.014 }));
  scene.add(box(0.5, 0.32, 0.03, 0x16171c, [-5.6, 0.75, -1.6], { outline: 0.01 }));
  scene.add(cyl(0.02, 0.02, 0.45, 0x222222, [-5.1, 0.75, -1.5], { outline: 0.008 }));
  scene.add(cyl(0.06, 0.16, 0.14, mat(0x2b5a3a), [-5.1, 1.16, -1.5], { outline: 0.01, open: true }));
  scene.add(glow(0xffbf6a, 1.2, [-5.1, 1.1, -1.5], 0.7));
  scene.add(pointLight(0xffa850, 9, 7, [-5.1, 1.05, -1.4]));
  scene.add(pointLight(0xffb070, 6, 6, [-1.5, 2.4, 0.5]));
  scene.add(box(0.7, 0.04, 0.5, 0x6a6f7a, [-4.2, 0.85, -1.2], { outline: 0.008 }));
  for (const [dx, dz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) scene.add(cyl(0.015, 0.015, 0.85, 0x6a6f7a, [-4.2 + dx, 0, -1.2 + dz], { outline: 0.004 }));
  scene.add(box(0.4, 0.02, 0.28, 0x22252c, [-4.2, 0.87, -1.2], { outline: 0.005 }));
  const lapScr = box(0.4, 0.26, 0.02, mat(0x0a1a12, { emissive: 0x2a8a5a, ei: 0.6 }), [-4.2, 0.88, -1.33], { outline: 0.005 }); lapScr.rotation.x = -0.2; scene.add(lapScr);
  scene.add(cyl(0.09, 0.09, 0.5, mat(0xc0281e), [-6.85, 0.2, -3.5], { outline: 0.01 }));
  scene.add(plane(0.5, 0.18, basic(0x3aff7a), [-6.95, 2.6, -2], [0, Math.PI / 2, 0])); scene.add(glow(0x3aff7a, 0.8, [-6.9, 2.6, -2], 0.35));
  scene.add(new THREE.HemisphereLight(0x5f80c0, 0x14101a, 0.45));
  const cards = placeCast(scene, ctx, cfg.cast ?? { tech: { pos: [-2.55, 0, -1.75], worldH: 1.85 } });
  const sparks = []; for (let i = 0; i < 18; i++) { const s = glow(0xffd06a, 0.08, [mx, 1.5, -2.3], 0); scene.add(s); sparks.push({ s, ph: i * 0.37, v: [(Math.sin(i * 7) * 0.8), 1 + (i % 3) * 0.4, 0.6 + (i % 4) * 0.2] }); }
  const DR = dress('server', scene, cfg);
  return {
    scene, setFg: DR.set, fgGroups: Object.keys(DR.groups), cards, racks,
    update(st) {
      const T = st.T, cue = st.cue || {};
      DR.update(T);
      rackFace.redraw(Math.floor(T * 7));
      for (let i = 0; i < RK.count; i++) {
        const r = racks[i]; let col = 0x2a2d33, op = 0;
        const odd = i === RK.missed;
        if (cue.greenAt) { const on = T >= cue.greenAt[0] + i * cue.greenAt[1]; if (!odd && on) { col = 0x46ff86; op = 0.75; } }
        if (cue.allGreen && !odd) { col = 0x46ff86; op = 0.6; }
        if (odd && cue.staleBlink && T >= cue.staleBlink) { const b = Math.floor((T - cue.staleBlink) * 6) % 2 === 0; col = b ? 0xffa020 : 0x2a2d33; op = b ? 0.5 : 0; }
        const al = cue.alarm || (cue.alarmAt != null && T >= cue.alarmAt);
        if (odd && al) { col = 0xff2a1a; op = 0.95; }
        r.lampM.color.setHex(col); r.gl.material.color.setHex(col); r.gl.material.opacity = op;
      }
      const a = cue.alarm || (cue.alarmAt != null && T >= cue.alarmAt) ? 1 : 0;
      alarm.intensity = a * (14 + 6 * Math.sin(T * 9)); alarmGlow.material.opacity = a * (0.4 + 0.15 * Math.sin(T * 9));
      for (const k of sparks) { const u = ((T * 1.2 + k.ph) % 1); k.s.material.opacity = cue.sparks ? (1 - u) * 0.9 : 0; k.s.position.set(mx - 0.15 + k.v[0] * u * 0.6, 1.9 + k.v[1] * u * 0.5 - u * u * 1.2, -2.35 + k.v[2] * u * 0.5); }
    },
  };
}
