// DESK: an office desk at dawn facing a big monitor. Blinds with the city behind, a wall clock, a framed chart, sticky notes,
// pen cup, paper stack, lamp, steaming mug.
// cfg: {
//   wallClock: { h: 8, m: 1 }  or false (no clock: when the time isn't a sourced fact)
//   screen: { mode: "inbox", title: "INBOX", time: "8:01 AM", sender: "SYSTEM", subject: "...", count: 97 }
//       or  { mode: "order", title: "ORDER ENTRY", ticker: "J-COM", side: "SELL",
//             before: { qty: "1", unit: "SHARE", price: "¥610,000" }, after: { qty: "610,000", unit: "SHARES", price: "¥1" },
//             cancelText: "CANCEL", failText: "NOT PROCESSED" }
//   cast: { castId: { pos, worldH } }   (empty by default)
//   keyboard: { pos: [x, z], hands: { cast: "trader", sleeve, skin } }   opt-in readable keyboard + typing hands (keyboard.js);
//             without it the desk keeps its original flat keyboard slab
// }
// shot cues (keyboard): typing, type, enterAt, handsOffAt -- see keyboard.js
// shot cues (inbox): emails: [t0, t1]  the unread counter climbs 1 -> count, rows flash, envelopes fly out of the screen
// shot cues (order): state: "before" | "after" (what the fields show at the shot start, default "before")
//                    swapAt: t (the two fields trade places: before -> after)   sendAt: t (side button flashes, "SENT")
//                    cancelAt: t (cancel button pressed)   failAt: t (red failText stamp, screen shakes)
import * as THREE from 'three';
import { mat, basic, box, cyl, plane, canvasTex, glow, pointLight } from '../toon.js';
import { rng, clamp } from '../util.js';
import { INKC, FONT, HAND, paint, placeCast } from './common.js';
import { makeKeyboard } from './keyboard.js';

export function makeDesk(cfg = {}, ctx) {
  const WC = cfg.wallClock === false ? null : { h: 8, m: 1, ...(cfg.wallClock || {}) };
  const SC = { mode: 'inbox', title: 'INBOX', time: '', sender: 'SYSTEM', subject: '', count: 10, ...(cfg.screen || {}) };
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e0a08, 3, 10);
  const wallT = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#3e3a44', { top: '#46424e', bottom: '#2a2730', seed: 21 }); });
  scene.add(plane(8, 4, mat(0xffffff, { map: wallT.tex }), [0, 2, -1.6]));
  // window blinds with the city at dawn behind
  const blinds = canvasTex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2550'); gr.addColorStop(1, '#c2765a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const R = rng(5); for (let i = 0; i < 14; i++) { const x = R() * w, bw = 50 + R() * 90, bh = 120 + R() * 260; g.fillStyle = '#141a33'; g.fillRect(x, h - bh, bw, bh); for (let y = h - bh + 12; y < h; y += 22) for (let xx = x + 8; xx < x + bw - 8; xx += 18) if (R() < 0.4) { g.fillStyle = '#ffd98a'; g.fillRect(xx, y, 9, 10); } } g.fillStyle = 'rgba(30,24,20,0.85)'; for (let y = 0; y < h; y += 26) g.fillRect(0, y, w, 13); });
  scene.add(plane(2.6, 1.3, basic(0xbbbbbb, { map: blinds.tex }), [-0.9, 1.75, -1.58]));
  scene.add(box(2.7, 0.08, 0.1, 0x2a2230, [-0.9, 2.4, -1.55], { outline: 0.01 }));
  // wall clock, a framed chart, sticky notes
  if (WC) { const wc = canvasTex(256, 256, (g) => { g.fillStyle = '#f3ecdc'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill(); g.strokeStyle = INKC; g.lineWidth = 10; g.stroke(); g.lineCap = 'round'; const ma = WC.m / 60 * Math.PI * 2, ha = (WC.h + WC.m / 60) / 12 * Math.PI * 2; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ha) * 60, 128 - Math.cos(ha) * 60); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ma) * 95, 128 - Math.cos(ma) * 95); g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = 5; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); g.stroke(); } });
  const wcm = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), basic(0xdddddd, { map: wc.tex })); wcm.position.set(1.15, 2.1, -1.58); scene.add(wcm); }
  const fr = canvasTex(256, 200, (g, w, h) => { g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f9a5a'; g.lineWidth = 8; g.beginPath(); g.moveTo(20, 160); g.lineTo(80, 120); g.lineTo(130, 140); g.lineTo(230, 40); g.stroke(); });
  scene.add(box(0.62, 0.5, 0.03, 0x5a3a24, [1.85, 1.45, -1.58], { outline: 0.008 })); scene.add(plane(0.54, 0.42, basic(0xdddddd, { map: fr.tex }), [1.85, 1.7, -1.56]));
  // desk + props
  scene.add(box(3.2, 0.74, 1.0, 0x5a3c2a, [0, 0, -0.45], { outline: 0.015 }));
  scene.add(box(3.26, 0.05, 1.05, 0x6d4a34, [0, 0.74, -0.45], { outline: 0.012 }));
  const scr = canvasTex(1280, 800, null);
  scene.add(box(1.25, 0.8, 0.06, 0x15161b, [0, 0.82, -0.75], { outline: 0.014 }));
  scene.add(box(0.12, 0.1, 0.12, 0x15161b, [0, 0.74, -0.72], { outline: 0.01 }));
  { const sm = basic(0xffffff, { map: scr.tex }); sm.color.setScalar(0.85); scene.add(plane(1.16, 0.72, sm, [0, 1.22, -0.718])); }
  const scrGlow = pointLight(0xbfe8ff, 2.4, 3, [0, 1.2, -0.3]); scene.add(scrGlow);
  // sticky notes on the monitor bezel (cfg.stickies: false removes them, e.g. when the screen header must read in close-up)
  for (const [x, y, c, rz] of (cfg.stickies === false ? [] : [[0.52, 1.5, '#ffe36a', 0.1], [-0.55, 1.48, '#ff9ac0', -0.08], [0.56, 1.0, '#9ae0ff', 0.05]])) { const st = canvasTex(64, 64, (g) => { g.fillStyle = c; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 3; i++) g.fillRect(10, 16 + i * 14, 40, 4); }); scene.add(plane(0.12, 0.12, basic(0xdddddd, { map: st.tex }), [x, y, -0.712], [0, 0, rz])); }
  if (!cfg.keyboard) {
    scene.add(box(0.7, 0.025, 0.2, 0x2b2c31, [-0.05, 0.765, -0.2], { outline: 0.006 }));
    scene.add(box(0.08, 0.025, 0.12, 0x2b2c31, [0.5, 0.765, -0.15], { outline: 0.005 }));
  }
  const mug = cyl(0.05, 0.045, 0.12, 0xe9e2d6, [-0.8, 0.765, -0.25], { outline: 0.006 }); scene.add(mug);
  const steamT = canvasTex(64, 256, (g) => { g.clearRect(0, 0, 64, 256); g.strokeStyle = 'rgba(255,250,240,0.6)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 20; i++) { const y = 250 - i * 12, x = 32 + Math.sin(i * 0.7) * 10; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
  const steam = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.24), new THREE.MeshBasicMaterial({ map: steamT.tex, transparent: true, depthWrite: false, toneMapped: false })); steam.position.set(-0.8, 1.0, -0.25); scene.add(steam);
  scene.add(cyl(0.05, 0.05, 0.12, 0x3a5a8a, [0.95, 0.765, -0.5], { outline: 0.006 }));
  for (let i = 0; i < 4; i++) { const p = cyl(0.005, 0.005, 0.16, [0xd0a02f, 0xc03a3a, 0x2f6fd0, 0x222222][i], [0.93 + (i % 2) * 0.03, 0.84, -0.52 + (i > 1 ? 0.03 : 0)], { outline: 0 }); p.rotation.z = (i - 1.5) * 0.15; scene.add(p); }
  for (let k = 0; k < 4; k++) scene.add(box(0.32, 0.012, 0.24, [0xf2ece0, 0xe8e0d0][k % 2], [-1.15 + k * 0.01, 0.77 + k * 0.012, -0.4], { outline: 0.004 }));
  scene.add(cyl(0.09, 0.11, 0.04, 0x2b2b2b, [1.25, 0.765, -0.6], { outline: 0.008 }));
  scene.add(cyl(0.012, 0.012, 0.3, 0xb8962e, [1.25, 0.79, -0.6], { outline: 0.005 }));
  scene.add(box(0.3, 0.08, 0.12, mat(0x2d6a44), [1.2, 1.1, -0.58], { outline: 0.01 }));
  scene.add(glow(0xffc070, 0.5, [1.2, 1.05, -0.55], 0.55));
  scene.add(pointLight(0xffb060, 3, 3, [1.15, 1.0, -0.4]));
  scene.add(new THREE.HemisphereLight(0x8a90b8, 0x2a1810, 0.35));
  // envelopes flying out of the screen toward the camera
  const envT = canvasTex(128, 88, (g, w, h) => { g.fillStyle = '#fbf6ea'; g.fillRect(4, 4, w - 8, h - 8); g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8); g.beginPath(); g.moveTo(4, 4); g.lineTo(w / 2, h * 0.6); g.lineTo(w - 4, 4); g.stroke(); g.fillStyle = '#d92a20'; g.beginPath(); g.arc(w / 2, h * 0.6, 9, 0, Math.PI * 2); g.fill(); });
  const envs = []; const RE = rng(33);
  for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.083), new THREE.MeshBasicMaterial({ map: envT.tex, side: THREE.DoubleSide, toneMapped: false })); m.visible = false; scene.add(m); envs.push({ m, t0: i * 0.055, v: [(RE() - 0.5) * 1.6, (RE() - 0.3) * 0.9, 0.9 + RE() * 0.8], spin: [(RE() - 0.5) * 8, (RE() - 0.5) * 8, (RE() - 0.5) * 8] }); }
  // optional office chair for a seated figure: cfg.chair = [x, z]
  if (cfg.chair) {
    const [cx, cz] = cfg.chair;
    scene.add(cyl(0.26, 0.26, 0.03, 0x1d1d22, [cx, 0.05, cz], { outline: 0.006 }));
    scene.add(cyl(0.025, 0.025, 0.38, 0x2a2a30, [cx, 0.06, cz], { outline: 0.005 }));
    scene.add(box(0.5, 0.08, 0.46, 0x23262e, [cx, 0.44, cz], { outline: 0.01 }));
    scene.add(box(0.46, 0.5, 0.06, 0x23262e, [cx, 0.55, cz + 0.24], { outline: 0.01 }));
  }
  const cards = placeCast(scene, ctx, cfg.cast ?? {});
  // readable keyboard (+ a seated typist's hands) -- opt-in, see keyboard.js
  let kb = null;
  if (cfg.keyboard) {
    kb = makeKeyboard(scene, cfg.keyboard, cards);
    const [kx, kz] = cfg.keyboard.pos || [-0.2, -0.2];
    const mouse = box(0.06, 0.022, 0.1, 0x6a6f7c, [kx + 0.33, 0.79, kz + 0.02], { outline: 0.004 }); scene.add(mouse);
  }
  // ---- order-entry screen: two fields that can trade places, a side button, a cancel button, a failure stamp
  const B = { qty: '1', unit: 'SHARE', price: '', ...(SC.before || {}) }, A = { qty: '', unit: 'SHARES', price: '', ...(SC.after || {}) };
  function drawOrder(T, cue) {
    const at = (k) => (cue[k] != null && T >= cue[k]);
    const p = cue.swapAt != null ? clamp((T - cue.swapAt) / 0.5) : (cue.state === 'after' ? 1 : 0);
    const swapped = cue.state === 'after' || p >= 1;
    const fail = at('failAt') ? clamp((T - cue.failAt) / 0.15) : 0;
    const shk = at('failAt') && T < cue.failAt + 0.6 ? 1 : 0;
    const key = [Math.round(p * 30), at('sendAt') ? Math.floor((T - cue.sendAt) * 10) : -1, at('cancelAt') ? 1 : 0, Math.round(fail * 10), shk ? Math.floor(T * 30) : 0, Math.floor(T * 4)].join('|');
    scr.draw((g, w, h) => {
      g.save();
      if (shk) g.translate(Math.sin(T * 70) * 8, Math.cos(T * 61) * 6);
      g.fillStyle = '#141a24'; g.fillRect(-20, -20, w + 40, h + 40);
      g.fillStyle = '#26334d'; g.fillRect(0, 0, w, 110);
      g.fillStyle = '#ffffff'; g.font = `62px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(SC.title || 'ORDER ENTRY', 40, 58);
      g.textAlign = 'right'; g.fillStyle = '#ffd34a'; g.font = `62px ${FONT}`; g.fillText(SC.ticker || '', w - 40, 58);
      const rows = [{ label: 'QTY', y: 230 }, { label: 'PRICE', y: 420 }];
      for (const r of rows) {
        g.fillStyle = '#9fb0c8'; g.font = `46px ${HAND}`; g.textAlign = 'left'; g.fillText(r.label, 44, r.y + 70);
        g.fillStyle = swapped ? '#3a1c22' : '#1d2636'; g.fillRect(280, r.y, w - 320, 140);
        g.strokeStyle = swapped ? '#ff5a4a' : '#5a6a86'; g.lineWidth = 6; g.strokeRect(280, r.y, w - 320, 140);
      }
      const field = (txt, unit, y, col, s = 1) => { g.save(); g.translate(320, y + 72); g.scale(s, s); g.textAlign = 'left'; g.font = `104px ${FONT}`; g.fillStyle = col; g.fillText(txt, 0, 4); if (unit) { const tw = g.measureText(txt).width; g.font = `54px ${HAND}`; g.fillStyle = '#c8d4e6'; g.fillText(unit, tw + 24, 12); } g.restore(); };
      if (swapped) { field(A.qty, A.unit, rows[0].y, '#ff6a5a'); field(A.price, '', rows[1].y, '#ff6a5a'); }
      else if (p <= 0) { field(B.qty, B.unit, rows[0].y, '#ffffff'); field(B.price, '', rows[1].y, '#ffffff'); }
      else {
        // the two numbers trade places: qty slides down into price, price slides up into qty
        const e = p * p * (3 - 2 * p), s = 1 + 0.25 * Math.sin(p * Math.PI);
        field(B.qty, '', rows[0].y + (rows[1].y - rows[0].y) * e, '#ffd34a', s);
        field(B.price, '', rows[1].y + (rows[0].y - rows[1].y) * e, '#ffd34a', s);
      }
      // buttons
      const sent = at('sendAt'), sendFlash = sent && T < cue.sendAt + 0.4 && Math.floor((T - cue.sendAt) * 10) % 2 === 0;
      g.fillStyle = sendFlash ? '#ff8a7a' : '#c0392b'; g.fillRect(40, 620, 520, 140); g.strokeStyle = INKC; g.lineWidth = 8; g.strokeRect(40, 620, 520, 140);
      g.fillStyle = '#ffffff'; g.font = `84px ${FONT}`; g.textAlign = 'center'; g.fillText(SC.side || 'SELL', 300, 694);
      if (sent) { g.fillStyle = '#5ff08e'; g.font = `44px ${HAND}`; g.textAlign = 'left'; g.fillText('SENT', 590, 694); }
      const cp = at('cancelAt');
      g.fillStyle = cp ? '#8a7a2a' : '#3a4152'; g.fillRect(cp ? 724 : 720, cp ? 626 : 620, 520, 140); g.strokeStyle = cp ? '#ffd34a' : INKC; g.lineWidth = 8; g.strokeRect(cp ? 724 : 720, cp ? 626 : 620, 520, 140);
      g.fillStyle = '#ffffff'; g.font = `76px ${FONT}`; g.textAlign = 'center'; g.fillText(SC.cancelText || 'CANCEL', cp ? 984 : 980, cp ? 700 : 694);
      if (fail > 0) {
        g.globalAlpha = fail; const s = 1 + 0.6 * (1 - fail);
        g.translate(w / 2, h / 2 + 20); g.scale(s, s);
        g.font = `120px ${FONT}`; const tw = g.measureText(SC.failText || 'FAILED').width;
        g.fillStyle = INKC; g.fillRect(-tw / 2 - 50, -95, tw + 100, 190); g.fillStyle = '#d92a20'; g.fillRect(-tw / 2 - 40, -85, tw + 80, 170);
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.fillText(SC.failText || 'FAILED', 0, 8);
      }
      g.restore();
    }, key);
  }
  return {
    scene, cards,
    update(st) {
      const T = st.T, cue = st.cue || {};
      const c = cue.emails; const u = c ? clamp((T - c[0]) / (c[1] - c[0])) : 0; const n = Math.floor(1 + (SC.count - 1) * Math.pow(u, 1.6));
      const shake = u > 0 && u < 1;
      if (kb) kb.update(st);
      if (SC.mode === 'order') drawOrder(T, cue);
      else scr.draw((g, w, h) => {
        g.fillStyle = '#141a24'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#26334d'; g.fillRect(0, 0, w, 110); g.fillStyle = '#ffffff'; g.font = `62px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(SC.title, 40, 58);
        g.textAlign = 'right'; g.font = `44px ${HAND}`; g.fillText(SC.time, w - 40, 58);
        const rows = 9;
        for (let i = 0; i < rows; i++) {
          const y = 130 + i * 74;
          g.fillStyle = i === 0 && Math.floor(T * 12) % 2 ? '#4a3a12' : (i % 2 ? '#1c2432' : '#202a3a'); g.fillRect(20, y, w - 40, 66);
          g.fillStyle = '#d92a20'; g.beginPath(); g.arc(56, y + 33, 12, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#c8d4e6'; g.font = `40px ${HAND}`; g.textAlign = 'left'; g.fillText(SC.sender, 90, y + 35);
          g.fillStyle = '#ff5a4a'; g.font = `42px ${FONT}`; g.fillText(SC.subject, 320, y + 36);
        }
        // the unread counter badge, shaking as it climbs
        g.save(); g.translate(w - 170 + (shake ? Math.sin(T * 60) * 6 : 0), h - 150 + (shake ? Math.cos(T * 55) * 5 : 0)); const pulse = shake ? 1 + 0.06 * Math.sin(T * 30) : 1; g.scale(pulse, pulse);
        g.fillStyle = '#d92a20'; g.beginPath(); g.arc(0, 0, 110, 0, Math.PI * 2); g.fill(); g.strokeStyle = INKC; g.lineWidth = 12; g.stroke();
        g.fillStyle = '#ffffff'; g.font = `120px ${FONT}`; g.textAlign = 'center'; g.fillText(String(n), 0, 8); g.restore();
      }, n + '|' + Math.floor(T * 12));
      scrGlow.intensity = 2.2 + Math.sin(T * 23) * 0.2;
      steam.material.opacity = 0.5 + Math.sin(T * 3) * 0.2; steam.position.y = 1.0 + Math.sin(T * 1.7) * 0.02;
      for (const k of envs) {
        const uu = T - (c ? c[0] : 1e9) - k.t0;
        if (!c || uu < 0 || uu > 1.4 || T > c[1] + 1.2) { k.m.visible = false; continue; }
        k.m.visible = true; k.m.position.set(k.v[0] * uu * 0.8, 1.22 + k.v[1] * uu * 0.6, -0.7 + k.v[2] * uu); k.m.rotation.set(k.spin[0] * uu, k.spin[1] * uu, k.spin[2] * uu);
      }
    },
  };
}
