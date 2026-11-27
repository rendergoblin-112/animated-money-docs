// Set dressing (references/06-sets-and-colour.md, "Full rooms and depth"): warm practical lamps, furniture and clutter in every
// room, FOREGROUND props for each kind of shot (hidden until a shot names them in "fg", so the depth of field blurs something
// close to the lens), and far bokeh lights. Every prop is built from the cel-shaded, ink-outlined primitives in toon.js, so it
// reads as drawn like the cast. Each dressX(scene) returns { set(list), update(T), groups } and is called by its set last, after
// everything else is built. A set's config can turn its dressing off with "dress": false (the room is then as plain as before
// round 3, and its fg names do nothing). Foreground group names per set are listed in FG below.
import * as THREE from 'three';
import { mat, basic, box, cyl, plane, canvasTex, glow, bokehDisc, pointLight } from '../toon.js';
import { rng } from '../util.js';

const INKC = '#141014';
// the foreground groups each set's dressing provides (shots name them in "fg")
export const FG = {
  city: ['cityFg'],
  floor: ['floorFgWide', 'floorFgBoard', 'floorFgClock', 'floorFgOrders'],
  server: ['srvFgTech', 'srvFgAisle', 'srvFgStale'],
  rack: ['rackFg', 'rackFgNear'],
  desk: ['deskFgWide', 'deskFgClose'],
  den: ['denFgTwo', 'denFgGus', 'denFgDot'],
  court: ['courtFgTitle', 'courtFgTable'],
};
function registry(scene) {
  const groups = {};
  return {
    groups,
    add(name) { const g = new THREE.Group(); g.visible = false; scene.add(g); groups[name] = g; return g; },
    set(list) { for (const [k, g] of Object.entries(groups)) g.visible = list.includes(k); },
  };
}
const NONE = { set() {}, update() {}, groups: {} };
// called by every set as its last build step: dress(kind, scene, cfg)
export function dress(kind, scene, cfg = {}) {
  if (cfg.dress === false) return NONE;
  const f = { city: dressCity, floor: dressFloor, server: dressServer, rack: dressRack, desk: dressDesk, den: dressDen, court: dressCourt }[kind];
  return f ? f(scene) : NONE;
}
// ------------------------------------------------------------------ props
export function deskLamp(par, [x, y, z], o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); if (o.rotY) g.rotation.y = o.rotY; par.add(g);
  const s = o.scale ?? 1, sh = o.shade ?? 0x2d6a44;
  g.add(cyl(0.07 * s, 0.09 * s, 0.025 * s, 0x2b2420, [0, 0, 0], { outline: 0.006 }));
  g.add(cyl(0.009 * s, 0.009 * s, 0.26 * s, 0xb8962e, [0, 0.02 * s, 0], { outline: 0.004 }));
  g.add(cyl(0.05 * s, 0.12 * s, 0.11 * s, mat(sh, { emissive: sh, ei: 0.25 }), [0, 0.25 * s, 0], { outline: 0.007, open: true }));
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.105 * s, 20), basic(0xfff0c8)); bulb.rotation.x = Math.PI / 2; bulb.position.y = 0.252 * s; g.add(bulb);
  g.add(glow(0xffc070, 0.55 * s, [0, 0.22 * s, 0], o.glow ?? 0.6));
  if (o.light !== false) g.add(pointLight(o.color ?? 0xffb060, o.i ?? 3, o.dist ?? 2.6, [0, 0.2 * s, 0.05]));
  return g;
}
export function pendant(par, [x, y, z], o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); par.add(g);
  const s = o.scale ?? 1;
  g.add(cyl(0.004, 0.004, o.cord ?? 0.8, 0x111111, [0, 0.06 * s, 0], { outline: 0 }));
  g.add(cyl(0.04 * s, 0.17 * s, 0.14 * s, mat(o.shade ?? 0x8a5a2a, { emissive: 0x3a2008, ei: 0.3 }), [0, -0.08 * s, 0], { outline: 0.008, open: true }));
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.15 * s, 24), basic(0xfff0c8)); bulb.rotation.x = Math.PI / 2; bulb.position.y = -0.082 * s; g.add(bulb);
  g.add(glow(0xffc070, 0.8 * s, [0, -0.12 * s, 0], o.glow ?? 0.55));
  if (o.light !== false) g.add(pointLight(o.color ?? 0xffb468, o.i ?? 5, o.dist ?? 4, [0, -0.2 * s, 0]));
  return g;
}
export function sconce(par, [x, y, z], rotY, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; par.add(g);
  g.add(box(0.1, 0.16, 0.025, 0x9a7a3a, [0, -0.08, 0], { outline: 0.004 }));
  g.add(cyl(0.045, 0.07, 0.11, mat(0xf1e2c0, { emissive: 0xffc070, ei: 0.75 }), [0, 0.0, 0.08], { outline: 0.005, open: true }));
  g.add(glow(0xffc070, o.size ?? 0.75, [0, 0.07, 0.1], 0.6));
  if (o.light !== false) g.add(pointLight(0xffb060, o.i ?? 3, o.dist ?? 3.2, [0, 0.1, 0.25]));
  return g;
}
const ART = {
  chart: (g, w, h, c) => { g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.lineWidth = 10; g.lineJoin = 'round'; g.beginPath(); g.moveTo(w * 0.08, h * 0.8); g.lineTo(w * 0.35, h * 0.55); g.lineTo(w * 0.55, h * 0.65); g.lineTo(w * 0.92, h * 0.18); g.stroke(); g.strokeStyle = INKC; g.lineWidth = 4; g.beginPath(); g.moveTo(w * 0.06, h * 0.1); g.lineTo(w * 0.06, h * 0.9); g.lineTo(w * 0.94, h * 0.9); g.stroke(); },
  hills: (g, w, h, c) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f3c98a'); gr.addColorStop(1, '#e8925a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(w * 0.7, h * 0.35, h * 0.12, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.moveTo(0, h * 0.75); g.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.7); g.quadraticCurveTo(w * 0.8, h * 0.85, w, h * 0.6); g.lineTo(w, h); g.lineTo(0, h); g.fill(); g.strokeStyle = INKC; g.lineWidth = 5; g.stroke(); },
  ship: (g, w, h) => { g.fillStyle = '#cfe0e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a6a8a'; g.fillRect(0, h * 0.68, w, h * 0.32); g.fillStyle = '#f6efe0'; g.beginPath(); g.moveTo(w * 0.5, h * 0.15); g.lineTo(w * 0.5, h * 0.62); g.lineTo(w * 0.78, h * 0.62); g.closePath(); g.fill(); g.strokeStyle = INKC; g.lineWidth = 5; g.stroke(); g.fillStyle = '#7a4a2a'; g.fillRect(w * 0.25, h * 0.62, w * 0.55, h * 0.08); g.strokeRect(w * 0.25, h * 0.62, w * 0.55, h * 0.08); },
  cert: (g, w, h) => { g.fillStyle = '#f7f0dc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8962e'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#8a7a5a'; for (let i = 0; i < 5; i++) g.fillRect(w * 0.2, h * (0.3 + i * 0.1), w * (0.6 - (i % 2) * 0.15), 7); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(w * 0.75, h * 0.78, h * 0.08, 0, 7); g.fill(); },
};
export function frameArt(par, [x, y, z], rotY, w, h, kind = 'chart', c = '#2f9a5a') {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; par.add(g);
  g.add(box(w, h, 0.035, 0x5a3a24, [0, -h / 2, 0], { outline: 0.006 }));
  const t = canvasTex(256, Math.round(256 * h / w), (gg, ww, hh) => ART[kind](gg, ww, hh, c));
  const m = basic(0xffffff, { map: t.tex }); m.color.setScalar(0.82);
  g.add(plane(w * 0.84, h * 0.84, m, [0, 0, 0.02]));
  return g;
}
export function books(par, [x, y, z], rotY, width, seed = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; par.add(g);
  const R = rng(seed); let xx = -width / 2;
  const cols = [0xa33c32, 0x2f5a8a, 0xd9a03a, 0x3a7a4a, 0x6a4a8a, 0xc9b48a, 0x8a3a2a];
  while (xx < width / 2 - 0.05) { const bw = 0.04 + R() * 0.04, bh = 0.2 + R() * 0.1; const b = box(bw, bh, 0.2, cols[Math.floor(R() * cols.length)], [xx + bw / 2, 0, 0], { outline: 0.004 }); if (R() < 0.12) b.rotation.z = -0.3; g.add(b); xx += bw + 0.004; }
  return g;
}
export function plant(par, [x, y, z], s = 1, seed = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); par.add(g);
  g.add(cyl(0.2 * s, 0.15 * s, 0.38 * s, 0xa0603a, [0, 0, 0], { outline: 0.01 }));
  const R = rng(seed);
  for (let k = 0; k < 11; k++) { const a = R() * 6.28, rr = 0.05 + R() * 0.15; const lf = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 10, 8), mat(R() < 0.5 ? 0x3f7a44 : 0x4f8a3e)); lf.position.set(Math.cos(a) * rr * s, (0.42 + R() * 0.55) * s, Math.sin(a) * rr * s); lf.scale.set(0.6, 1.7, 0.45); lf.rotation.set(R() - 0.5, a, Math.cos(a) * 0.6); g.add(lf); }
  return g;
}
function cardboard(par, [x, y, z], w, h, d, rotY = 0) {
  const t = canvasTex(128, 128, (g, W, H) => { g.fillStyle = '#c9995e'; g.fillRect(0, 0, W, H); g.fillStyle = '#d8b07a'; g.fillRect(0, H * 0.42, W, H * 0.16); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(W * 0.1, H * 0.7, W * 0.3, 6); });
  const b = box(w, h, d, mat(0xffffff, { map: t.tex }), [x, y, z], { outline: 0.008 }); b.rotation.y = rotY; par.add(b); return b;
}
function bokehField(par, n, seed, [x0, x1, y0, y1, z0, z1], colors, [s0, s1], op = [0.25, 0.5]) {
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++) { const b = bokehDisc(colors[Math.floor(R() * colors.length)], s0 + R() * (s1 - s0), [x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), z0 + R() * (z1 - z0)], op[0] + R() * (op[1] - op[0])); b.userData.noInk = true; par.add(b); out.push([b, R() * 10, b.material.opacity]); }
  return out;
}
const twinkle = (list, T) => { for (const [b, ph, o] of list) b.material.opacity = o * (0.72 + 0.28 * Math.sin(T * 1.4 + ph)); };
function laptop(par, [x, y, z], rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; par.add(g);
  g.add(box(0.36, 0.02, 0.25, 0x2a2d34, [0, 0, 0], { outline: 0.005 }));
  const s = box(0.36, 0.24, 0.015, mat(0x0a1a12, { emissive: 0x3aa86a, ei: 0.7 }), [0, 0.02, -0.12], { outline: 0.005 }); s.rotation.x = -0.25; g.add(s);
  g.add(glow(0x5fe0a0, 0.5, [0, 0.14, -0.08], 0.25));
  return g;
}
function mug(par, [x, y, z], c = 0xe9e2d6) { const g = cyl(0.045, 0.04, 0.11, c, [x, y, z], { outline: 0.006 }); par.add(g); return g; }
function cart(par, [x, y, z], rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; par.add(g);
  for (const yy of [0.25, 0.85]) g.add(box(0.75, 0.04, 0.5, 0x6a6f7a, [0, yy, 0], { outline: 0.007 }));
  for (const [dx, dz] of [[-0.34, -0.22], [0.34, -0.22], [-0.34, 0.22], [0.34, 0.22]]) g.add(cyl(0.015, 0.015, 0.87, 0x5a5f6a, [dx, 0, dz], { outline: 0.004 }));
  return g;
}
function cableLoop(par, pts, color = 0x2a2a30, r = 0.018) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 8), mat(color)));
  const hull = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r * 1.5, 8), new THREE.MeshBasicMaterial({ color: 0x121014, side: THREE.BackSide })); hull.userData.hull = true; g.add(hull);
  par.add(g); return g;
}

// ================================================================== FLOOR: the clock wall (plainest in v2) + foregrounds
export function dressFloor(scene) {
  const F = registry(scene); const RW = 8.93, face = -Math.PI / 2;
  // wainscot: dado rail and a darker lower panel along the right wall; panel strips
  scene.add(box(0.03, 1.0, 16, 0x3a2418, [8.95, 0, -5], { outline: 0.006 }));
  scene.add(box(0.07, 0.06, 16, 0x6a4430, [RW, 0.98, -5], { outline: 0.006 }));
  for (let z = -12; z <= 2; z += 1.4) scene.add(box(0.04, 0.8, 0.04, 0x2a1810, [RW, 0.1, z], { outline: 0.003 }));
  scene.add(box(0.07, 0.08, 16, 0x6a4430, [RW, 4.3, -5], { outline: 0.006 }));      // crown moulding
  // warm sconces either side of the clock, a third further along
  sconce(scene, [RW - 0.02, 2.55, -6.7], face, { i: 3.5 });
  sconce(scene, [RW - 0.02, 2.55, -4.0], face, { i: 3.5 });
  sconce(scene, [RW - 0.02, 2.55, -9.6], face);
  // framed pictures, a certificate, a small shelf of binders under the clock, a wall screen with a chart
  frameArt(scene, [RW - 0.01, 2.2, -7.6], face, 0.75, 0.55, 'hills', '#4a7a3a');
  frameArt(scene, [RW - 0.01, 1.9, -6.1], face, 0.5, 0.62, 'cert');
  frameArt(scene, [RW - 0.01, 2.05, -3.25], face, 0.62, 0.48, 'ship');
  frameArt(scene, [RW - 0.01, 3.65, -4.4], face, 0.55, 0.4, 'chart', '#c0392b');
  scene.add(box(0.28, 0.04, 1.1, 0x5a3a24, [RW - 0.14, 2.12, -5.5], { outline: 0.006 }));
  books(scene, [RW - 0.14, 2.14, -5.5], face, 0.95, 7);
  { const tv = canvasTex(320, 200, (g, w, h) => { g.fillStyle = '#0b1612'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5ff08e'; g.lineWidth = 6; g.beginPath(); for (let i = 0; i < 14; i++) { const x = 14 + i * 21, y = h * 0.7 - Math.sin(i * 0.8) * 30 - i * 5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
    scene.add(box(0.06, 0.62, 1.05, 0x15161b, [RW - 0.03, 2.95, -8.6], { outline: 0.008 })); scene.add(plane(0.95, 0.54, basic(0xffffff, { map: tv.tex }), [RW - 0.07, 3.26, -8.6], [0, face, 0])); scene.add(glow(0x5ff08e, 1.0, [RW - 0.2, 3.26, -8.6], 0.15)); }
  // water cooler, filing cabinet with a plant on top, a floor plant, a coat stand
  { const g = new THREE.Group(); g.position.set(8.5, 0, -7.0); scene.add(g); g.add(box(0.36, 0.95, 0.36, 0xe8e4da, [0, 0, 0], { outline: 0.008 })); g.add(cyl(0.15, 0.15, 0.42, mat(0x7ab8e0, { emissive: 0x2a5a80, ei: 0.25 }), [0, 0.95, 0], { outline: 0.008 })); g.add(box(0.06, 0.05, 0.05, 0x3a6aa0, [0, 0.62, -0.2], { outline: 0.004 })); }
  { scene.add(box(0.55, 1.15, 0.5, 0x6a7078, [8.6, 0, -3.15], { outline: 0.01 })); for (const y of [0.3, 0.65, 0.98]) scene.add(box(0.02, 0.03, 0.2, 0xc0c4cc, [8.32, y, -3.15], { outline: 0.004 })); plant(scene, [8.6, 1.15, -3.15], 0.55, 4); mug(scene, [8.55, 1.15, -2.9], 0xc0392b); }
  plant(scene, [8.35, 0, -6.25], 1.1, 9);
  { const g = new THREE.Group(); g.position.set(8.45, 0, -8.0); scene.add(g); g.add(cyl(0.02, 0.025, 1.8, 0x3a2a1a, [0, 0, 0], { outline: 0.004 })); g.add(cyl(0.18, 0.2, 0.03, 0x3a2a1a, [0, 0, 0], { outline: 0.004 })); g.add(box(0.32, 0.7, 0.16, 0x7a3a2a, [0.02, 1.0, 0.0], { outline: 0.008 })); }
  // ceiling pendant over the bell corner
  pendant(scene, [7.7, 3.75, -5.0], { i: 5, dist: 4.5, cord: 0.8 });
  // far bokeh through the left windows (city at night, far away)
  const bk = bokehField(scene, 26, 5, [-8.85, -8.85, 1.0, 3.8, -12, 7], [0xffc77a, 0xffe0a0, 0x9fd0ff], [0.25, 0.6], [0.2, 0.4]);
  // ---- foregrounds
  { const g = F.add('floorFgWide'); pendant(g, [0.95, 2.6, -0.45], { i: 2, dist: 2.5, cord: 1.0, scale: 0.9 }); plant(g, [1.4, 0, -0.15], 1.25, 3);
    g.add(box(1.2, 0.74, 0.6, 0x5c3d2b, [-1.35, 0, -0.35], { outline: 0.015 })); g.add(box(0.66, 0.42, 0.05, 0x15161b, [-1.25, 0.95, -0.4], { outline: 0.012 })); deskLamp(g, [-0.85, 0.74, -0.25], { i: 2, scale: 1.1 }); mug(g, [-1.6, 0.74, -0.2]); }
  { const g = F.add('floorFgBoard'); pendant(g, [0.95, 3.32, -5.55], { i: 1.5, dist: 2, cord: 0.8, scale: 0.9 }); g.add(box(0.7, 0.45, 0.06, 0x15161b, [-0.55, 2.0, -5.5], { outline: 0.012 })); }
  { const g = F.add('floorFgClock'); g.add(box(1.0, 0.86, 0.6, 0x5c3d2b, [6.95, 0, -3.95], { outline: 0.014 })); g.add(box(1.05, 0.04, 0.65, 0x6d4a34, [6.95, 0.86, -3.95], { outline: 0.01 }));
    deskLamp(g, [6.75, 0.9, -3.8], { i: 3, dist: 2.5, scale: 1.1 }); g.add(box(0.2, 0.06, 0.13, 0x1d1d22, [7.15, 0.9, -3.75], { outline: 0.006 })); for (let k = 0; k < 3; k++) g.add(box(0.3, 0.012, 0.22, 0xf2ece0, [7.05 + k * 0.01, 0.9 + k * 0.012, -4.1], { outline: 0.004 })); mug(g, [6.6, 0.9, -4.1], 0x3a5a8a); }
  { const g = F.add('floorFgOrders'); mug(g, [-0.68, 0.765, -1.22]); g.add(cyl(0.035, 0.035, 0.11, 0x3a5a8a, [-1.45, 0.765, -1.28], { outline: 0.005 })); deskLamp(g, [-1.62, 0.765, -1.42], { i: 2.5, dist: 1.8, scale: 0.9 });
    g.add(box(0.1, 0.01, 0.1, 0xffe36a, [-0.85, 0.765, -1.3], { outline: 0.003 })); }
  return { set: F.set, groups: F.groups, update(T) { twinkle(bk, T); } };
}

// ================================================================== SERVER ROOM: the aisle (plainest in v2) + foregrounds
export function dressServer(scene) {
  const F = registry(scene);
  // warm caged work lamps on the back wall above the racks, and on the left wall
  for (const x of [-5.5, -1.8, 1.8, 5.5]) { const g = new THREE.Group(); g.position.set(x, 2.75, -5.55); scene.add(g); g.add(box(0.12, 0.12, 0.08, 0x3a3a3a, [0, -0.06, 0], { outline: 0.004 })); g.add(cyl(0.07, 0.07, 0.14, mat(0xffe0a0, { emissive: 0xffb060, ei: 0.9 }), [0, -0.07, 0.1], { outline: 0.006 })); g.add(glow(0xffb060, 1.1, [0, 0, 0.15], 0.6)); g.add(pointLight(0xffa850, 4, 4.5, [0, -0.1, 0.4])); }
  // right-side workbench with monitor, warm lamp, mug, papers; chair
  scene.add(box(1.4, 0.75, 0.7, 0x4a3628, [5.5, 0, -1.3], { outline: 0.014 }));
  scene.add(box(0.55, 0.36, 0.04, 0x15161b, [5.4, 0.75, -1.55], { outline: 0.01 }));
  scene.add(plane(0.5, 0.3, basic(0x8affc0), [5.4, 0.95, -1.525]));
  deskLamp(scene, [5.95, 0.75, -1.4], { i: 6, dist: 6, scale: 1.2, shade: 0x8a3a2a });
  mug(scene, [5.0, 0.75, -1.15], 0xc0392b);
  for (let k = 0; k < 3; k++) scene.add(box(0.3, 0.012, 0.22, 0xf2ece0, [5.75 + k * 0.01, 0.75 + k * 0.012, -1.05], { outline: 0.004 }));
  { const g = new THREE.Group(); g.position.set(5.3, 0, -0.55); scene.add(g); g.add(box(0.45, 0.06, 0.45, 0x2a2a30, [0, 0.45, 0], { outline: 0.006 })); g.add(box(0.45, 0.5, 0.06, 0x2a2a30, [0, 0.5, 0.2], { outline: 0.006 })); g.add(cyl(0.025, 0.025, 0.45, 0x5a5f6a, [0, 0, 0], { outline: 0.004 })); }
  // boxes, a cable spool, a step ladder, a rolled cable on the floor
  cardboard(scene, [4.55, 0, -2.3], 0.55, 0.4, 0.45, 0.2); cardboard(scene, [4.6, 0.4, -2.25], 0.45, 0.35, 0.4, -0.15); cardboard(scene, [-4.9, 0, -2.4], 0.5, 0.45, 0.5, 0.3);
  { const sp = cyl(0.32, 0.32, 0.22, 0x8a5a3a, [0, 0, 0], { outline: 0.01 }); sp.rotation.z = Math.PI / 2; sp.position.set(-4.7, 0.32, -0.6); scene.add(sp); const core = cyl(0.2, 0.2, 0.24, 0x2f6fd0, [0, 0, 0], { outline: 0.006 }); core.rotation.z = Math.PI / 2; core.position.set(-4.7, 0.32, -0.6); scene.add(core); }
  { const g = new THREE.Group(); g.position.set(4.25, 0, -2.1); g.rotation.z = 0.12; scene.add(g); for (const dx of [-0.2, 0.2]) g.add(box(0.04, 1.6, 0.05, 0xd9a03a, [dx, 0, 0], { outline: 0.005 })); for (let i = 1; i < 6; i++) g.add(box(0.44, 0.03, 0.05, 0xd9a03a, [0, i * 0.27, 0], { outline: 0.004 })); }
  { const t = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 30), mat(0x3aa060)); t.rotation.x = Math.PI / 2; t.position.set(3.9, 0.03, -1.0); scene.add(t); }
  // a clipboard hanging on the first rack, a sticky note on another
  scene.add(box(0.2, 0.28, 0.02, 0x8a6a3a, [-3.25, 1.2, -2.42], { outline: 0.004 })); scene.add(box(0.16, 0.2, 0.005, 0xf2ece0, [-3.25, 1.18, -2.41], { outline: 0.002 }));
  scene.add(plane(0.09, 0.09, basic(0xffe36a), [0.7, 1.45, -2.43]));
  // far bokeh: LEDs on a third row deep in the dark
  const bk = bokehField(scene, 40, 11, [-6, 6, 0.3, 2.4, -5.45, -5.3], [0x46ff86, 0x4aa8ff, 0xffb060], [0.06, 0.16], [0.35, 0.7]);
  // ---- foregrounds
  { const g = F.add('srvFgTech'); cart(g, [-1.72, 0, -0.42], -0.3); laptop(g, [-1.72, 0.87, -0.42], -0.4); deskLamp(g, [-1.5, 0.87, -0.55], { i: 4, dist: 3.5, scale: 1.0, shade: 0x8a3a2a });
    cableLoop(g, [[-2.25, 3.2, -0.6], [-2.2, 2.4, -0.55], [-2.05, 2.1, -0.5], [-1.9, 2.4, -0.45], [-1.85, 3.2, -0.4]], 0x2f6fd0, 0.02); }
  { const g = F.add('srvFgAisle'); cart(g, [-1.05, 0, 1.95], 0.2); laptop(g, [-1.05, 0.87, 1.95], 0.1); deskLamp(g, [-0.78, 0.87, 1.8], { i: 5, dist: 4.5, shade: 0x8a3a2a });
    cardboard(g, [0.95, 0, 2.05], 0.6, 0.5, 0.5, -0.2); cardboard(g, [1.0, 0.5, 2.05], 0.5, 0.42, 0.45, 0.15); cardboard(g, [1.5, 0, 1.75], 0.45, 0.4, 0.4, 0.4);
    cableLoop(g, [[-1.3, 0.02, 1.2], [-0.5, 0.02, 0.9], [0.2, 0.02, 1.3], [1.0, 0.02, 1.1]], 0xd0a02f, 0.022); }
  // mid-ground on the aisle floor: a yellow cable ramp, a floor fan, a mop bucket, a toolbox, a warm floor work-light
  scene.add(box(8.6, 0.04, 0.24, 0xe8c22a, [0, 0, -0.6], { outline: 0.006 }));
  { const g = new THREE.Group(); g.position.set(4.0, 0, -0.7); g.rotation.y = -1.1; scene.add(g); g.add(cyl(0.18, 0.22, 0.04, 0x2a2d34, [0, 0, 0], { outline: 0.005 })); g.add(cyl(0.02, 0.02, 0.6, 0x5a5f6a, [0, 0, 0], { outline: 0.004 })); const fan = cyl(0.26, 0.26, 0.1, 0x3a4150, [0, 0, 0], { outline: 0.007 }); fan.rotation.x = Math.PI / 2; fan.position.y = 0.82; g.add(fan); }
  { const g = new THREE.Group(); g.position.set(-2.2, 0, -0.85); scene.add(g); g.add(cyl(0.18, 0.15, 0.32, 0xe8c22a, [0, 0, 0], { outline: 0.008 })); g.add(cyl(0.012, 0.012, 1.1, 0x8a6a3a, [0.05, 0.2, 0], { outline: 0.004 })); }
  scene.add(box(0.45, 0.22, 0.25, 0xc0281e, [0.6, 0, -0.95], { outline: 0.007 })); scene.add(box(0.3, 0.05, 0.06, 0x2a2a2a, [0.6, 0.24, -0.95], { outline: 0.004 }));
  { const g = new THREE.Group(); g.position.set(-0.9, 0, -0.75); g.rotation.y = 0.6; scene.add(g); g.add(box(0.3, 0.04, 0.25, 0x2a2d34, [0, 0, 0], { outline: 0.005 })); const hd = box(0.22, 0.16, 0.12, mat(0xffe0a0, { emissive: 0xffb060, ei: 0.9 }), [0, 0.06, 0], { outline: 0.006 }); hd.rotation.x = -0.5; g.add(hd); g.add(glow(0xffb060, 0.9, [0, 0.16, 0.06], 0.6)); g.add(pointLight(0xffa850, 4, 3.5, [0, 0.3, -0.3])); }
  { const g = F.add('srvFgStale'); cableLoop(g, [[2.55, 3.3, -1.25], [2.6, 2.2, -1.3], [2.68, 1.75, -1.32], [2.76, 2.2, -1.35], [2.8, 3.3, -1.38]], 0x2a2a30, 0.02);
    cableLoop(g, [[2.45, 3.3, -1.2], [2.5, 2.1, -1.24], [2.58, 1.62, -1.26], [2.66, 2.1, -1.28], [2.72, 3.3, -1.3]], 0xc03a3a, 0.018);
    g.add(box(0.07, 0.1, 0.01, 0xe8c22a, [2.67, 1.62, -1.3], { outline: 0.003 })); }
  return { set: F.set, groups: F.groups, update(T) { twinkle(bk, T * 3); } };
}

// ================================================================== INSIDE THE RACK: hanging cables close to the lens
export function dressRack(scene) {
  const F = registry(scene);
  { const g = F.add('rackFg'); cableLoop(g, [[-0.5, 2.0, 1.05], [-0.46, 1.0, 1.08], [-0.4, 0.35, 1.1], [-0.3, 0.1, 1.05]], 0x2f6fd0, 0.022); cableLoop(g, [[0.52, 1.9, 1.02], [0.47, 1.1, 1.05], [0.44, 0.45, 1.08]], 0xd0a02f, 0.02); cableLoop(g, [[0.4, 2.0, 1.1], [0.36, 1.3, 1.12], [0.38, 0.8, 1.12]], 0xc03a3a, 0.018); }
  { const g = F.add('rackFgNear'); cableLoop(g, [[-0.36, 1.2, 0.68], [-0.33, 0.6, 0.7], [-0.3, 0.2, 0.72]], 0x2f6fd0, 0.016); cableLoop(g, [[0.38, 1.1, 0.66], [0.35, 0.55, 0.69], [0.33, 0.25, 0.7]], 0xd0a02f, 0.015); }
  // a warm work light from outside the open rack (the technician's lamp), so Peg has a warm side and a cool side
  scene.add(pointLight(0xffb060, 1.6, 3, [-0.7, 0.9, 1.4]));
  const bk = bokehField(scene, 14, 3, [-0.5, 0.5, 0.3, 2.0, -0.62, -0.6], [0x46ff86, 0x4aa8ff], [0.03, 0.06], [0.4, 0.7]);
  return { set: F.set, groups: F.groups, update(T) { twinkle(bk, T * 4); } };
}

// ================================================================== INBOX DESK
export function dressDesk(scene) {
  const F = registry(scene);
  // bookshelf and floor lamp on the left, filing cabinet and plant on the right, a cork board above the screen
  scene.add(box(0.9, 2.0, 0.35, 0x3d281c, [-2.15, 0, -1.4], { outline: 0.014 }));
  for (const y of [0.45, 0.95, 1.45]) { scene.add(box(0.86, 0.03, 0.33, 0x2e1e14, [-2.15, y - 0.03, -1.4], { outline: 0.005 })); books(scene, [-2.15, y, -1.38], 0, 0.8, Math.round(y * 10)); }
  { const g = new THREE.Group(); g.position.set(-1.45, 0, -1.0); scene.add(g); g.add(cyl(0.12, 0.14, 0.03, 0x2b2420, [0, 0, 0], { outline: 0.005 })); g.add(cyl(0.012, 0.012, 1.55, 0x2b2420, [0, 0, 0], { outline: 0.004 })); g.add(cyl(0.12, 0.2, 0.24, mat(0xf1e2c0, { emissive: 0xffc070, ei: 0.7 }), [0, 1.5, 0], { outline: 0.007, open: true })); g.add(glow(0xffc070, 1.0, [0, 1.6, 0], 0.55)); g.add(pointLight(0xffb060, 4, 4, [0, 1.55, 0.2])); }
  scene.add(box(0.5, 1.05, 0.5, 0x6a7078, [2.25, 0, -1.25], { outline: 0.01 })); for (const y of [0.3, 0.62, 0.92]) scene.add(box(0.2, 0.03, 0.02, 0xc0c4cc, [2.25, y, -0.99], { outline: 0.004 }));
  plant(scene, [2.25, 1.05, -1.25], 0.6, 5);
  { const cb = canvasTex(384, 256, (g, w, h) => { g.fillStyle = '#b88a5a'; g.fillRect(0, 0, w, h); const R = rng(9); for (let i = 0; i < 9; i++) { g.save(); g.translate(30 + R() * (w - 80), 30 + R() * (h - 80)); g.fillStyle = ['#ffe36a', '#ff9ac0', '#9ae0ff', '#f2ece0'][i % 4]; g.fillRect(0, 0, 54, 50); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 3; k++) g.fillRect(8, 12 + k * 12, 36, 4); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(27, 6, 5, 0, 7); g.fill(); g.restore(); } });
    scene.add(box(0.9, 0.55, 0.03, 0x5a3a24, [-0.3, 1.95, -1.585], { outline: 0.006 })); scene.add(plane(0.84, 0.5, basic(0xd8d8d8, { map: cb.tex }), [-0.3, 2.22, -1.565])); }
  sconce(scene, [0.75, 2.3, -1.58], 0, { i: 2.5 });
  const bk = bokehField(scene, 18, 7, [-2.1, 0.3, 1.2, 2.3, -1.55, -1.55], [0xffc77a, 0xffe0a0, 0x9fd0ff], [0.06, 0.16], [0.2, 0.4]);
  // ---- foregrounds
  { const g = F.add('deskFgWide'); pendant(g, [0.3, 2.12, 0.0], { i: 1.6, dist: 2.2, cord: 0.6, scale: 0.8 }); mug(g, [1.0, 0.79, 0.0]); for (let k = 0; k < 3; k++) g.add(box(0.3, 0.06, 0.24, [0x2f5a8a, 0xa33c32, 0xd9a03a][k], [-0.8, 0.79 + k * 0.06, -0.05], { outline: 0.005 })); }
  { const g = F.add('deskFgClose'); mug(g, [-0.42, 0.79, 0.02], 0xc0392b); g.add(cyl(0.035, 0.035, 0.11, 0x3a5a8a, [0.5, 0.79, 0.0], { outline: 0.005 })); for (let i = 0; i < 3; i++) { const p = cyl(0.005, 0.005, 0.15, [0xd0a02f, 0xc03a3a, 0x2f6fd0][i], [0.49 + i * 0.012, 0.86, 0.0], { outline: 0 }); p.rotation.z = (i - 1) * 0.2; g.add(p); } }
  return { set: F.set, groups: F.groups, update(T) { twinkle(bk, T); } };
}

// ================================================================== DOT & GUS'S OFFICE
export function dressDen(scene) {
  const F = registry(scene);
  // two tall warm floor lamps in the back corners, a rug, a coat stand, a side table with a lamp, a framed certificate
  for (const [x, z] of [[-1.85, -2.15], [2.25, -1.95]]) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); g.add(cyl(0.13, 0.15, 0.03, 0x2b2420, [0, 0, 0], { outline: 0.005 })); g.add(cyl(0.014, 0.014, 1.5, 0x2b2420, [0, 0, 0], { outline: 0.004 })); g.add(cyl(0.13, 0.22, 0.26, mat(0xf1e2c0, { emissive: 0xffc070, ei: 0.75 }), [0, 1.45, 0], { outline: 0.007, open: true })); g.add(glow(0xffc070, 0.8, [0, 1.55, 0], 0.45)); g.add(pointLight(0xffb060, 3.0, 4, [0, 1.5, 0.25])); }
  { const rug = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#7a2e26'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9a03a'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28); g.strokeStyle = '#3a1a14'; g.lineWidth = 4; g.strokeRect(30, 30, w - 60, h - 60); });
    scene.add(plane(3.0, 1.9, mat(0xffffff, { map: rug.tex }), [0.1, 0.004, -0.9], [-Math.PI / 2, 0, 0])); }
  { const g = new THREE.Group(); g.position.set(-3.1, 0, -1.7); scene.add(g); g.add(cyl(0.02, 0.025, 1.8, 0x3a2a1a, [0, 0, 0], { outline: 0.004 })); g.add(cyl(0.2, 0.22, 0.03, 0x3a2a1a, [0, 0, 0], { outline: 0.004 })); g.add(box(0.34, 0.75, 0.18, 0x2f4a6a, [0.03, 0.95, 0], { outline: 0.008 })); g.add(cyl(0.16, 0.16, 0.06, 0x6a4a2a, [0, 1.78, 0], { outline: 0.006 })); }
  { scene.add(box(0.5, 0.55, 0.4, 0x4a2e1e, [-2.95, 0, -2.2], { outline: 0.01 })); deskLamp(scene, [-2.95, 0.55, -2.2], { i: 2.5, dist: 3, shade: 0x8a3a2a }); books(scene, [-2.8, 0.55, -2.15], 0, 0.25, 4); }
  frameArt(scene, [1.25, 2.55, -2.57], 0, 0.42, 0.32, 'cert');
  frameArt(scene, [-0.95, 2.6, -2.57], 0, 0.5, 0.38, 'hills', '#3f6a3a');
  // more city bokeh in the window, bigger and warmer
  const bk = bokehField(scene, 26, 21, [-1.3, 1.7, 1.0, 2.5, -2.56, -2.56], [0xffc77a, 0xffd99a, 0xff9a6a, 0x9fd0ff], [0.12, 0.34], [0.18, 0.4]);
  // ---- foregrounds
  { const g = F.add('denFgTwo'); plant(g, [0.75, 0.55, 0.42], 0.75, 12); g.add(cyl(0.04, 0.04, 0.14, 0x3a5a8a, [-0.72, 0.55, 0.4], { outline: 0.005 })); for (let i = 0; i < 3; i++) { const p = cyl(0.005, 0.005, 0.2, [0xd0a02f, 0xc03a3a, 0x2f6fd0][i], [-0.73 + i * 0.012, 0.66, 0.4], { outline: 0 }); p.rotation.z = (i - 1) * 0.25; g.add(p); }
    for (let k = 0; k < 5; k++) g.add(box(0.32, 0.03, 0.24, [0xf2ece0, 0xe8e0d0][k % 2], [-0.45 + k * 0.005, 0.55 + k * 0.03, 0.62], { outline: 0.004 })); }
  { const g = F.add('denFgGus'); mug(g, [0.98, 0.55, 0.3], 0xc0392b); plant(g, [1.25, 0.55, 0.15], 0.6, 13); }
  { const g = F.add('denFgDot'); plant(g, [-0.98, 0.55, 0.38], 0.7, 14); g.add(box(0.3, 0.05, 0.2, 0x2a2a30, [-0.15, 0.55, 0.45], { outline: 0.006 })); }
  return { set: F.set, groups: F.groups, update(T) { twinkle(bk, T); } };
}

// ================================================================== CITY: a street lamp and a tree close to the lens
export function dressCity(scene) {
  const F = registry(scene);
  { const g = F.add('cityFg'); g.add(cyl(0.09, 0.11, 6.5, 0x24252c, [-0.9, 0, 8.4], { outline: 0.02 })); g.add(box(0.9, 0.26, 0.42, 0x2b2c33, [-0.6, 6.5, 8.4], { outline: 0.02 }));
    g.add(glow(0xffc070, 3.0, [-0.45, 6.4, 8.4], 0.85)); g.add(pointLight(0xffb060, 14, 9, [-0.45, 6.2, 8.6]));
    const R = rng(5); for (let k = 0; k < 16; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mat(R() < 0.5 ? 0x1f3a2a : 0x2a4a30)); lf.position.set(3.4 + R() * 1.6, 4.6 + R() * 2.0, 7.4 + R() * 1.2); lf.scale.set(1, 0.8, 0.8); g.add(lf); } }
  return { set: F.set, groups: F.groups, update() {} };
}

// ================================================================== COURT: brass lamps, law books, chairs + foregrounds
// (Not in the Knight example. Keeps the room empty of people: no judge, clerk or lawyer is drawn.)
export function dressCourt(scene) {
  const F = registry(scene);
  // two brass pendants over the well of the court, warm and low
  pendant(scene, [-1.6, 3.7, -0.4], { i: 2.5, dist: 4, cord: 0.7, shade: 0x6a4a1a });
  pendant(scene, [1.6, 3.7, -0.4], { i: 2.5, dist: 4, cord: 0.7, shade: 0x6a4a1a });
  // law books on a tall shelf against the right wall, a framed certificate, a plant in the back corner
  scene.add(box(0.36, 2.1, 1.6, 0x3d281c, [4.4, 0, -0.9], { outline: 0.014 }));
  for (const y of [0.45, 0.95, 1.45, 1.95]) { scene.add(box(0.34, 0.03, 1.56, 0x2e1e14, [4.4, y - 0.03, -0.9], { outline: 0.005 })); books(scene, [4.36, y, -0.9], -Math.PI / 2, 1.45, Math.round(y * 10) + 20); }
  frameArt(scene, [4.58, 3.1, 1.4], -Math.PI / 2, 0.55, 0.42, 'cert');
  plant(scene, [-3.95, 0, -2.85], 1.1, 31);
  plant(scene, [3.95, 0, -2.85], 1.0, 32);
  // counsel's chairs behind the table, a second desk lamp on the clerk's side of the bench
  for (const x of [-0.75, 0.75]) { const g = new THREE.Group(); g.position.set(x, 0, 1.35); scene.add(g); g.add(box(0.5, 0.07, 0.48, 0x5a1e1e, [0, 0.46, 0], { outline: 0.007 })); g.add(box(0.5, 0.62, 0.07, 0x5a1e1e, [0, 0.5, 0.22], { outline: 0.007 })); for (const [dx, dz] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) g.add(cyl(0.02, 0.02, 0.46, 0x3a2214, [dx, 0, dz], { outline: 0.004 })); }
  deskLamp(scene, [-1.45, 1.485, -2.25], { i: 2.5, dist: 3, shade: 0x2d6a44 });
  // ---- foregrounds
  // for a bench shot from behind counsel's table (camera about [-0.7, 1.75, 0.8]): a brass pendant hanging close to the lens at
  // the top right, a lectern with law books at the bottom left
  { const g = F.add('courtFgTitle'); pendant(g, [-0.12, 2.12, 0.02], { i: 1.2, dist: 1.6, cord: 1.2, scale: 0.6, shade: 0x6a4a1a });
    g.add(box(0.42, 1.32, 0.36, 0x4a2c1a, [-0.98, 0, -0.28], { outline: 0.01 })); g.add(box(0.48, 0.04, 0.42, 0x5c3a24, [-0.98, 1.32, -0.28], { outline: 0.006 })); books(g, [-0.98, 1.36, -0.28], 0.25, 0.36, 41); }
  { const g = F.add('courtFgTable'); g.add(cyl(0.05, 0.045, 0.2, mat(0xcfe6f0, { emissive: 0x2a3a40, ei: 0.2 }), [-1.0, 0.79, 0.8], { outline: 0.005 })); g.add(cyl(0.03, 0.028, 0.1, 0xcfe6f0, [-0.88, 0.79, 0.86], { outline: 0.004 })); books(g, [1.0, 0.79, 0.75], 0.2, 0.25, 42); }
  return { set: F.set, groups: F.groups, update() {} };
}
