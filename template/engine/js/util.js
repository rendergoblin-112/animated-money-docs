export const FPS = 30;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeOutBack = (t) => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// deterministic pseudo-random
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const noise1 = (t, seed = 0) => Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.9 + seed * 2.1) * 0.3 + Math.sin(t * 5.3 + seed * 0.7) * 0.2;
// money with any currency symbol ('$', '¥', '£', '€' ...): fmtMoney(460000000) -> "$460,000,000"
export const fmtMoney = (n, cur = '$') => cur + Math.round(n).toLocaleString('en-US');
export const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
