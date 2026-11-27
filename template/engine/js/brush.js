// Round 3: hand-drawn BRUSH INK for everything drawn on a 2D canvas (characters, Power Peg, props held in hands).
// brushify(ctx) returns a drop-in proxy for a CanvasRenderingContext2D. Path calls are forwarded to the real context (so fill and
// clip work as before) AND recorded as sampled polylines. When stroke() is called with the ink colour, the recorded path is
// redrawn as a brush stroke instead of a uniform line: the width swells and thins along the stroke (low-frequency noise seeded by
// where the stroke sits, so it is stable frame to frame), and open strokes taper at their ends like a brush lifting off.
// Set ctx.taper = [start, end] (0 = no taper, 1 = full) before a stroke to shape one stroke; it resets after each stroke.
const INKS = new Set(['#141014', '#121014']);
const TAU = Math.PI * 2;
const h1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, seed) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return h1(i + seed * 13.1) * (1 - u) + h1(i + 1 + seed * 13.1) * u; };

export function brushify(ctx, opt = {}) {
  const amp = opt.amp ?? 0.32;     // width variation (+-)
  let subs = [], cur = null;
  let taper = null, enabled = true;
  const step = 4;
  const push = (x, y) => { if (!cur) { cur = { pts: [[x, y]], closed: false }; subs.push(cur); return; } const p = cur.pts[cur.pts.length - 1]; const d = Math.hypot(x - p[0], y - p[1]); const n = Math.max(1, Math.ceil(d / step)); for (let i = 1; i <= n; i++) cur.pts.push([p[0] + (x - p[0]) * i / n, p[1] + (y - p[1]) * i / n]); };
  const startAt = (x, y) => { cur = { pts: [[x, y]], closed: false }; subs.push(cur); };
  const last = () => (cur ? cur.pts[cur.pts.length - 1] : null);
  const arcPts = (cx, cy, rx, ry, rot, a0, a1, ccw) => {
    let sweep = ccw ? a0 - a1 : a1 - a0;
    let full = false;
    if (sweep >= TAU - 1e-6) { sweep = TAU; full = true; } else { sweep = ((sweep % TAU) + TAU) % TAU; }
    const dir = ccw ? -1 : 1, n = Math.max(8, Math.ceil((sweep * Math.max(rx, ry)) / step));
    const cr = Math.cos(rot), sr = Math.sin(rot); const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + dir * sweep * i / n; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
    return { out, full };
  };
  const addArc = (cx, cy, rx, ry, rot, a0, a1, ccw) => {
    const { out, full } = arcPts(cx, cy, rx, ry, rot, a0, a1, ccw);
    const fresh = !cur || cur.pts.length === 0;
    if (cur) push(out[0][0], out[0][1]); else startAt(out[0][0], out[0][1]);
    for (let i = 1; i < out.length; i++) cur.pts.push(out[i]);
    if (full && fresh) cur.closed = true;
  };
  const rec = {
    beginPath() { subs = []; cur = null; ctx.beginPath(); },
    moveTo(x, y) { startAt(x, y); ctx.moveTo(x, y); },
    lineTo(x, y) { push(x, y); ctx.lineTo(x, y); },
    closePath() { if (cur) { cur.closed = true; const p = cur.pts[0]; cur = { pts: [[p[0], p[1]]], closed: false }; subs.push(cur); } ctx.closePath(); },
    quadraticCurveTo(cx, cy, x, y) {
      const p = last() || [cx, cy]; if (!cur) startAt(p[0], p[1]);
      const n = Math.max(4, Math.ceil((Math.hypot(cx - p[0], cy - p[1]) + Math.hypot(x - cx, y - cy)) / step));
      for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; cur.pts.push([u * u * p[0] + 2 * u * t * cx + t * t * x, u * u * p[1] + 2 * u * t * cy + t * t * y]); }
      ctx.quadraticCurveTo(cx, cy, x, y);
    },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      const p = last() || [c1x, c1y]; if (!cur) startAt(p[0], p[1]);
      const n = Math.max(6, Math.ceil((Math.hypot(c1x - p[0], c1y - p[1]) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(x - c2x, y - c2y)) / step));
      for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; cur.pts.push([u * u * u * p[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x, u * u * u * p[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y]); }
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
    },
    arc(x, y, r, a0, a1, ccw = false) { addArc(x, y, r, r, 0, a0, a1, ccw); ctx.arc(x, y, r, a0, a1, ccw); },
    ellipse(x, y, rx, ry, rot, a0, a1, ccw = false) { addArc(x, y, rx, ry, rot, a0, a1, ccw); ctx.ellipse(x, y, rx, ry, rot, a0, a1, ccw); },
    rect(x, y, w, h) { startAt(x, y); push(x + w, y); push(x + w, y + h); push(x, y + h); push(x, y); cur.closed = true; cur = null; ctx.rect(x, y, w, h); },
    roundRect(x, y, w, h, r = 0) {
      const rr = Math.min(Array.isArray(r) ? r[0] : r, w / 2, h / 2);
      cur = null; const s0 = subs.length;
      startAt(x + rr, y); push(x + w - rr, y); addArc(x + w - rr, y + rr, rr, rr, 0, -Math.PI / 2, 0, false); push(x + w, y + h - rr);
      addArc(x + w - rr, y + h - rr, rr, rr, 0, 0, Math.PI / 2, false); push(x + rr, y + h); addArc(x + rr, y + h - rr, rr, rr, 0, Math.PI / 2, Math.PI, false);
      push(x, y + rr); addArc(x + rr, y + rr, rr, rr, 0, Math.PI, Math.PI * 1.5, false); subs[s0].closed = true; cur = null;
      ctx.roundRect(x, y, w, h, r);
    },
    strokeRect(x, y, w, h) { rec.beginPath(); rec.rect(x, y, w, h); rec.stroke(); },
    stroke(p2d) {
      const ss = typeof ctx.strokeStyle === 'string' ? ctx.strokeStyle.toLowerCase() : '';
      if (p2d || !enabled || !INKS.has(ss) || ctx.globalAlpha < 0.99) { if (p2d) ctx.stroke(p2d); else ctx.stroke(); taper = null; return; }
      drawBrush(); taper = null;
      // restore the native current path (sampled) in case the caller fills it afterwards
      ctx.beginPath(); for (const s of subs) { if (s.pts.length < 2) continue; ctx.moveTo(s.pts[0][0], s.pts[0][1]); for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]); if (s.closed) ctx.closePath(); }
    },
  };
  function drawBrush() {
    const lw = ctx.lineWidth, cap = ctx.lineCap;
    const bins = new Map();
    for (const s of subs) {
      const P = s.pts; if (P.length < 2) continue;
      let L = 0; const cum = [0]; for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(L); }
      if (L < 0.5) continue;
      const seed = (Math.round(P[0][0] / 9) * 7 + Math.round(P[0][1] / 9) * 13 + Math.round(L / 20)) % 97;
      const open = !s.closed;
      const tp = taper || (open ? [0.55, 0.55] : [0, 0]);
      const tl = Math.max(lw * 2.5, Math.min(L * 0.3, lw * 6));
      for (let i = 1; i < P.length; i++) {
        const m = (cum[i] + cum[i - 1]) / 2;
        let w = 1 + amp * ((vn(m / 70, seed) - 0.5) * 1.6 + (vn(m / 23, seed + 3) - 0.5) * 0.6);
        if (open) { const a = Math.min(1, m / tl), b = Math.min(1, (L - m) / tl); w *= (1 - tp[0] * (1 - a * a * (3 - 2 * a))) * (1 - tp[1] * (1 - b * b * (3 - 2 * b))); }
        const key = Math.max(0.5, Math.round(lw * w * 2) / 2);
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(P[i - 1], P[i]);
      }
    }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, segs] of bins) { ctx.beginPath(); for (let i = 0; i < segs.length; i += 2) { ctx.moveTo(segs[i][0], segs[i][1]); ctx.lineTo(segs[i + 1][0], segs[i + 1][1]); } ctx.lineWidth = w; ctx.stroke(); }
    ctx.restore(); void cap;
  }
  return new Proxy(ctx, {
    get(t, k) {
      if (k === 'taper') return taper;
      if (k === 'brush') return enabled;
      if (k in rec) return rec[k];
      const v = t[k]; return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, k, v) { if (k === 'taper') { taper = v; return true; } if (k === 'brush') { enabled = v; return true; } t[k] = v; return true; },
  });
}
