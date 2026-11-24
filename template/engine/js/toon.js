// 3D set helpers: matte lit materials, boxes with an inked outline (inverted hull), canvas textures, glow sprites.
import * as THREE from 'three';

export const INK = 0x121014;
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

export function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, emissiveMap: o.emissiveMap ?? null, transparent: !!o.transparent, opacity: o.opacity ?? 1 });
}
export function basic(color, o = {}) {
  return new THREE.MeshBasicMaterial({ color, map: o.map ?? null, transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: o.depthWrite ?? true, side: o.side ?? THREE.FrontSide, toneMapped: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
}

// box with outline. pos = centre of the bottom face unless o.center
export function box(w, h, d, material, pos = [0, 0, 0], o = {}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === 'object' && material.isMaterial ? material : mat(material, o));
  m.castShadow = o.cast ?? false; m.receiveShadow = o.receive ?? true;
  g.add(m);
  const t = o.outline ?? 0.012;
  if (t > 0) { const hull = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * t, h + 2 * t, d + 2 * t), inkMat); g.add(hull); }
  g.position.set(pos[0], pos[1] + (o.center ? 0 : h / 2), pos[2]);
  g.userData.mesh = m;
  return g;
}
export function cyl(rt, rb, h, material, pos = [0, 0, 0], o = {}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 28, 1, !!o.open), typeof material === 'object' && material.isMaterial ? material : mat(material, o));
  g.add(m);
  const t = o.outline ?? 0.012;
  if (t > 0) g.add(new THREE.Mesh(new THREE.CylinderGeometry(rt + t, rb + t, h + 2 * t, o.seg ?? 28, 1, !!o.open), inkMat));
  g.position.set(pos[0], pos[1] + h / 2, pos[2]);
  g.userData.mesh = m;
  return g;
}
export function plane(w, h, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(...pos); m.rotation.set(...rot);
  return m;
}

// a canvas texture you can redraw: ct.draw((g, w, h) => ...)
export function canvasTex(w, h, drawFn, o = {}) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (o.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...o.repeat); }
  const ct = { canvas, g, tex, w, h, key: null, draw(fn, key) { if (key !== undefined && key === ct.key) return; ct.key = key; g.save(); fn(g, w, h); g.restore(); tex.needsUpdate = true; } };
  if (drawFn) ct.draw(drawFn);
  return ct;
}

// soft round glow (fake bokeh / lamp bloom), additive
const glowTexCache = new Map();
export function glowTex(soft = 0.5) {
  if (glowTexCache.has(soft)) return glowTexCache.get(soft);
  const ct = canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(soft, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  glowTexCache.set(soft, ct.tex); return ct.tex;
}
export function glow(color, size, pos, opacity = 0.8, soft = 0.35) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(soft), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.set(size, size, 1); s.position.set(...pos);
  return s;
}
// a round disc "bokeh ball" (crisp-edged soft disc) for out-of-focus city lights
export function bokehDisc(color, size, pos, opacity = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(0.8), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.set(size, size, 1); s.position.set(...pos);
  return s;
}

export function pointLight(color, intensity, distance, pos, decay = 1.6) {
  const l = new THREE.PointLight(color, intensity, distance, decay); l.position.set(...pos); return l;
}
