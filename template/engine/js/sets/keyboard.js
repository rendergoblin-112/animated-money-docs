// KEYBOARD + HANDS: a readable desk keyboard (light keycaps with ink outlines and printed legends, a rim of screen light on
// the case) and, optionally, a seated cast member's forearms and hands on it, typing on the shot's cues.
// Opt-in from a set's config (the desk: cfg.keyboard). Without it nothing here is built.
//
// cfg: {
//   pos: [x, z]            keyboard centre on the desk top (default [-0.2, -0.2]);  y: desk top height (default 0.79)
//   capTint: 0.62 (keycap brightness under the desk lights)  keycap: "#c9c0ac"  legend: "#1e1a22"  case: "#353b4a"  rim: "#7cc4f0"  light: 1.0 (lamp over the keys; 0 = none)
//   hands: { cast: "trader", sleeve: "#2f3a52", cuff: "#ecebe6", skin: "#e8c09a", reach: 1.0, tint: 0.9 }
//                          skin and cuffs are drawn flat (unlit), tint = their brightness, like a cast card's tint   (omit: keyboard only)
// }
// shot cues (all times are time expressions):
//   typing: [t0, t1] or [[t0, t1], ...]   light typing on random keys (typeRate per second, default 7)
//   type: { from, to, text, hand }         these keys, evenly spaced (digits, letters, " " = space, "\n" = Enter);
//                                          hand: "L"|"R" types them all with one hand (keeps the other out of a close insert)
//   enterAt: t or [t, ...]                 a hard Enter strike with the right hand (lift, slam, key lights up)
//   handsOffAt: t                          both hands jump up off the keys and freeze there (fingers spread)
// With no cue the hands rest on the home row.
// The cast member's own drawn arms should be off in the poses used at the desk (armL/armR: null), because these replace them.
import * as THREE from 'three';
import { mat, canvasTex, INK, pointLight } from '../toon.js';
import { rng, clamp, smooth } from '../util.js';
import { FONT } from './common.js';

const LEFT = new Set([...'12345QWERTASDFGZXCVB', 'TAB', 'CAPS', 'SHIFT', 'CTRL', 'ALT', '`']);  // touch-typing hands
const inkBack = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const ROWS = [
  [['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['0'], ['-'], ['='], ['BKSP', 1.9]],
  [['TAB', 1.4], ['Q'], ['W'], ['E'], ['R'], ['T'], ['Y'], ['U'], ['I'], ['O'], ['P'], ['['], [']'], ['\\', 1.4]],
  [['CAPS', 1.7], ['A'], ['S'], ['D'], ['F'], ['G'], ['H'], ['J'], ['K'], ['L'], [';'], ['ENTER', 2.3]],
  [['SHIFT', 2.2], ['Z'], ['X'], ['C'], ['V'], ['B'], ['N'], ['M'], [','], ['.'], ['/'], ['SHIFT', 2.0]],
  [['CTRL', 1.5], ['ALT', 1.5], [' ', 6.6], ['ALT', 1.5], ['CTRL', 1.5]],
];

// a limb segment between two points: a unit cylinder scaled to length, with an inked hull
function limb(r, color) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 1, 18), color.isMaterial ? color : mat(color)); g.add(m);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.004, r * 0.92 + 0.004, 1, 18), inkBack));
  const Y = new THREE.Vector3(0, 1, 0);
  g.place = (a, b) => { const d = new THREE.Vector3().subVectors(b, a); const L = d.length(); g.position.copy(a).addScaledVector(d, 0.5); g.scale.set(1, Math.max(L, 1e-3), 1); g.quaternion.setFromUnitVectors(Y, d.normalize()); };
  return g;
}
function ball(r, color) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color)));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r + 0.004, 16, 12), inkBack));
  return g;
}
function block(w, h, d, color, t = 0.003) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'object' ? color : mat(color)));
  if (t) g.add(new THREE.Mesh(new THREE.BoxGeometry(w + 2 * t, h + 2 * t, d + 2 * t), inkBack));
  return g;
}

export function makeKeyboard(scene, cfg = {}, cards = {}) {
  const C = { pos: [-0.2, -0.2], y: 0.79, keycap: '#c9c0ac', legend: '#1e1a22', case: '#353b4a', rim: '#7cc4f0', light: 1.0, capTint: 0.62, ...cfg };
  const [kx, kz] = C.pos, U = 0.0285, capH = 0.011, caseH = 0.02;
  const root = new THREE.Group(); root.position.set(kx, C.y, kz); scene.add(root);
  // layout: key centres in keyboard space (x right, z toward the typist)
  const keys = []; const rowW = Math.max(...ROWS.map((r) => r.reduce((s, k) => s + (k[1] || 1), 0)));
  ROWS.forEach((row, ri) => { let x = -rowW * U / 2; for (const [label, w = 1] of row) { keys.push({ label, w, x: x + w * U / 2, z: (ri - 2) * U }); x += w * U; } });
  const caseW = rowW * U + 0.024, caseD = ROWS.length * U + 0.022;
  // case: dark body, a lighter top deck, and a rim of screen light along the far edge
  const body = block(caseW, caseH, caseD, C.case, 0.004); body.position.set(0, caseH / 2, 0); root.add(body);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(caseW - 0.012, 0.002, caseD - 0.012), mat(new THREE.Color(C.case).offsetHSL(0, 0, 0.08))); deck.position.set(0, caseH + 0.001, 0); root.add(deck);
  const rimM = new THREE.MeshBasicMaterial({ color: C.rim, toneMapped: false });
  const rimBack = new THREE.Mesh(new THREE.BoxGeometry(caseW + 0.002, 0.0035, 0.004), rimM); rimBack.position.set(0, caseH + 0.002, -caseD / 2); root.add(rimBack);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.0035, caseD * 0.85), rimM); r.position.set(s * caseW / 2, caseH + 0.002, -caseD * 0.075); root.add(r); }
  // legends: one atlas, each keycap top samples its own cell
  const PX = 72, atlas = canvasTex(2048, 512, null), cells = []; let ax = 0, ay = 0;
  for (const k of keys) { const w = Math.round(k.w * PX); if (ax + w > 2048) { ax = 0; ay += PX; } cells.push([ax, ay, w, PX]); ax += w; }
  atlas.draw((g, W, H) => {
    g.clearRect(0, 0, W, H);
    keys.forEach((k, i) => {
      const [x, y, w, h] = cells[i];
      g.fillStyle = C.keycap; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 6, y + 5, w - 12, 6);   // top bevel highlight
      g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(x + 6, y + h - 10, w - 12, 5);    // front bevel shade
      if (k.label.trim()) { g.fillStyle = C.legend; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${k.label.length > 1 ? 22 : 40}px ${FONT}`; g.fillText(k.label, x + w / 2, y + h / 2 + 2); }
    });
  });
  const capMat = (i) => new THREE.MeshStandardMaterial({ color: new THREE.Color().setScalar(C.capTint), map: atlas.tex, roughness: 0.85, emissive: 0x000000 });
  const sideMat = mat(new THREE.Color(C.keycap).multiplyScalar(C.capTint * 0.8));
  keys.forEach((k, i) => {
    const g = new THREE.Group(); g.position.set(k.x, caseH, k.z);
    const w = k.w * U - 0.005, d = U - 0.005;
    const side = new THREE.Mesh(new THREE.BoxGeometry(w, capH, d), sideMat); side.position.y = capH / 2; g.add(side);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(w + 0.004, capH + 0.002, d + 0.004), inkBack); hull.position.y = capH / 2; g.add(hull);
    const top = new THREE.PlaneGeometry(w - 0.002, d - 0.002); top.rotateX(-Math.PI / 2);
    const [cx, cy, cw, ch] = cells[i], uv = top.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, (cx + uv.getX(j) * cw) / 2048, 1 - (cy + (1 - uv.getY(j)) * ch) / 512);
    const tm = capMat(i); const tp = new THREE.Mesh(top, tm); tp.position.y = capH + 0.0004; g.add(tp);
    root.add(g); k.g = g; k.mat = tm;
  });
  if (C.light) { scene.add(pointLight(0xfff1dc, 0.3 * C.light, 1.0, [kx + 0.05, C.y + 0.55, kz + 0.25])); }
  const byLabel = (l) => keys.find((k) => k.label === l) || keys.find((k) => k.label === l.toUpperCase());
  const keyWorld = (k) => new THREE.Vector3(kx + k.x, C.y + caseH + capH, kz + k.z);

  // ---------------------------------------------------------------- hands
  const H = cfg.hands ? { cast: 'trader', sleeve: '#2f3a52', cuff: '#ecebe6', skin: '#e8c09a', reach: 1, tint: 0.9, ...cfg.hands } : null;
  // skin and cuffs are flat (unlit) like the drawn cast cards, so the screen glow can't burn them out; fingers a shade darker
  const flat = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(H.tint * k), toneMapped: false });
  const skinM = H && flat(H.skin), fingerM = H && flat(H.skin, 0.86), cuffM = H && flat(H.cuff, 0.85);
  const card = H ? cards[H.cast] : null;
  if (H && !card) throw new Error(`keyboard hands: cast member "${H.cast}" is not placed in this set`);
  const arms = {};
  if (H) {
    for (const side of ['L', 'R']) {
      const a = { side, s: side === 'L' ? -1 : 1 };
      a.upper = limb(0.04, H.sleeve); a.fore = limb(0.034, H.sleeve); a.elbow = ball(0.04, H.sleeve);
      a.cuff = limb(0.031, cuffM);
      a.hand = new THREE.Group();
      a.palm = block(0.074, 0.022, 0.07, skinM); a.palm.position.set(0, 0, -0.035); a.hand.add(a.palm);
      a.knuckle = block(0.072, 0.016, 0.02, skinM, 0); a.knuckle.position.set(0, 0.006, -0.066); a.hand.add(a.knuckle);
      a.fingers = [];
      for (let i = 0; i < 4; i++) {
        const piv = new THREE.Group(); piv.position.set((i - 1.5) * 0.0185, 0.002, -0.066);
        const f = block(0.0165, 0.0165, 0.05, fingerM); f.position.set(0, 0, -0.025); piv.add(f);
        a.hand.add(piv); a.fingers.push(piv);
      }
      const th = new THREE.Group(); th.position.set(-a.s * 0.03, -0.002, -0.03); const tb = block(0.015, 0.014, 0.036, fingerM); tb.position.set(0, 0, -0.018); th.add(tb); th.rotation.set(-0.25, a.s * 0.55, 0); a.hand.add(th);
      a.index = a.s < 0 ? 3 : 0;  // the finger nearest the thumb
      for (const o of [a.upper, a.fore, a.elbow, a.cuff, a.hand]) scene.add(o);
      arms[side] = a;
    }
  }
  const homeL = byLabel('F'), homeR = byLabel('J'), enter = byLabel('ENTER');
  const sched = new Map();
  function hitsFor(cue, shotId) {
    if (sched.has(shotId)) return sched.get(shotId);
    const hits = []; const R = rng(97 + (shotId || '').length * 13);
    const spans = cue.typing ? (Array.isArray(cue.typing[0]) ? cue.typing : [cue.typing]) : [];
    const pool = keys.filter((k) => k.w === 1 && /^[A-Z0-9]$/.test(k.label));
    for (const [t0, t1] of spans) { const dt = 1 / (cue.typeRate || 7); let last = null; for (let t = t0 + 0.05; t < t1 - 0.05; t += dt * (0.8 + R() * 0.4)) { let k; do { k = pool[Math.floor(R() * pool.length)]; } while (last && (k.x < 0) === (last.x < 0) && R() < 0.6); hits.push({ t, k }); last = k; } }
    if (cue.type) { const tx = [...cue.type.text]; tx.forEach((c, i) => { const k = c === '\n' ? enter : byLabel(c); if (!k) throw new Error(`keyboard: no key for "${c}"`); hits.push({ t: cue.type.from + (cue.type.to - cue.type.from) * (tx.length > 1 ? i / (tx.length - 1) : 0), k, hand: cue.type.hand }); }); }
    for (const t of [].concat(cue.enterAt ?? [])) hits.push({ t, k: enter, hard: true });
    for (const h of hits) h.side = h.hand || (LEFT.has(h.k.label) && h.k.x < 0 ? 'L' : 'R');
    hits.sort((a, b) => a.t - b.t);
    sched.set(shotId, hits); return hits;
  }
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // where the hand's wrist goes so the index fingertip sits on key k
  function wristFor(a, k, yaw) {
    const p = keyWorld(k);
    const fx = a.fingers[a.index].position.x, fz = -0.066 - 0.043;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return v3(p.x - (fx * c + fz * s), p.y + 0.03, p.z - (-fx * s + fz * c));
  }
  function update(st) {
    const T = st.T, cue = st.cue || {}, cam = st.camera;
    for (const k of keys) { k.g.position.y = caseH; k.mat.emissive.setHex(0x000000); }
    if (!H) return;
    const hits = hitsFor(cue, st.shot?.id);
    // keys go down and light up on their hits
    for (const h of hits) {
      const u = T - h.t;
      if (u > -0.02 && u < 0.11) h.k.g.position.y = caseH - 0.0055 * (1 - Math.abs(u - 0.03) / 0.08);
      if (u >= 0 && u < 0.18) h.k.mat.emissive.setHex(h.hard ? 0xffc030 : 0xffe9a0), h.k.mat.emissiveIntensity = (h.hard ? 0.9 : 0.55) * (1 - u / 0.18);
    }
    // shoulders from the cast card (it faces the camera), set back a little behind the card
    const cp = new THREE.Vector3(); card.group.getWorldPosition(cp);
    const D = card.def, wH = card.mesh.geometry.parameters.height, px = wH / 1536;
    let yaw = Math.atan2(cam.position.x - cp.x, cam.position.z - cp.z);
    if (Math.cos(yaw) < 0.3) yaw = 0;  // camera in front of the figure (an insert at the keys): keep the figure's own left/right
    const right = v3(Math.cos(yaw), 0, -Math.sin(yaw)), back = v3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const shY = cp.y + (1500 - (D.body.top + (D.body.bot - D.body.top) * 0.2)) * px, shX = D.body.w * 0.36 * px;
    const off = cue.handsOffAt != null ? clamp((T - cue.handsOffAt) / 0.12) : 0;
    for (const a of Object.values(arms)) {
      const S = cp.clone().addScaledVector(right, a.s * shX).add(v3(0, shY - cp.y, 0)).addScaledVector(back, 0.06);
      const home = a.side === 'L' ? homeL : homeR;
      const hy = Math.atan2(-(keyWorld(home).x - S.x), -(keyWorld(home).z - S.z)) * 0.6;
      const mine = hits.filter((h) => h.side === a.side);
      let prev = null, next = null; for (const h of mine) { if (h.t <= T) prev = h; else { next = h; break; } }
      const A = prev && T - prev.t < 0.6 ? prev.k : home, B = next && next.t - T < 0.35 ? next.k : A;
      const u = next && prev ? smooth(clamp((T - prev.t - 0.04) / Math.max(0.05, next.t - prev.t - 0.1))) : next ? smooth(clamp(1 - (next.t - T) / 0.3)) : 0;
      const W = wristFor(a, A, hy).lerp(wristFor(a, B, hy), u);
      let press = 0, lift = 0;
      for (const h of mine) {
        const d = T - h.t;
        if (h.hard) { if (d > -0.3 && d < -0.04) lift = Math.max(lift, Math.sin(clamp((d + 0.3) / 0.26) * Math.PI / 2) * 0.05); if (d >= -0.04 && d < 0.12) press = Math.max(press, 1 - Math.abs(d - 0.01) / 0.11); }
        else if (Math.abs(d - 0.01) < 0.06) press = Math.max(press, 1 - Math.abs(d - 0.01) / 0.06);
      }
      W.y += lift - press * 0.006 + off * 0.075 + Math.sin(T * 2.1 + a.s) * 0.0015; W.z += off * 0.05;
      // two-bone arm: shoulder -> elbow -> wrist, elbow out to the side and down
      const reach = W.distanceTo(S), Lu = Math.max(0.24 * H.reach, reach * 0.52), Lf = Math.max(0.24 * H.reach, reach * 0.52);
      const dir = new THREE.Vector3().subVectors(W, S).normalize();
      const along = (Lu * Lu - Lf * Lf + reach * reach) / (2 * reach), hgt = Math.sqrt(Math.max(0, Lu * Lu - along * along));
      const pole = right.clone().multiplyScalar(a.s * 0.8).add(v3(0, -1, 0)); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      const E = S.clone().addScaledVector(dir, along).addScaledVector(pole, hgt);
      const Wc = W.clone().addScaledVector(new THREE.Vector3().subVectors(W, E).normalize(), -0.012);
      a.upper.place(S, E); a.fore.place(E, Wc); a.elbow.position.copy(E);
      a.cuff.place(Wc.clone().lerp(E, 0.08), W.clone().addScaledVector(new THREE.Vector3().subVectors(W, E).normalize(), 0.004));
      a.hand.position.copy(W);
      a.hand.rotation.set(-0.12 - off * 0.25, hy, a.s * -0.08, 'YXZ');
      a.fingers.forEach((f, i) => {
        const isIdx = i === a.index;
        const curl = off ? -0.15 * (1 - off) + 0.2 * off : -0.62;
        f.rotation.x = curl - (isIdx ? press * 0.7 : 0) + (isIdx && !off ? 0.18 * (1 - press) : 0) + (isIdx || off ? 0 : (press ? 0.15 : Math.sin(T * 9 + i) * 0.04));
        f.rotation.y = off * (i - 1.5) * 0.18;
      });
    }
  }
  return { update, keys, keyWorld };
}
