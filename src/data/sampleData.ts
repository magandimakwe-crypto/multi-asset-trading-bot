import type { Bar } from '../engine/ifvgEngine';

// Mulberry32 seeded PRNG so a given seed reproduces the same chart.
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate synthetic OHLC bars with regime shifts and occasional gaps so FVGs and
// inversions form naturally. No broker / live data required.
export function generateBars(count = 600, seed = 42): Bar[] {
  const r = rng(seed);
  const bars: Bar[] = [];
  let price = 100;
  const start = Math.floor(Date.now() / 1000) - count * 3600;
  let trend = 0;
  for (let i = 0; i < count; i++) {
    if (i % 45 === 0) trend = (r() - 0.5) * 0.7; // periodic regime shift
    const vol = 0.007 + r() * 0.006;
    const drift = trend * vol;
    const open = price;
    const change = drift + (r() - 0.5) * 2 * vol;
    let close = open * (1 + change);
    // occasional impulse gap to seed fair value gaps
    if (r() > 0.82) close *= 1 + (r() - 0.5) * 0.05;
    const high = Math.max(open, close) * (1 + r() * vol);
    const low = Math.min(open, close) * (1 - r() * vol);
    bars.push({ time: start + i * 3600, open, high, low, close });
    price = close;
  }
  return bars;
}
