// Turns the shot list (project shots.json) into absolute times, using the voice's word timings (out/timeline/voice.json).
// Pure JS (no DOM): the browser engine and tools/render.mjs both use it.
//
// Time expressions are strings that start with "@" (references/project-format.md):
//   "@cut NA Knight"     2 frames before the word "Knight" in line NA starts (snapped to a frame) -- where cuts go
//   "@ws NB eight"       word start            "@we NB emails."   word end
//   "@start S1"          line start            "@end NC"          line end
//   "@shot title"        start of an earlier shot   "@shotend board"  its end (only once the next shot is known)
//   word tokens: "Power#1" = the 2nd "Power" in the line;  "opened>and" = the first "and" after "opened"
//   offsets follow as extra tokens: "@ws S1 Ninety-seven -0.12",  "@shot title +2.25"
// Matching ignores case and punctuation ("dollars..." matches "dollars").

export const clean = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, '');

export function makeResolver(V, fps = 30) {
  const lines = Object.fromEntries(V.lines.map((l) => [l.id, l]));
  const shotStart = {};
  function word(lid, tok) {
    const L = lines[lid];
    if (!L) throw new Error(`time expression: line "${lid}" is not in the voice timeline (lines: ${Object.keys(lines).join(', ')})`);
    let after = null, w = tok;
    if (tok.includes('>')) [after, w] = tok.split('>');
    let nth = 0; const m = w.match(/^(.*)#(\d+)$/); if (m) { w = m[1]; nth = +m[2]; }
    const ws = L.words; let k = 0, from = 0;
    if (after) { from = ws.findIndex((x) => clean(x.text) === clean(after)) + 1; if (from === 0) throw new Error(`time expression: "${after}" not found in line ${lid}`); }
    for (let i = from; i < ws.length; i++) if (clean(ws[i].text) === clean(w)) { if (k === nth) return ws[i]; k++; }
    throw new Error(`time expression: word "${w}"${nth ? ` #${nth}` : ''} not found in line ${lid}: ${ws.map((x) => x.text).join(' ')}`);
  }
  const fr = (t) => Math.round(t * fps) / fps;
  function time(expr) {
    if (typeof expr === 'number') return expr;
    if (typeof expr !== 'string' || expr[0] !== '@') throw new Error(`not a time expression: ${JSON.stringify(expr)}`);
    const tk = expr.slice(1).trim().split(/\s+/);
    const kind = tk.shift(); let v, rest;
    if (kind === 'cut' || kind === 'ws' || kind === 'we') {
      const w = word(tk[0], tk[1]); rest = tk.slice(2);
      v = kind === 'we' ? w.end : w.start;
      if (kind === 'cut') v = Math.max(0, Math.round((v - 0.067) * fps)) / fps;
    } else if (kind === 'start' || kind === 'end') {
      const L = lines[tk[0]]; if (!L) throw new Error(`time expression: line "${tk[0]}" not found`);
      v = kind === 'start' ? L.start : L.end; rest = tk.slice(1);
    } else if (kind === 'shot' || kind === 'shotend') {
      const s = shotStart[tk[0]]; if (!s) throw new Error(`time expression: shot "${tk[0]}" is not defined before this point`);
      v = kind === 'shot' ? s.start : s.end; if (v == null) throw new Error(`time expression: end of shot "${tk[0]}" is not known yet`);
      rest = tk.slice(1);
    } else throw new Error(`time expression: unknown kind "${kind}" in ${expr} (use cut, ws, we, start, end, shot, shotend)`);
    for (const r of rest) { const n = parseFloat(r); if (Number.isNaN(n)) throw new Error(`time expression: bad offset "${r}" in ${expr}`); v += n; }
    return v;
  }
  // replace every "@..." string inside a value (objects, arrays) with its time
  function deep(x) {
    if (typeof x === 'string' && x[0] === '@') return time(x);
    if (Array.isArray(x)) return x.map(deep);
    if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = deep(x[k]); return o; }
    return x;
  }
  return { time, deep, word, fr, lines, shotStart };
}

// project shots.json -> { shots, total, duration, lines }
export function buildShots(V, spec, fps = 30) {
  const R = makeResolver(V, fps);
  const acting = spec.acting || {};
  const S = [];
  for (const raw of spec.shots) {
    const { start, act, words, line, ...rest } = raw;
    const sh = R.deep(rest);
    if (start == null) throw new Error(`shot ${raw.id}: needs a start`);
    sh.start = R.fr(R.time(start));
    if (act) {
      sh.act = {};
      for (const [who, keys] of Object.entries(act)) {
        const k = typeof keys === 'string' ? acting[keys] : keys;
        if (!k) throw new Error(`shot ${raw.id}: acting "${keys}" is not defined in shots.json "acting"`);
        sh.act[who] = R.deep(k);
      }
    }
    if (raw.type === 'card') {
      // words: [[shownText, startWord, endWord?], ...] from one line (line: "NA")
      if (!sh.segs) {
        if (!line || !words) throw new Error(`card ${raw.id}: needs "line" + "words" (or explicit "segs")`);
        sh.segs = words.map(([txt, a, b]) => [txt, R.word(line, a).start, R.word(line, b ?? a).end]);
      }
    }
    if (S.length) R.shotStart[S[S.length - 1].id].end = sh.start;
    R.shotStart[sh.id] = { start: sh.start, end: null };
    S.push(sh);
  }
  for (let i = 1; i < S.length; i++) if (S[i].start < S[i - 1].start) throw new Error(`shot ${S[i].id} starts (${S[i].start.toFixed(2)} s) before shot ${S[i - 1].id} (${S[i - 1].start.toFixed(2)} s)`);
  const end = R.fr(R.time(spec.end));
  for (let i = 0; i < S.length; i++) { S[i].end = i + 1 < S.length ? S[i + 1].start : end; S[i].f0 = Math.round(S[i].start * fps); S[i].f1 = Math.round(S[i].end * fps); }
  return { shots: S, total: Math.round(end * fps), duration: end, lines: R.lines };
}
