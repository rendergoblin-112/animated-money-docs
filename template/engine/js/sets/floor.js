// TRADING FLOOR: rows of desks with traders, a big loss board, ticker walls, an LED strip, a wall clock with a brass bell,
// a hero monitor that counts orders, papers tumbling, a trader walking across.
// cfg: {
//   sign: "COMPANY NAME" (wall sign), signColor,
//   board: { label: "MORE THAN", value: 460000000, currency: "$" }   rolled by the shot cue boardRoll: [t0, t1]
//   boardTicker: ["ABC ▼", ...]   scrolling line on the board (fictional or factual tickers)
//   tickers: ["PIKE", ...]        16 names on the side ticker walls (keep them fictional)
//   clock: { h: 9, m: 30 }         the minute hand snaps onto this time at the shot cue clockAt
//   monitor: { title, count, rows: [...], note, status, perRow }   hero monitor, counted up by the shot cue orders: [t0, t1]
//   cast: { castId: { pos, worldH } }  defaults to the bell trader by the clock
// }
import * as THREE from 'three';
import { mat, basic, box, cyl, plane, canvasTex, glow, pointLight } from '../toon.js';
import { Card, drawPerson, bgPerson } from '../chars.js';
import { rng, clamp, easeOut, fmtMoney, fmtInt, noise1 } from '../util.js';
import { INKC, FONT, HAND, inkText, fitSize, paint, windowsTex, chartTex, paperField, placeCast } from './common.js';

const TK_DEFAULT = ['PIKE', 'QUAY', 'RIFT', 'MOSS', 'NOVA', 'HALO', 'IRON', 'JOLT', 'LUME', 'DYNA', 'CRUX', 'GRID', 'KITE', 'FLUX', 'BOLT', 'OAK'];

export function makeFloor(cfg = {}, ctx) {
  const TK = cfg.tickers || TK_DEFAULT;
  const BOARD = { label: 'MORE THAN', value: 0, currency: '$', ...(cfg.board || {}) };
  const TICK = cfg.boardTicker || ['NYSE ▲', 'SPY ▲', 'DIA ▼', 'QQQ ▲', 'IWM ▼', 'VIX ▲', 'DOW ▼'];
  const CLOCK = { h: 9, m: 30, ...(cfg.clock || {}) };
  const MON = { title: 'ORDERS IN', count: 100, rows: ['BUY 100', 'BUY 50', 'SELL 200', 'BUY 25', 'SELL 75'], note: 'order', status: 'OK', ...(cfg.monitor || {}) };
  const perRow = MON.perRow ?? Math.max(1, Math.round(MON.count / 10));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x120c0a, 9, 26);
  const carpet = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#22343a', { top: '#25393f', bottom: '#1d2d32', seed: 3, strokes: 0 }); g.strokeStyle = '#1a282d'; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 128 + 54, j * 128 + 54, 20, 20); }, { repeat: [12, 10] });
  scene.add(plane(26, 22, mat(0xffffff, { map: carpet.tex }), [0, 0, -4], [-Math.PI / 2, 0, 0]));
  const wood = canvasTex(512, 512, (g, w, h) => { paint(g, w, h, '#4a3124', { top: '#56392a', bottom: '#3a261c', seed: 5 }); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(255,220,180,0.05)' : 'rgba(0,0,0,0.05)'; g.fillRect(i * 64, 0, 64, h); g.fillStyle = INKC; g.fillRect(i * 64, 0, 4, h); } g.fillStyle = '#2e1f17'; g.fillRect(0, h * 0.62, w, 10); }, { repeat: [8, 2] });
  scene.add(plane(26, 6, mat(0xffffff, { map: wood.tex }), [0, 3, -9]));
  scene.add(plane(22, 6, mat(0xffffff, { map: wood.tex }), [9, 3, -2], [0, -Math.PI / 2, 0]));
  const city = windowsTex(9, 30, 12, 0.35, 0.8, 1600, 600, '#0b1020');
  const winM = basic(0xffffff, { map: city.tex }); winM.color.setScalar(0.75);
  scene.add(plane(22, 4.2, winM, [-8.9, 2.4, -2], [0, Math.PI / 2, 0]));
  for (let z = -12; z <= 8; z += 2.4) scene.add(box(0.2, 4.4, 0.18, 0x2a1d17, [-8.8, 0.3, z], { outline: 0.02 }));
  scene.add(plane(26, 22, mat(0x1a1411), [0, 4.6, -4], [Math.PI / 2, 0, 0]));
  // columns + plants
  for (const [x, z] of [[-7.2, -7.8], [7.2, -7.8], [-7.2, -2.5], [7.2, -2.5]]) {
    scene.add(cyl(0.35, 0.35, 4.6, mat(0x5a4032), [x, 0, z], { outline: 0.02 }));
    scene.add(cyl(0.3, 0.24, 0.5, 0x8a5a3a, [x + 0.7, 0, z + 0.4], { outline: 0.012 }));
    for (let k = 0; k < 5; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0x3f7a44)); lf.position.set(x + 0.7 + Math.cos(k * 1.3) * 0.18, 0.75 + (k % 2) * 0.2, z + 0.4 + Math.sin(k * 1.3) * 0.18); lf.scale.set(1, 1.4, 0.6); scene.add(lf); }
  }
  // big board + side ticker walls + LED ticker strip
  const board = canvasTex(1600, 420, null);
  const boardG = new THREE.Group(); scene.add(boardG);
  boardG.add(box(6.8, 2.0, 0.2, 0x111114, [0, 1.95, -8.9], { outline: 0.03 }));
  const boardM = basic(0xffffff, { map: board.tex }); const boardP = plane(6.5, 1.72, boardM, [0, 2.95, -8.78]); boardG.add(boardP);
  const sign = canvasTex(1400, 200, (g, w, h) => { g.clearRect(0, 0, w, h); if (cfg.sign) { const s = fitSize(g, cfg.sign, 150, w - 40); inkText(g, cfg.sign, w / 2, h / 2 + 8, s, cfg.signColor || '#e2bd6e', { edge: 22 }); } });
  const signM = new THREE.MeshBasicMaterial({ map: sign.tex, transparent: true, toneMapped: false }); signM.color.setScalar(0.95);
  scene.add(plane(4.4, 0.63, signM, [0, 4.25, -8.85]));
  scene.add(glow(0xffcf80, 2.5, [0, 4.25, -8.6], 0.12));
  const tickers = [];
  for (const [sx, seed] of [[-6.2, 1], [6.2, 2]]) {
    const tk = canvasTex(1024, 900, null);
    tk.redraw = (k) => tk.draw((g, w, h) => { const R2 = rng(seed * 7 + k); g.fillStyle = '#06090a'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = 128 + c * 256, y = 110 + r * 215; g.font = `64px ${FONT}`; g.fillStyle = '#e8f4ee'; g.fillText(TK[(r * 4 + c + seed * 5) % TK.length], x, y); g.font = `56px ${FONT}`; const up = R2() < 0.5; g.fillStyle = up ? '#5ff08e' : '#ff6a5a'; g.fillText((up ? '▲' : '▼') + (10 + R2() * 180).toFixed(1), x, y + 72); } }, k);
    tk.redraw(0); tickers.push(tk);
    scene.add(box(4.4, 3.6, 0.15, 0x0d0f12, [sx, 1.2, -8.9], { outline: 0.03 }));
    scene.add(plane(4.2, 3.4, basic(0xffffff, { map: tk.tex }), [sx, 3.0, -8.8]));
    scene.add(pointLight(0x7fe0a8, 3, 5, [sx, 3.0, -7.8]));
  }
  const strip = canvasTex(2048, 64, null);
  scene.add(plane(17, 0.32, basic(0xffffff, { map: strip.tex }), [0, 0.95 + 0.4, -8.86]));
  // clock + brass bell on the right wall
  const clock = canvasTex(512, 512, null);
  const rim = cyl(0.5, 0.5, 0.08, 0x2a2420, [0, 0, 0], { outline: 0.025 }); rim.position.set(8.9, 2.9, -5.5); rim.rotation.z = Math.PI / 2; scene.add(rim);
  const clockM = basic(0xffffff, { map: clock.tex }); clockM.color.setScalar(0.8);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.46, 48), clockM); clockFace.position.set(8.84, 2.9, -5.5); clockFace.rotation.y = -Math.PI / 2; scene.add(clockFace);
  const bell = new THREE.Group(); bell.position.set(8.8, 2.75, -4.65); scene.add(bell);
  bell.add(box(0.1, 0.05, 0.05, 0x3a2a1a, [0.03, 0.2, 0], { outline: 0.006 }));
  const bellCup = cyl(0.025, 0.11, 0.15, mat(0xd9a640, { metal: 0.3, rough: 0.4 }), [0, 0.02, 0], { outline: 0.008 }); bell.add(bellCup);
  scene.add(pointLight(0xffc880, 3.5, 3, [8.0, 3.3, -5.2]));
  const cards = {};
  placeCast(scene, ctx, cfg.cast ?? { bellGuy: { pos: [7.75, 0, -4.35], worldH: 1.6 } }, cards);
  // desks, monitors, phones, paper stacks, traders
  const monitors = [];
  const R = rng(11); let n = 0;
  const heroMon = canvasTex(1024, 640, null);
  for (const z of [-1.6, -3.9, -6.2]) for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    scene.add(box(2.4, 0.74, 0.95, 0x5c3d2b, [x, 0, z], { outline: 0.015 }));
    scene.add(box(2.46, 0.05, 1.0, 0x6d4a34, [x, 0.74, z], { outline: 0.012 }));
    for (const mx of [-0.45, 0.45]) {
      const hero = z === -1.6 && x === -1.5 && mx === 0.45;
      const tex = hero ? heroMon : chartTex(n * 7 + 1, ['up', 'down', 'list'][Math.floor(R() * 3)]);
      if (!hero) monitors.push(tex);
      scene.add(box(0.07, 0.25, 0.07, 0x1a1b20, [x + mx, 0.79, z - 0.2], { outline: 0.01 }));
      scene.add(box(0.66, 0.42, 0.05, 0x15161b, [x + mx, 0.98, z - 0.22], { outline: 0.012 }));
      scene.add(plane(0.6, 0.36, basic(0xffffff, { map: tex.tex }), [x + mx, 1.19, z - 0.193]));
      n++;
    }
    scene.add(box(0.5, 0.025, 0.16, 0x2b2c31, [x - 0.2, 0.765, z + 0.15], { outline: 0.006 }));
    scene.add(box(0.2, 0.06, 0.12, 0x1d1d22, [x + 0.95, 0.765, z - 0.1], { outline: 0.006 })); // desk phone
    scene.add(box(0.06, 0.03, 0.18, 0x1d1d22, [x + 0.95, 0.84, z - 0.1], { outline: 0.005 }));
    for (let k = 0; k < 1 + Math.floor(R() * 3); k++) scene.add(box(0.3, 0.012, 0.22, [0xf2ece0, 0xe8e0d0, 0xf7f0e2][k % 3], [x - 0.95 + R() * 0.1, 0.77 + k * 0.012, z + 0.25], { outline: 0.004 }));
    if (R() < 0.7) scene.add(cyl(0.05, 0.045, 0.11, 0xe9e2d6, [x + 0.75, 0.765, z + 0.2], { outline: 0.006 }));
    for (const mx of [-0.5, 0.5]) {
      if (z === -1.6 && x === -1.5) continue;
      const c = new Card(drawPerson, bgPerson(n * 3 + (mx > 0 ? 1 : 0)), { worldH: 1.5 });
      c.group.position.set(x + mx + (R() - 0.5) * 0.15, 0.32, z + 0.8); scene.add(c.group); cards['bg' + n + (mx > 0 ? 'b' : 'a')] = c; c.phase = R() * 10; c.role = 'bg';
      scene.add(box(0.5, 0.5, 0.08, 0x1d1a1a, [c.group.position.x, 0.42, z + 1.08], { outline: 0.012 }));
    }
  }
  // a trader walking across with papers
  const walker = new Card(drawPerson, bgPerson(5, true), { worldH: 1.65 }); walker.group.position.set(-6, 0, -0.2); scene.add(walker.group); cards.walker = walker; walker.role = 'set';
  for (const z of [-1.6, -3.9]) for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    scene.add(cyl(0.006, 0.006, 1.3, 0x111111, [x, 3.6, z], { outline: 0 }));
    scene.add(cyl(0.1, 0.28, 0.24, mat(0x2d5a3e), [x, 3.36, z], { outline: 0.012, open: true }));
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.26, 28), basic(0xffe2a8)); bulb.rotation.x = Math.PI / 2; bulb.position.set(x, 3.355, z); scene.add(bulb);
    scene.add(glow(0xffc070, 0.7, [x, 3.3, z], 0.45));
    scene.add(pointLight(0xffbb70, 9, 6, [x, 3.15, z]));
  }
  scene.add(new THREE.HemisphereLight(0x8090b8, 0x2a1a12, 0.3));
  scene.add(pointLight(0xffd090, 14, 12, [0, 3.6, -7.0]));
  const papers = paperField(scene, 16, 4, [-4, 4, 0.2, 3.4, -5, -0.5], { size: 0.22 });
  const papersNear = paperField(scene, 6, 9, [-1.2, 1.2, 1.6, 3.6, -4.6, -3.4], { size: 0.25 });
  // clock.label: "" draws no time label (use when the time isn't a sourced fact)
  const clockLabel = CLOCK.label ?? `${CLOCK.h}:${String(CLOCK.m).padStart(2, '0')}`;

  return {
    scene, cards,
    update(st) {
      const T = st.T, cue = st.cue || {};
      // a shot can show a different figure on the same board: cue.board = { label, value, from, currency }
      const BD = cue.board ? { ...BOARD, from: 0, ...cue.board } : { ...BOARD, from: 0 };
      const c0 = cue.boardRoll; let v = 0, rolling = false;
      if (c0) { const u = clamp((T - c0[0]) / (c0[1] - c0[0])); v = BD.from + (BD.value - BD.from) * easeOut(u); rolling = u > 0 && u < 1; }
      // the board shakes while the loss rolls
      boardG.position.set(rolling ? noise1(T * 50, 1) * 0.03 : 0, rolling ? noise1(T * 50, 2) * 0.02 : 0, 0);
      board.draw((g, w, h) => {
        g.fillStyle = '#07080a'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,0.04)'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h);
        g.font = `46px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ff6a5a' : '#5ff08e'; g.fillText(TICK[i % TICK.length], 40 + i * 240 - ((T * 160) % 240), 52); }
        g.textAlign = 'center';
        if (c0 && T >= c0[0] - 0.4 && BD.label) { g.font = `64px ${FONT}`; g.fillStyle = '#ffd34a'; g.fillText(BD.label, w / 2, 150); }
        const pulse = rolling ? 1 + 0.04 * Math.sin(T * 40) : 1;
        g.save(); g.translate(w / 2, 292); g.scale(pulse, pulse);
        const txt = (v > 0 ? '-' : '') + fmtMoney(v, BD.currency);
        g.font = `176px ${FONT}`; const s = g.measureText(txt).width > w - 60 ? fitSize(g, txt, 176, w - 60) : 176;
        g.font = `${s}px ${FONT}`; g.fillStyle = v > 0 ? '#ff3b30' : '#5ff08e'; g.shadowColor = g.fillStyle; g.shadowBlur = 26;
        g.fillText(txt, 0, 0); g.restore();
        if (rolling && Math.floor(T * 8) % 2) { g.fillStyle = 'rgba(255,40,30,0.12)'; g.fillRect(0, 0, w, h); }
      }, Math.round(v / 1e5) + '|' + Math.floor(T * 15));
      const tk = Math.floor(T * 2); for (const x of tickers) x.redraw(tk);
      strip.draw((g, w, h) => { g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); g.font = `44px ${FONT}`; g.textBaseline = 'middle'; for (let i = 0; i < 14; i++) { g.fillStyle = i % 3 ? '#ffb43a' : '#5ff08e'; g.fillText(TK[i % TK.length] + (i % 2 ? ' ▲ 2.4' : ' ▼ 1.1'), i * 220 - ((T * 220) % 220), 34); } }, Math.floor(T * 15));
      const mk = Math.floor(T * 6); monitors.forEach((m, i) => { if ((i + mk) % 3 === 0) m.redraw(mk + i); });
      // clock: the minute hand jumps onto the cue time, then the bell rings
      const ca = cue.clockAt ?? -1; const ringing = ca > 0 && T > ca && T < ca + 1.6;
      clock.draw((g) => {
        g.fillStyle = '#f3ecdc'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill(); g.strokeStyle = INKC; g.lineWidth = 14; g.stroke();
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 6 : 12; g.beginPath(); g.moveTo(256 + Math.sin(a) * 210, 256 - Math.cos(a) * 210); g.lineTo(256 + Math.sin(a) * 236, 256 - Math.cos(a) * 236); g.stroke(); }
        const mins = (CLOCK.m - 1) + (T > ca && ca > 0 ? 1 : 0) + (T > ca - 0.6 && T <= ca ? 0.6 * clamp((T - (ca - 0.6)) / 0.6) : 0);
        const ma = mins / 60 * Math.PI * 2, ha = (CLOCK.h + mins / 60) / 12 * Math.PI * 2;
        g.lineCap = 'round'; g.lineWidth = 14; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(ha) * 120, 256 - Math.cos(ha) * 120); g.stroke();
        g.lineWidth = 9; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(ma) * 190, 256 - Math.cos(ma) * 190); g.stroke();
        g.fillStyle = '#c0392b'; g.beginPath(); g.arc(256, 256, 16, 0, Math.PI * 2); g.fill();
        if (clockLabel) { g.font = `58px ${FONT}`; g.fillStyle = INKC; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(clockLabel, 256, 360); }
      }, Math.round((T > ca && ca > 0 ? 1 : 0) * 100 + clamp((T - (ca - 0.6)) / 0.6) * 20));
      clockFace.rotation.x = ringing ? Math.sin(T * 40) * 0.05 : 0;
      bell.rotation.x = ringing ? Math.sin(T * 38) * 0.35 * (1 - (T - ca) / 1.6) : 0;
      // hero monitor: counts the orders up
      const oc = cue.orders; const k = oc ? Math.floor(MON.count * easeOut(clamp((T - oc[0]) / (oc[1] - oc[0])))) : 0;
      heroMon.draw((g, w, h) => {
        g.fillStyle = '#0a1410'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#123224'; g.fillRect(0, 0, w, 100);
        g.font = `60px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#e8fff0'; g.fillText(MON.title, 36, 54);
        g.textAlign = 'right'; g.fillStyle = '#ffd34a'; g.font = `78px ${FONT}`; g.fillText(fmtInt(k), w - 36, 56);
        const rows = Math.min(10, Math.ceil(k / perRow)), off = Math.floor(T * 8);
        for (let i = 0; i < rows; i++) { const y = 130 + i * 50; g.fillStyle = i === rows - 1 && Math.floor(T * 10) % 2 ? 'rgba(255,211,74,0.25)' : 'rgba(95,240,142,0.14)'; g.fillRect(30, y, w - 60, 38); g.fillStyle = '#5ff08e'; g.font = `32px ${HAND}`; g.textAlign = 'left'; g.fillText(MON.rows[(i + off) % MON.rows.length], 50, y + 20); g.fillStyle = '#9fc8b4'; g.fillText(MON.note, 330, y + 20); g.textAlign = 'right'; g.fillText(MON.status, w - 60, y + 20); }
        if (Math.floor(T * 30) % 7 === 0) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, w, h); }
      }, k + '|' + Math.floor(T * 10));
      papers(T); papersNear(T);
      // walker: crosses the front of the floor, walk cycle
      walker.group.position.x = -6 + ((T * 1.4) % 12);
      walker.set({ light: { x: 0, y: -1, color: '#ffd090', rim: 0.45 }, walk: (T * 1.8) % 1, bob: Math.abs(Math.sin(T * Math.PI * 3.6)) * -14, armL: { e: [330, 1000], h: [380, 1120] }, armR: { e: [720, 960], h: [640, 900], prop: 'papers' }, eyes: 'open', mouth: 'X', look: [1, 0], t: T }, 0.8);
    },
    anchors: { clock: [8.84, 2.9, -5.5] },
  };
}
