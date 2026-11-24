// CITY: pre-dawn exterior. A lit tower in the middle, skyline, street, lamps, cars driving, clouds drifting, a blinking beacon.
// cfg: { sign?: "TEXT ON THE TOWER TOP", signColor?: "#e2bd6e" }
import * as THREE from 'three';
import { mat, basic, box, cyl, plane, canvasTex, glow, pointLight } from '../toon.js';
import { rng } from '../util.js';
import { windowsTex, inkText, fitSize } from './common.js';

export function makeCity(cfg = {}) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1c2546, 0.011);
  const sky = canvasTex(256, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#060b22'); gr.addColorStop(0.45, '#17265a'); gr.addColorStop(0.72, '#45417a'); gr.addColorStop(0.86, '#b0645e'); gr.addColorStop(1, '#f39a58');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(7); g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { g.globalAlpha = 0.3 + R() * 0.6; g.fillRect(R() * w, R() * h * 0.55, 1.5, 1.5); } g.globalAlpha = 1;
  });
  const skyM = basic(0xffffff, { map: sky.tex }); skyM.fog = false;
  scene.add(plane(420, 320, skyM, [0, 110, -110]));
  // painted clouds drifting
  const cloudT = canvasTex(512, 160, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 60 + i * 50, y = 90 + Math.sin(i) * 18, r = 40 + (i % 3) * 18; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(120,110,170,0.75)'); rg.addColorStop(1, 'rgba(120,110,170,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
  const clouds = [];
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 18), new THREE.MeshBasicMaterial({ map: cloudT.tex, transparent: true, depthWrite: false, toneMapped: false, fog: false })); m.position.set(-90 + i * 45, 40 + (i % 3) * 14, -100); scene.add(m); clouds.push(m); }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), basic(0xfff3d6)); moon.material.fog = false; moon.position.set(-26, 52, -105); scene.add(moon);
  scene.add(glow(0xfff0c8, 14, [-26, 52, -104], 0.35));
  scene.add(plane(200, 200, mat(0x1b1d26), [0, 0, -40], [-Math.PI / 2, 0, 0]));
  scene.add(plane(200, 8, mat(0x24262f), [0, 0.01, 2], [-Math.PI / 2, 0, 0]));
  for (let x = -60; x < 60; x += 4) scene.add(plane(1.6, 0.18, basic(0xb9a77a), [x, 0.02, 2], [-Math.PI / 2, 0, 0]));
  scene.add(box(200, 0.18, 4, 0x3a3c46, [0, 0, -3], { outline: 0.02 }));
  const R = rng(3); const skyline = [];
  for (let i = 0; i < 26; i++) {
    const w = 5 + R() * 7, h = 10 + R() * 34, x = -80 + i * 6.4 + R() * 3, z = -48 - R() * 22;
    if (Math.abs(x) < 9 && z > -55) continue;
    const t = windowsTex(100 + i, 6, Math.round(h / 1.6), 0.25, 0.75); skyline.push(t);
    scene.add(box(w, h, 6, mat(0x10172a, { emissive: 0xffffff, emissiveMap: t.tex, ei: 0.55 }), [x, 0, z], { outline: 0.06 }));
    if (R() < 0.35) scene.add(box(0.3, 3, 0.3, 0x0d1220, [x, h, z], { outline: 0.03 }));
  }
  const tw = windowsTex(42, 10, 34, 0.42, 0.8, 512, 1400, '#0f1830');
  scene.add(box(10, 44, 10, mat(0x15203a, { emissive: 0xffffff, emissiveMap: tw.tex, ei: 0.85 }), [0, 0, -16], { outline: 0.08 }));
  scene.add(box(11.2, 1.0, 11.2, 0x2a3350, [0, 44, -16], { outline: 0.08 }));
  scene.add(box(0.4, 6, 0.4, 0x2a3350, [2, 45, -16], { outline: 0.04 }));
  const beacon = glow(0xff3020, 3, [2, 51.2, -16], 0.9); scene.add(beacon);
  const lob = windowsTex(77, 7, 2, 0.95, 0.95, 512, 128, '#2a2016');
  scene.add(box(10.6, 3.2, 10.6, mat(0x2a2f3e, { emissive: 0xffffff, emissiveMap: lob.tex, ei: 0.7 }), [0, 0, -16], { outline: 0.06 }));
  scene.add(box(11.4, 0.3, 11.4, 0x1d2233, [0, 3.2, -16], { outline: 0.05 }));
  scene.add(pointLight(0xffb86a, 40, 30, [0, 2.4, -9.5]));
  for (const x of [-7, 7]) {
    scene.add(cyl(0.08, 0.1, 5, 0x24252c, [x, 0, -1.5], { outline: 0.02 }));
    scene.add(box(0.9, 0.25, 0.4, 0x2b2c33, [x, 5, -1.5], { outline: 0.02 }));
    scene.add(glow(0xffc070, 2.4, [x, 4.95, -1.5], 0.85));
    scene.add(pointLight(0xffb060, 18, 14, [x, 4.7, -1.5]));
  }
  // cars: headlight pairs + a body box sliding along the street
  const cars = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    g.add(box(2.6, 0.7, 1.3, [0xa33c32, 0x2f5a8a, 0xd9a03a][i], [0, 0.25, 0], { outline: 0.02 }));
    g.add(box(1.5, 0.5, 1.2, 0x1a2030, [-0.1, 0.95, 0], { outline: 0.02 }));
    const dir = i % 2 ? -1 : 1;
    for (const zz of [-0.4, 0.4]) { g.add(glow(dir > 0 ? 0xfff2c8 : 0xff3a2a, 0.9, [dir * 1.35, 0.6, zz], 0.9)); }
    g.position.set(0, 0, i % 2 ? 0.9 : 3.0); scene.add(g); cars.push({ g, dir, ph: i * 9 });
  }
  scene.add(new THREE.HemisphereLight(0x6f86c8, 0x2a1d24, 1.0));
  const dir = new THREE.DirectionalLight(0xf0a070, 0.6); dir.position.set(10, 4, -30); scene.add(dir);
  // optional glowing sign on the tower's top band (a company or exchange name from the fact sheet)
  if (cfg.sign) {
    const st = canvasTex(1400, 200, (g, w, h) => { g.clearRect(0, 0, w, h); const s = fitSize(g, cfg.sign, 150, w - 60); inkText(g, cfg.sign, w / 2, h / 2 + 8, s, cfg.signColor || '#e2bd6e', { edge: 22 }); });
    const sm = new THREE.MeshBasicMaterial({ map: st.tex, transparent: true, toneMapped: false, fog: false });
    scene.add(plane(10.4, 1.5, sm, [0, 42.4, -10.9]));
    scene.add(glow(0xffcf80, 9, [0, 42.4, -10.6], 0.18));
  }
  return { scene, cards: {}, update(st) {
    const T = st.T;
    for (const c of cars) c.g.position.x = c.dir * (-30 + ((T * 9 + c.ph) % 60));
    clouds.forEach((m, i) => { m.position.x = -90 + i * 45 + T * 1.5; });
    beacon.material.opacity = Math.sin(T * 5) > 0.3 ? 0.95 : 0.05;
    const fl = Math.floor(T * 5); tw.redraw(fl);
  } };
}
