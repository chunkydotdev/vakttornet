/**
 * mulberry32 — tiny seeded 32-bit PRNG. Returns a function producing floats
 * in [0, 1). The current mechanics are fully deterministic without
 * randomness; this exists so future features (crits, spawn jitter, drops)
 * stay reproducible from the run seed instead of reaching for Math.random.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
