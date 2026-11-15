// Seeded randomness, so ?seed=N gives the same archipelago, the same gust pockets and the same
// storm cells every time. mulberry32 is small, fast and good enough for a game; hash01 is a
// stateless mixer for scenery that must not disturb the world's own sequence of draws.

export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  next.sign = () => (next() < 0.5 ? -1 : 1);
  return next;
}

// A stable 0..1 value from an integer key: stars, palms, wave crests and cloud blobs use it so
// the scenery never consumes the world's random stream and never flickers between frames.
export function hash01(n) {
  let x = Math.imul((n | 0) ^ 0x27d4eb2d, 0x165667b1);
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x2545f491) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
}

export function hashRange(n, lo, hi) {
  return lo + hash01(n) * (hi - lo);
}

export function wrap(value, min, max) {
  const span = max - min;
  if (span <= 0) return min;
  return min + ((((value - min) % span) + span) % span);
}

export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
