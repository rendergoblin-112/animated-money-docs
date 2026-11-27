// Engine entry: builds the project's sets, then renders any frame on demand with window.renderFrame(f).
// Driven by tools/render.mjs, which serves the project data: /tl.json (resolved shot list), /project.json, /cast.json
// (default cast merged with the project's overrides), /voice.json and /visemes.json.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { SETS } from './sets/index.js';
import { interp } from './anim.js';
import { bgPerson } from './chars.js';
import { FPS, clamp, easeOut, fmtInt, noise1 } from './util.js';
import * as OV from './overlay.js';

const W = 1920, H = 1080;
setTimeout(async () => { try { await main(); } catch (e) { window.__error = (e && e.stack) || String(e); console.error(window.__error); } }, 0);

// depth of field that respects the cut-out alpha of the character cards
class DOFPass extends BokehPass {
  render(renderer, writeBuffer, readBuffer) {
    const swaps = [], hidden = [], md = this.materialDepth;
    this.scene.traverse((o) => {
      if (!o.visible) return;
      if (o.isSprite || (o.isMesh && o.material.transparent && !o.material.alphaTest)) { hidden.push(o); return; }
      if (!o.isMesh) return;
      let dm = md;
      if (o.material.alphaTest > 0) dm = o.userData.depthMat || (o.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: o.material.map, alphaTest: 0.5, side: THREE.DoubleSide, blending: THREE.NoBlending }));
      else if (o.material.side === THREE.BackSide) dm = this._back || (this._back = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.BackSide, blending: THREE.NoBlending }));
      swaps.push([o, o.material]); o.material = dm;
    });
    for (const o of hidden) o.visible = false;
    const sm = this.scene.overrideMaterial; this.scene.overrideMaterial = null;
    try {
      const old = new THREE.Color(); renderer.getClearColor(old); const oa = renderer.getClearAlpha(), oac = renderer.autoClear;
      renderer.autoClear = false; renderer.setClearColor(0xffffff); renderer.setClearAlpha(1);
      renderer.setRenderTarget(this.renderTargetDepth); renderer.clear(); renderer.render(this.scene, this.camera);
      for (const [o, m] of swaps) o.material = m; swaps.length = 0;
      for (const o of hidden) o.visible = true; hidden.length = 0;
      this.uniforms.tColor.value = readBuffer.texture; this.uniforms.nearClip.value = this.camera.near; this.uniforms.farClip.value = this.camera.far;
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); renderer.clear(); this.fsQuad.render(renderer);
      renderer.setClearColor(old); renderer.setClearAlpha(oa); renderer.autoClear = oac;
    } finally { for (const [o, m] of swaps) o.material = m; for (const o of hidden) o.visible = true; this.scene.overrideMaterial = sm; }
  }
}

// ---------------------------------------------------------------- screen-space BRUSH INK on the sets
// A normal + depth pre-pass, then every depth break (silhouettes, overlaps) and crease (normal change) gets a black line.
// The line's width varies along the screen like a loaded brush (low-frequency noise), wobbles slightly (sample jitter),
// is heavier on near objects and fades out into the fog, so walls, desks, racks and props read as drawn, like the cast.
// Character cards are drawn as flat camera-facing normals (their own brush lines do the work); sprites, transparent meshes,
// inverted-hull outlines and anything tagged userData.noInk are left out.
const INK_FRAG = `uniform sampler2D tColor, tNormal, tDepth; uniform vec2 res; uniform float near, far, width, inkFar, seed, strength; varying vec2 vUv;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
  vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
  void main(){
    vec4 col = texture2D(tColor, vUv);
    float d0 = lin(vUv);
    if (d0 > far * 0.95) { gl_FragColor = col; return; }
    vec2 px = 1.0 / res;
    // brush: width breathes along the screen; slight wobble of the sampling point
    float b = vn(vUv * vec2(7.0, 4.0) + seed) * 0.65 + vn(vUv * vec2(23.0, 17.0) + seed * 1.7) * 0.35;
    float w = width * (0.55 + 0.95 * b) * clamp(pow(2.6 / d0, 0.3), 0.7, 1.55);
    vec2 uv = vUv + (vec2(vn(vUv * 90.0 + seed), vn(vUv * 90.0 + seed + 7.3)) - 0.5) * px * 1.4;
    float w0 = 1.0 / lin(uv); vec3 n0 = nrm(uv);
    float e = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 o = (i == 0 ? vec2(1, 0) : i == 1 ? vec2(0, 1) : i == 2 ? vec2(0.707, 0.707) : vec2(0.707, -0.707)) * px * w;
      float wa = 1.0 / lin(uv + o), wb = 1.0 / lin(uv - o);
      float dd = abs(wa + wb - 2.0 * w0) / w0;                  // 2nd difference of 1/z: zero on any flat plane
      e = max(e, smoothstep(0.006, 0.03, dd));
      float nd = max(1.0 - dot(n0, nrm(uv + o)), 1.0 - dot(n0, nrm(uv - o)));
      e = max(e, smoothstep(0.22, 0.5, nd));
    }
    e *= strength * (1.0 - smoothstep(inkFar * 0.55, inkFar, d0));
    gl_FragColor = vec4(mix(col.rgb, vec3(0.071, 0.063, 0.078), e), col.a);
  }`;
class InkPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene; this.camera = camera;
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }); this.rt.depthTexture = new THREE.DepthTexture(W, H); this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.nm = { [THREE.FrontSide]: new THREE.MeshNormalMaterial({ side: THREE.FrontSide }), [THREE.BackSide]: new THREE.MeshNormalMaterial({ side: THREE.BackSide }), [THREE.DoubleSide]: new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }) };
    this.uniforms = { tColor: { value: null }, tNormal: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, res: { value: new THREE.Vector2(W, H) }, near: { value: 0.05 }, far: { value: 300 }, width: { value: 1.5 }, inkFar: { value: 20 }, seed: { value: 0 }, strength: { value: 0.92 } };
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: INK_FRAG }));
  }
  render(renderer, writeBuffer, readBuffer) {
    const swaps = [], hidden = [];
    this.scene.traverse((o) => {
      if (!o.visible) return;
      if (o.isSprite || o.userData.hull || o.userData.noInk || (o.isMesh && o.material.transparent && !o.material.alphaTest)) { hidden.push(o); return; }
      if (!o.isMesh) return;
      let m = this.nm[o.material.side ?? THREE.FrontSide];
      if (o.material.alphaTest > 0) m = o.userData.inkMat || (o.userData.inkMat = new THREE.ShaderMaterial({ uniforms: { map: { value: o.material.map } }, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0); }' }));
      swaps.push([o, o.material]); o.material = m;
    });
    for (const o of hidden) o.visible = false;
    const fog = this.scene.fog, bg = this.scene.background; this.scene.fog = null; this.scene.background = null;
    try {
      const oc = new THREE.Color(); renderer.getClearColor(oc); const oa = renderer.getClearAlpha();
      renderer.setClearColor(0x8080ff, 1); renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(this.scene, this.camera);
      renderer.setClearColor(oc, oa);
    } finally { for (const [o, m] of swaps) o.material = m; for (const o of hidden) o.visible = true; this.scene.fog = fog; this.scene.background = bg; }
    this.uniforms.tColor.value = readBuffer.texture; this.uniforms.near.value = this.camera.near; this.uniforms.far.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}
// how far the ink reaches into each set (metres; it fades out between 55% and 100% of this) and its width in pixels.
// A set's config can override them: "ink": { "far": 12, "width": 1.8 }, or "ink": false for no set ink.
const INK_FAR = { city: 140, floor: 17, server: 11, rack: 3.2, desk: 6, den: 9, court: 12 };
const INK_W = { city: 1.4 };

async function main() {
  const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`cannot load ${u} (${r.status})`); return r.json(); };
  const [TL, P, CAST, V, VIS] = await Promise.all([get('/tl.json'), get('/project.json'), get('/cast.json'), get('/voice.json'), get('/visemes.json')]);
  for (const f of ['80px Hand', '80px Lucky']) await document.fonts.load(f);

  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('gl').appendChild(renderer.domElement);
  const gl = renderer.getContext(); const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  window.__info = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  const ov = document.getElementById('ov').getContext('2d');

  // cast designs: a design can be literal, or {"bgPerson": [index, front]} for a generated extra
  const design = (id) => { const d = CAST[id].design; return d.bgPerson ? { ...bgPerson(...d.bgPerson), ...(d.override || {}) } : d; };
  const ctx = { cast: CAST, design };
  // build the sets in the order the project lists them (order matters for identical renders)
  const sets = {};
  for (const [name, cfg] of Object.entries(P.sets || {})) {
    const kind = cfg.kind || name;
    if (!SETS[kind]) throw new Error(`project.json: unknown set "${kind}" (sets: ${Object.keys(SETS).join(', ')})`);
    sets[name] = SETS[kind](cfg, ctx);
  }
  const kindOf = {}; for (const [name, cfg] of Object.entries(P.sets || {})) kindOf[name] = cfg.kind || name;
  for (const sh of TL.shots) {
    if (sh.type) continue;
    if (!sets[sh.set]) throw new Error(`shot ${sh.id}: set "${sh.set}" is not built (add it to project.json "sets")`);
    const have = sets[sh.set].fgGroups || [];
    for (const n of sh.fg || []) if (have.length && !have.includes(n)) throw new Error(`shot ${sh.id}: foreground "${n}" is not in set ${sh.set} (it has: ${have.join(', ')})`);
    if (sh.title && (sh.title.style ?? 'brush') === 'brush') {
      const miss = OV.missingGlyphs(sh.title.words.map((w) => w.text).join(''));
      if (miss.length) throw new Error(`shot ${sh.id}: the brush title alphabet has no ${miss.map((c) => JSON.stringify(c)).join(' ')} (it has ${OV.BRUSH_CHARS}); reword, or set "style": "marker" on the title`);
    }
  }
  const first = Object.values(sets)[0];
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.05, 300);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  const renderPass = new RenderPass(first.scene, camera); composer.addPass(renderPass);
  const ink = new InkPass(first.scene, camera); composer.addPass(ink);
  const dof = new DOFPass(first.scene, camera, { focus: 3, aperture: 0.01, maxblur: 0.01 }); composer.addPass(dof);
  // bloom kept low (0.32) so lamps glow without washing out the lit faces; project.json "bloom": [strength, radius, threshold]
  const BL = P.bloom || [0.32, 0.4, 0.88];
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), BL[0], BL[1], BL[2]); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // grade: true blacks, more saturation (more again on close-ups), mid-tone contrast, highlight shoulder, vignette
  const G = { sat: 1.35, satClose: 1.45, vig: 0.38, vigClose: 0.48, warm: 0.03, lift: 0.0, ...(P.grade || {}) };
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, lift: { value: 0.0 }, warm: { value: 0 }, sat: { value: 1.35 }, gam: { value: 1.12 }, con: { value: 1.08 }, vig: { value: 0.4 }, aspect: { value: W / H } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float lift, warm, sat, vig, aspect, gam, con; varying vec2 vUv;
      vec3 shoulder(vec3 x){ float k = 0.8; vec3 s = k + (1.0 - k) * 0.78 * (1.0 - exp(-(x - k) / ((1.0 - k) * 0.78))); return mix(x, s, step(k, x)); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = shoulder(c); c = pow(max(c, 0.0), vec3(gam));
        c = clamp((c - 0.5) * con + 0.5, 0.0, 1.0);
        float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, sat);
        c.r *= 1.0 + warm; c.b *= 1.0 - warm;
        vec2 p = (vUv - 0.5) * vec2(aspect, 1.0); float r = length(p) / 0.95; c *= 1.0 - vig * smoothstep(0.4, 1.25, r);
        c = lift + c * (1.0 - lift);
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
  });
  composer.addPass(grade);
  const whip = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, amt: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amt; varying vec2 vUv;
      void main(){ if (amt <= 0.001) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
        vec3 s = vec3(0.0); for (int i = 0; i < 32; i++) { float o = (float(i) / 31.0 - 0.5) * amt; s += texture2D(tDiffuse, vUv + vec2(o, 0.0)).rgb; }
        gl_FragColor = vec4(s / 32.0, 1.0); }`,
  });
  composer.addPass(whip);

  const mouthOf = (who, f) => { const v = VIS[who]; if (!v) return null; const i = f - v.f0; return i >= 0 && i < v.shapes.length ? v.shapes[i] : null; };
  const speaking = (who, T) => V.lines.some((l) => l.speaker === who && T >= l.start && T <= l.end);
  function shotAt(f) { let s = TL.shots[0]; for (const x of TL.shots) if (x.f0 <= f) s = x; return s; }

  function placeCamera(sh, t, f) {
    const c = sh.cam, dur = sh.end - sh.start, m = sh.move || {};
    const pos = new THREE.Vector3(...c.pos), look = new THREE.Vector3(...c.look);
    if (m.pan) { const u = t / dur - 0.5; for (const k of [0, 1, 2]) { pos.setComponent(k, pos.getComponent(k) + m.pan[k] * u); look.setComponent(k, look.getComponent(k) + m.pan[k] * u); } }
    const shaking = sh.cue?.shake && (sh.cue.awake || (sh.cue.wakeAt != null && sh.start + t > sh.cue.wakeAt));
    if (shaking) { look.x += noise1(t * 40, 1) * 0.007; look.y += noise1(t * 40, 2) * 0.007; }
    // the camera jolts while the loss board rolls (cue.rollShake: false keeps a wide shot steady while the board rolls in it)
    if (sh.cue?.boardRoll && sh.cue.rollShake !== false && sh.start + t > sh.cue.boardRoll[0]) { look.x += noise1(t * 30, 3) * 0.01; look.y += noise1(t * 30, 4) * 0.008; }
    if (sh.cue?.shakeAt != null && sh.start + t > sh.cue.shakeAt && sh.start + t < sh.cue.shakeAt + (sh.cue.shakeFor ?? 0.6)) { look.x += noise1(t * 40, 5) * 0.009; look.y += noise1(t * 40, 6) * 0.008; }
    camera.position.copy(pos); camera.fov = c.fov; camera.lookAt(look);
    let wamt = 0; const fi = f - sh.f0;
    if (sh.whipIn && fi < 8) { const u = (fi + 1) / 8; camera.rotateY(-(1 - easeOut(u)) * 0.55); wamt = (1 - u) * 0.12; }
    const nx = TL.shots[TL.shots.indexOf(sh) + 1];
    if (nx && nx.whipIn && sh.f1 - f <= 3) { const u = (4 - (sh.f1 - f)) / 4; camera.rotateY(u * u * 0.45); wamt = u * 0.12; }
    whip.uniforms.amt.value = wamt;
    camera.zoom = m.push ? Math.pow(1 + m.push, t) : 1;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }

  function renderFrame(f) {
    f = Math.max(0, Math.min(TL.total - 1, f));
    const T = f / FPS, sh = shotAt(f), t = T - sh.start;
    ov.clearRect(0, 0, W, H);
    if (sh.type === 'card') { OV.typingCard(ov, sh.segs, T, { size: sh.size }); return { shot: sh.id }; }
    if (sh.type === 'chapter') { OV.chapterCard(ov, sh.text, sh.size); return { shot: sh.id }; }
    const S = sets[sh.set];
    placeCamera(sh, t, f);
    if (S.setFg) S.setFg(sh.fg || []);
    S.update({ T, t, shot: sh, cue: sh.cue || {}, camera });
    const tq = Math.floor(T * 15) / 15;
    for (const [name, c] of Object.entries(S.cards)) {
      c.face(camera);
      if (c.role === 'set') continue; // driven by the set itself
      if (c.role === 'bg') {
        // background traders: typing, glancing round, the odd stretch
        const ph = c.phase || 0, k = Math.sin(tq * 9 + ph), turn = Math.sin(tq * 0.9 + ph * 2);
        const stretch = Math.sin(tq * 0.5 + ph) > 0.93;
        c.set({ light: P.bgLight || { x: 0.0, y: -1.0, color: '#ffd090', rim: 0.5, dark: 0.3 }, noLegs: true, t: tq, headDx: Math.round(turn * 22), tilt: turn * 0.06, bob: Math.round(Math.abs(k) * 4),
          armL: stretch ? { e: [300, 800], h: [330, 560], hand: 'open' } : { e: [340, 1000], h: [420 + k * 14, 1100 - Math.abs(k) * 10], hand: 'open' },
          armR: stretch ? { e: [724, 800], h: [694, 560], hand: 'open' } : { e: [684, 1000], h: [600 - k * 14, 1100 - Math.abs(Math.cos(tq * 9 + ph)) * 10], hand: 'open' } }, 0.78);
        continue;
      }
      const C = CAST[c.castId || name]; if (!C) continue;
      c.group.visible = !(sh.hide || []).includes(name);
      const Pz = interp(sh.act?.[name] || [[0, C.rest]], C.poses, T);
      // light: the shot's key light for this character (from the nearest lamp in that framing), else the cast default;
      // armW: the shot's arm weight (thinner in close-ups so an arm doesn't read as a black tube), else the design's
      const st = { ...Pz, armW: sh.armW?.[name], light: sh.light?.[name] || C.light, t: tq };
      if (C.talks) {
        const vm = speaking(name, T) ? mouthOf(name, f) : null;
        // a reaction pose can name its own resting mouth (restMouth: 'OO', 'frown', 'bigSmile', 'flat'...)
        st.mouth = vm || Pz.restMouth || (Pz.shock > 0.3 ? 'OO' : Pz.eyes === 'happy' ? (C.happyMouth || 'smile') : 'X');
      } else if (C.happyMouth) st.mouth = Pz.restMouth || (Pz.eyes === 'happy' ? C.happyMouth : 'X');
      if (C.blink) st.blink = !speaking(name, T) && (Math.floor(T * FPS + (C.blink.offset || 0)) % 79) < 3 && Pz.eyes !== 'happy';
      if (C.breath) st.bob = (Pz.bob || 0) + Math.round(Math.sin(T * C.breath.rate + (C.breath.phase || 0)) * C.breath.amp);
      c.set(st, C.tint ?? 1);
    }
    renderPass.scene = S.scene; dof.scene = S.scene; ink.scene = S.scene;
    const IK = P.sets?.[sh.set]?.ink, kind = kindOf[sh.set];
    ink.enabled = IK !== false;
    ink.uniforms.inkFar.value = IK?.far ?? INK_FAR[kind] ?? 20; ink.uniforms.seed.value = (Math.floor(T * 15) % 3) * 0.37; // the line boils very slightly on twos
    ink.uniforms.width.value = IK?.width ?? INK_W[kind] ?? 2.1;
    dof.enabled = !!sh.dof;
    if (sh.dof) {
      let focus = sh.dof.focus;
      if (sh.dof.target) { const ts = [].concat(sh.dof.target); let z = 0; for (const n of ts) { const c = S.cards[n]; if (!c) throw new Error(`shot ${sh.id}: dof target "${n}" is not in set ${sh.set}`); const p = new THREE.Vector3(); c.group.getWorldPosition(p); p.y += c.headY ?? 1.0; p.applyMatrix4(camera.matrixWorldInverse); z += -p.z; } focus = z / ts.length; }
      dof.uniforms.focus.value = focus; dof.uniforms.aperture.value = sh.dof.aperture; dof.uniforms.maxblur.value = sh.dof.maxblur;
    }
    const close = !!sh.dof?.target;
    grade.uniforms.warm.value = sh.grade?.warm ?? G.warm; grade.uniforms.lift.value = sh.grade?.lift ?? G.lift;
    grade.uniforms.sat.value = close ? G.satClose : G.sat; grade.uniforms.vig.value = close ? G.vigClose : G.vig;
    composer.render();
    // ---- overlay
    if (sh.tag) {
      const tg = sh.tag, u = clamp((T - tg.t0) / Math.max(0.1, tg.t1 - tg.t0));
      OV.tag(ov, tg.text, u, tg.x, tg.y, tg.size, tg.fill || '#ffffff');
      if (tg.arrow && u >= 1) { ov.save(); ov.lineCap = 'round'; ov.lineWidth = 20; ov.strokeStyle = '#141014'; const wob = Math.sin(T * 12) * 6; const p = () => { ov.beginPath(); ov.moveTo(tg.x + 60, tg.y + 30); ov.quadraticCurveTo(tg.x - 40, tg.y + 120 + wob, tg.x - 150, tg.y + 210 + wob); ov.moveTo(tg.x - 150, tg.y + 210 + wob); ov.lineTo(tg.x - 95, tg.y + 205 + wob); ov.moveTo(tg.x - 150, tg.y + 210 + wob); ov.lineTo(tg.x - 138, tg.y + 155 + wob); }; p(); ov.stroke(); ov.lineWidth = 10; ov.strokeStyle = tg.fill; p(); ov.stroke(); ov.restore(); }
    }
    if (sh.counter) {
      const c = sh.counter, u = easeOut(clamp((T - c.t0) / (c.t1 - c.t0)));
      if (T >= c.t0 - 0.2) OV.counter(ov, c.label, (c.prefix || '') + fmtInt(c.from + (c.to - c.from) * u) + (c.plus && u >= 1 ? '+' : ''), c.x ?? 1820, c.y ?? 250, { size: c.size ?? 140, color: c.color || '#ffd34a', shake: u > 0 && u < 1 ? 1 : 0.3, t: T });
    }
    if (sh.ring && T >= sh.ring.at && T < sh.ring.at + 0.9) {
      const a = S.anchors?.[sh.ring.anchor || 'clock']; if (!a) throw new Error(`shot ${sh.id}: ring needs an anchor in set ${sh.set}`);
      const p = new THREE.Vector3(...a).project(camera);
      OV.ringLines(ov, (p.x + 1) / 2 * W, (1 - p.y) / 2 * H, 230, clamp((T - sh.ring.at) / 0.9), 9, sh.ring.text ?? 'RIIING!');
    }
    if (sh.title) OV.titleCard(ov, t, sh.title);
    if (sh.flashIn) { const fi = f - sh.f0; OV.flash(ov, fi === 0 ? 1 : fi === 1 ? 0.55 : 0); }
    return { shot: sh.id };
  }

  window.renderFrame = renderFrame;
  window.__total = TL.total;
  window.__shots = TL.shots.map((s) => ({ id: s.id, start: s.start, end: s.end, f0: s.f0, f1: s.f1, type: s.type || 'pic', set: s.set || null, move: s.move || null }));
  for (const sh of TL.shots) if (!sh.type) renderFrame(sh.f0);
  window.__ready = true;
}
