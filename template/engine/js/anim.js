// Keyframed acting. A pose is a plain object of drawing parameters (numbers, [x,y] points, and a few labels such as eyes/hand).
// interp(keys, t) blends between neighbouring keys with easing, so every frame is a new in-between drawing (no pose swaps).
// Time is quantised to 15 fps ("on twos"), which is how drawn animation is usually timed; mouths still follow the voice per frame.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const EASE = {
  io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  back: (t) => { const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },   // overshoot then settle
  snap: (t) => (t < 1 ? 0 : 1),
};
function blend(a, b, u) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i], u));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? blend(a[k], b[k], u) : (u < 0.5 ? (a[k] ?? b[k]) : (b[k] ?? a[k]));
    return o;
  }
  return u < 0.35 ? (a ?? b) : (b ?? a); // labels switch early in the move (eyes, hand shapes)
}
const deepMerge = (a, b) => { if (!b) return a; const o = { ...a }; for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? deepMerge(a[k], b[k]) : b[k]; return o; };
// keys: [[t, poseObjOrName, dur?, ease?]] -- the move INTO a key starts at key.t and lasts dur (default 0.2 s)
export function interp(keys, lib, t, base = {}) {
  const tq = Math.floor(t * 15) / 15;
  // a pose named by string inherits its `use` chain too (so a pose built on "shock" keeps shock's arms)
  const res = (p) => {
    if (typeof p === 'string' && !lib[p]) throw new Error(`unknown pose "${p}" (poses: ${Object.keys(lib).join(', ')})`);
    const o = typeof p === 'string' ? lib[p] : p;
    if (o.use && !lib[o.use]) throw new Error(`pose uses unknown pose "${o.use}" (poses: ${Object.keys(lib).join(', ')})`);
    return o.use ? deepMerge(res(o.use), o) : o;
  };
  const P = (p) => deepMerge(base, res(p));
  let i = 0; for (let j = 0; j < keys.length; j++) if (keys[j][0] <= tq) i = j;
  if (tq < keys[0][0]) return P(keys[0][1]);
  const [k0, p1, dur = 0.2, ease = 'io'] = keys[i];
  const prev = i > 0 ? P(keys[i - 1][1]) : P(p1);
  const u = clamp((tq - k0) / Math.max(1e-3, dur));
  return blend(prev, P(p1), EASE[ease](u));
}
export { deepMerge };
