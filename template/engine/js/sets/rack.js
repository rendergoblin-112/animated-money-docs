// INSIDE A RACK: patch panel with plugged cables, perforated walls, server faceplates, swaying cable bundles, a spinning fan,
// and an old beige drawer at the bottom where "the old code" creature sleeps (it can wake, jump and fire order tickets).
// cfg: { nodeLabel: "NODE", drawerLabel: "OLD CODE", panelPrefix: "PANEL ", creatureLabel: "v1", tickets: ["BUY", "SELL"], dress?: false }
// shot cues: wakeAt: t (creature wakes, red flood)   awake: true   fireAt: t (tickets fly)   shake: true (creature shakes when awake)
// The dressing adds a warm work light from outside the rack (so the creature has a warm and a cool side) and deep LED bokeh.
// foregrounds (shot "fg"): rackFg (cables hanging close to the lens), rackFgNear (nearer cables, for a close-up)
import * as THREE from 'three';
import { mat, basic, box, plane, canvasTex, glow, pointLight, INK } from '../toon.js';
import { Card, drawPeg } from '../chars.js';
import { rng, clamp } from '../util.js';
import { INKC, FONT, paint, fitSize } from './common.js';
import { dress } from './dress.js';

export function makeRack(cfg = {}) {
  const C = { nodeLabel: 'NODE', drawerLabel: 'OLD CODE', panelPrefix: 'PANEL ', creatureLabel: 'v1', tickets: ['BUY', 'SELL'], ...cfg };
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a10, 0.22);
  // back wall: a painted patch panel with rows of ports and plugged cables
  const patch = canvasTex(1024, 1536, (g, w, h) => {
    paint(g, w, h, '#1a1f2a', { top: '#1f2533', bottom: '#11151d', seed: 12 });
    const R = rng(6); const cols = ['#2f6fd0', '#d0a02f', '#c03a3a', '#3aa060', '#9a6ad0', '#e07a2a'];
    for (let row = 0; row < 7; row++) {
      const y = 120 + row * 190;
      g.fillStyle = '#2a303d'; g.fillRect(40, y, w - 80, 110); g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(40, y, w - 80, 110);
      for (let i = 0; i < 16; i++) { const x = 70 + i * 56; g.fillStyle = '#0c0f15'; g.fillRect(x, y + 30, 36, 30); if (R() < 0.75) { const c = cols[Math.floor(R() * cols.length)]; g.fillStyle = c; g.fillRect(x + 4, y + 26, 28, 34); g.strokeStyle = c; g.lineWidth = 14; g.beginPath(); g.moveTo(x + 18, y + 60); g.bezierCurveTo(x + 18, y + 140, x + 18 + (R() - 0.5) * 200, y + 150, x + 18 + (R() - 0.5) * 260, y + 260); g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 4; g.stroke(); } }
      g.fillStyle = '#e8e2d0'; g.fillRect(60, y + 78, 120, 22); g.fillStyle = INKC; g.font = `20px ${FONT}`; g.textBaseline = 'middle'; g.fillText(C.panelPrefix + String.fromCharCode(65 + row), 70, y + 90);
      for (let k = 0; k < 4; k++) { g.fillStyle = R() < 0.5 ? '#4ae08a' : '#5fb0ff'; g.beginPath(); g.arc(w - 120 + k * 22, y + 90, 6, 0, Math.PI * 2); g.fill(); }
    }
    // zip ties + a faded warning sticker
    g.save(); g.translate(w * 0.7, h * 0.86); g.rotate(-0.08); g.fillStyle = '#e8c22a'; g.fillRect(-120, -40, 240, 80); g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(-120, -40, 240, 80); g.fillStyle = INKC; g.font = `34px ${FONT}`; g.textAlign = 'center'; g.fillText('CAUTION', 0, 4); g.restore();
  });
  scene.add(plane(1.3, 2.4, mat(0xffffff, { map: patch.tex }), [0, 1.1, -0.65]));
  // side walls: perforated metal with mounting rails
  const perf = canvasTex(512, 1024, (g, w, h) => { paint(g, w, h, '#1d222c', { seed: 14, blotches: 10 }); g.fillStyle = '#0d1016'; for (let y = 20; y < h; y += 26) for (let x = 20; x < w; x += 26) { g.beginPath(); g.arc(x + ((y / 26) % 2) * 13, y, 6, 0, Math.PI * 2); g.fill(); } });
  for (const s of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), mat(0xffffff, { map: perf.tex })); sw.position.set(s * 0.6, 1.1, -0.1); sw.rotation.y = -s * Math.PI / 2; scene.add(sw);
    // front rails with square holes
    const rail = canvasTex(64, 1024, (g, w, h) => { g.fillStyle = '#5a6070'; g.fillRect(0, 0, w, h); g.fillStyle = '#14171d'; for (let y = 10; y < h; y += 30) g.fillRect(20, y, 24, 14); });
    scene.add(box(0.06, 2.3, 0.04, mat(0xffffff, { map: rail.tex }), [s * 0.55, 0, 0.62], { outline: 0.006 }));
  }
  scene.add(box(1.3, 0.04, 1.6, 0x1a1e27, [0, 2.2, -0.1], { outline: 0.01 }));
  scene.add(box(1.3, 0.04, 1.6, 0x151820, [0, 0, -0.1], { outline: 0.01 }));
  // modern servers on the upper shelves: detailed faceplates
  const face = canvasTex(1024, 256, null);
  face.redraw = (k) => face.draw((g, w, h) => {
    const R = rng(200 + k); paint(g, w, h, '#2a3140', { top: '#323a4a', bottom: '#222834', seed: 3, blotches: 4, strokes: 8 });
    g.strokeStyle = INKC; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    for (let i = 0; i < 8; i++) { g.fillStyle = '#1a1f29'; g.fillRect(40 + i * 82, 50, 70, 150); g.fillStyle = '#3a4252'; g.fillRect(48 + i * 82, 170, 54, 16); g.fillStyle = R() < 0.7 ? '#4ae08a' : '#1a3a24'; g.fillRect(52 + i * 82, 64, 10, 10); g.fillStyle = R() < 0.5 ? '#5fb0ff' : '#1a2a40'; g.fillRect(70 + i * 82, 64, 10, 10); }
    g.fillStyle = '#0d1016'; for (let x = 720; x < w - 40; x += 14) g.fillRect(x, 50, 7, 150);
    g.fillStyle = '#d8d2c0'; g.fillRect(730, 214, 160, 28); g.fillStyle = INKC; g.font = `22px ${FONT}`; g.textBaseline = 'middle'; if (g.measureText(C.nodeLabel).width > 140) g.font = `${fitSize(g, C.nodeLabel, 22, 140)}px ${FONT}`; g.fillText(C.nodeLabel, 742, 229);
  }, k);
  face.redraw(0);
  for (const y of [0.72, 1.07, 1.42, 1.77]) {
    scene.add(box(1.12, 0.3, 1.0, 0x222836, [0, y, -0.15], { outline: 0.01 }));
    scene.add(plane(1.1, 0.28, basic(0xffffff, { map: face.tex }), [0, y + 0.15, 0.352]));
    for (const s of [-1, 1]) scene.add(box(0.04, 0.12, 0.04, 0xa0a6b4, [s * 0.5, y + 0.15, 0.37], { outline: 0.004 }));
  }
  // 3D cable bundles looping down from the top: tubes with ink outline, swaying
  const cableG = new THREE.Group(); scene.add(cableG);
  const ccols = [0x2f6fd0, 0xd0a02f, 0xc03a3a, 0x3aa060, 0x9a6ad0, 0xe07a2a, 0x7a7a8a];
  const tubes = [];
  for (let i = 0; i < 9; i++) {
    const x0 = -0.5 + i * 0.12, side = i % 2 ? 1 : -1;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, 2.2, -0.4), new THREE.Vector3(x0 + side * 0.05, 1.95, 0.42), new THREE.Vector3(x0 + side * 0.18, 1.6, 0.5), new THREE.Vector3(side * 0.52, 1.2, 0.45), new THREE.Vector3(side * 0.5, 0.6, 0.3)]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.014, 8), mat(ccols[i % ccols.length], { rough: 0.6 }));
    const hull = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.02, 8), new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
    const g = new THREE.Group(); g.add(m, hull); cableG.add(g); tubes.push(g);
  }
  // fan unit on the right wall, spinning
  const fanG = new THREE.Group(); fanG.position.set(0.56, 1.95, 0.2); fanG.rotation.y = -Math.PI / 2; scene.add(fanG);
  fanG.add(new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), basic(0x0a0c10)));
  const blades = new THREE.Group(); fanG.add(blades);
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.14), mat(0x3a4150)); b.position.set(0, 0.07, 0.005); const p = new THREE.Group(); p.add(b); p.rotation.z = i / 5 * Math.PI * 2; blades.add(p); }
  const grille = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = '#8a90a0'; g.lineWidth = 6; for (let r = 20; r < 128; r += 22) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); } g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke(); });
  const gm = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshBasicMaterial({ map: grille.tex, transparent: true, toneMapped: false })); gm.position.z = 0.01; fanG.add(gm);
  // the old beige drawer: dust, a floppy disk, an old coiled cable, cobwebs
  const beige = 0xcfc4a6;
  scene.add(box(1.0, 0.06, 0.8, beige, [0, 0.04, 0.25], { outline: 0.01 }));
  scene.add(box(1.0, 0.16, 0.05, beige, [0, 0.1, 0.65], { outline: 0.01 }));
  scene.add(box(0.05, 0.16, 0.8, beige, [-0.48, 0.1, 0.25], { outline: 0.01 }));
  scene.add(box(0.05, 0.16, 0.8, beige, [0.48, 0.1, 0.25], { outline: 0.01 }));
  scene.add(box(0.12, 0.05, 0.03, 0x8a8068, [0, 0.12, 0.69], { outline: 0.005 }));
  const dust = canvasTex(256, 256, (g) => { const R = rng(3); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(200,190,160,${0.2 + R() * 0.4})`; g.fillRect(R() * 256, R() * 256, 2 + R() * 3, 2 + R() * 3); } });
  scene.add(plane(0.9, 0.7, new THREE.MeshBasicMaterial({ map: dust.tex, transparent: true, depthWrite: false, toneMapped: false }), [0, 0.072, 0.25], [-Math.PI / 2, 0, 0]));
  const fl = box(0.13, 0.006, 0.13, 0x2a2a30, [-0.32, 0.075, 0.42], { outline: 0.004 }); fl.rotation.y = 0.4; scene.add(fl);
  const fll = box(0.06, 0.007, 0.04, 0xe8e2d0, [-0.32, 0.076, 0.38], { outline: 0.002 }); fll.rotation.y = 0.4; scene.add(fll);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 24), mat(0x6a6050)); coil.rotation.x = Math.PI / 2; coil.position.set(0.33, 0.08, 0.45); scene.add(coil);
  const lab = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#efe6c8'; g.fillRect(0, 0, w, h); g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.font = `58px ${FONT}`; if (g.measureText(C.drawerLabel).width > w - 30) g.font = `${fitSize(g, C.drawerLabel, 58, w - 30)}px ${FONT}`; g.fillStyle = '#3a3226'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(C.drawerLabel, w / 2, h / 2 + 4); });
  scene.add(plane(0.36, 0.068, basic(0xffffff, { map: lab.tex }), [0, 0.1, 0.678]));
  const web = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(235,235,235,0.7)'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 256, Math.sin(a) * 256); g.stroke(); } for (let k = 1; k < 6; k++) { g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2, r = k * 44; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } });
  const webM = new THREE.MeshBasicMaterial({ map: web.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const w1 = plane(0.16, 0.16, webM, [-0.5, 0.52, -0.2], [0, 0.6, Math.PI]); scene.add(w1);
  const w2 = plane(0.14, 0.14, webM, [0.5, 0.5, -0.25], [0, -0.6, Math.PI / 2]); scene.add(w2);
  const w3 = plane(0.12, 0.12, webM, [-0.46, 2.12, 0.3], [Math.PI / 2, 0, 0]); scene.add(w3);
  // dust motes
  const R = rng(9); const motes = [];
  for (let i = 0; i < 40; i++) { const m = glow(0xffffff, 0.012 + R() * 0.014, [(R() - 0.5) * 1.0, 0.1 + R() * 1.0, (R() - 0.5) * 1.0 + 0.2], 0.5); scene.add(m); motes.push([m, R() * 10, m.position.clone()]); }
  const leds = [];
  for (const y of [0.72, 1.07, 1.42, 1.77]) for (let i = 0; i < 4; i++) { const l = glow(i % 2 ? 0x4aa8ff : 0x46ff86, 0.08, [-0.48 + i * 0.07, y + 0.22, 0.37], 0.9); scene.add(l); leds.push(l); }
  const peg = new Card(drawPeg, null, { worldH: 0.62, cw: 1024, ch: 1024, footY: 960 }); peg.role = 'set';
  peg.group.position.set(0, 0.07, 0.28); scene.add(peg.group);
  const pegLight = pointLight(0xb8e8c0, 0.3, 2.5, [0.1, 0.45, 0.75]); scene.add(pegLight);
  const redFlood = pointLight(0xff2a1a, 0, 4, [0, 0.9, 0.9]); scene.add(redFlood);
  const ambient = new THREE.HemisphereLight(0x5a78b8, 0x100c12, 0.5); scene.add(ambient);
  scene.add(pointLight(0x7fb0ff, 1.8, 4, [0.3, 1.9, 0.8]));
  scene.add(pointLight(0xffc88a, 1.2, 3, [-0.3, 1.2, 1.0]));
  const ticketTex = (text, color) => canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h); g.strokeStyle = INKC; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.font = `64px ${FONT}`; if (g.measureText(text).width > w - 30) g.font = `${fitSize(g, text, 64, w - 30)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 4); });
  const tickTex = ticketTex(C.tickets[0], '#2a7a3a');
  const tickTex2 = ticketTex(C.tickets[1] ?? C.tickets[0], '#c0392b');
  const tickets = []; const RT = rng(21);
  for (let i = 0; i < 90; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055), new THREE.MeshBasicMaterial({ map: (i % 2 ? tickTex : tickTex2).tex, toneMapped: false, side: THREE.DoubleSide }));
    m.visible = false; scene.add(m);
    tickets.push({ m, t0: i * 0.022, v: [(RT() - 0.5) * 1.8, 0.4 + RT() * 1.3, 0.5 + RT() * 0.9], spin: [(RT() - 0.5) * 14, (RT() - 0.5) * 14, (RT() - 0.5) * 14] });
  }
  const DR = dress('rack', scene, cfg);
  return {
    scene, setFg: DR.set, fgGroups: Object.keys(DR.groups), cards: { peg },
    update(st) {
      const T = st.T, cue = st.cue || {};
      DR.update(T);
      const wake = cue.wakeAt != null ? clamp((T - cue.wakeAt) / 0.12) : (cue.awake ? 1 : 0);
      redFlood.intensity = wake * (5 + 2 * Math.sin(T * 14));
      pegLight.color.setHex(wake ? 0xff4030 : 0xb8e8c0); pegLight.intensity = wake ? 2.2 : 0.3;
      ambient.intensity = 0.5 - wake * 0.2;
      for (const [m, s, p0] of motes) m.position.set(p0.x + Math.sin(T * 0.6 + s) * 0.05, p0.y + Math.sin(T * 0.4 + s * 2) * 0.06, p0.z + Math.cos(T * 0.5 + s) * 0.04);
      leds.forEach((l, i) => { l.material.opacity = Math.sin(T * (3 + i % 5) + i) > -0.3 ? 0.9 : 0.15; });
      tubes.forEach((g, i) => { g.rotation.x = Math.sin(T * 0.9 + i) * 0.012 * (1 + wake * 4); g.position.x = Math.sin(T * 0.7 + i * 1.3) * 0.004 * (1 + wake * 6); });
      blades.rotation.z = -T * (wake ? 40 : 14);
      face.redraw(Math.floor(T * 6));
      const fire = cue.fireAt != null && T >= cue.fireAt;
      for (const k of tickets) {
        const u = T - (cue.fireAt ?? 0) - k.t0;
        if (!fire || u < 0 || u > 1.6) { k.m.visible = false; continue; }
        k.m.visible = true;
        k.m.position.set(k.v[0] * u, 0.42 + k.v[1] * u - 0.9 * u * u, 0.32 + k.v[2] * u);
        k.m.rotation.set(k.spin[0] * u, k.spin[1] * u, k.spin[2] * u);
      }
      // the creature's acting: breathing asleep; on waking a squash, a jump with eyes popping, then arms up; pumping arms while firing
      const tw = cue.wakeAt != null ? T - cue.wakeAt : (cue.awake ? 9 : -1);
      let squash = 0, jump = 0, eyePop = 1, arms = 'rest';
      if (tw < 0) squash = Math.sin(T * 2.2) * 0.12;
      else if (tw < 0.1) squash = 0.6;
      else if (tw < 0.45) { const u = (tw - 0.1) / 0.35; jump = Math.sin(u * Math.PI) * 120; squash = -0.4 * Math.sin(u * Math.PI); eyePop = 1.4; arms = 'up'; }
      else if (tw < 0.6) { squash = 0.35 * (1 - (tw - 0.45) / 0.15); arms = 'up'; }
      else arms = 'up';
      if (fire) { arms = 'pump'; squash = Math.sin(T * 30) * 0.08; }
      peg.set({
        t: Math.floor(T * 15) / 15, awake: wake > 0.5 ? 1 : 0, shake: cue.shake && wake > 0.5 ? Math.sin(T * 60) * (fire ? 1 : 0.6) : 0,
        arms, squash: Math.round(squash * 40) / 40, jump: Math.round(jump), eyePop, lookX: Math.round(Math.sin(T * 3)),
        light: wake > 0.5 ? { x: 0.7, y: -0.4, color: '#ff6a5a', rim: 0.55 } : { x: 0.6, y: -0.5, color: '#9fe8b0', rim: 0.4 }, label: C.creatureLabel,
      }, wake > 0.5 ? 1.0 : 0.85);
    },
  };
}
