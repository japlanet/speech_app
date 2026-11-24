export interface Trim {
  start: number;
  end: number;
  gain: number;
}

/**
 * Find the spoken part of a recording. Errs on the side of keeping too much: a quiet /f/ or the
 * tail of an /s/ must not be cut off, so the loudness bar is low and there is padding on both sides.
 * A short thump at the very start or end (a finger on the screen) is dropped if something longer follows.
 */
export function autoTrim(samples: Float32Array, rate: number): Trim {
  const frame = Math.max(1, Math.round(rate * 0.01));
  const levels: number[] = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
    levels.push(Math.sqrt(sum / frame));
  }
  const whole = samples.length / rate;
  const peak = levels.reduce((a, b) => Math.max(a, b), 0);
  if (!levels.length || peak < 0.0008) return { start: 0, end: whole, gain: 1 };

  const sorted = [...levels].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const bar = Math.min(Math.max(floor * 2.2, peak * 0.03), peak * 0.2);

  let runs: { from: number; to: number; energy: number }[] = [];
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] < bar) continue;
    const prev = runs[runs.length - 1];
    if (prev && i - prev.to <= 12) {
      prev.to = i + 1;
      prev.energy += levels[i] ** 2;
    } else runs.push({ from: i, to: i + 1, energy: levels[i] ** 2 });
  }
  if (!runs.length) return { start: 0, end: whole, gain: 1 };
  const longest = runs.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
  const edge = 25;
  const kept = runs.filter(r => {
    if (r === longest) return true;
    const atEdge = r.from < edge || r.to > levels.length - edge;
    return !(atEdge && r.to - r.from <= 6 && longest.to - longest.from >= 3 * (r.to - r.from));
  });
  runs = kept;

  const start = Math.max(0, runs[0].from * 0.01 - 0.06);
  const end = Math.min(whole, runs[runs.length - 1].to * 0.01 + 0.12);
  return { start, end, gain: gainFor(samples, rate, start, end) };
}

/** Bring quiet recordings up to a common loudness without ever clipping. */
export function gainFor(samples: Float32Array, rate: number, start: number, end: number): number {
  const a = Math.max(0, Math.floor(start * rate));
  const b = Math.min(samples.length, Math.ceil(end * rate));
  const block = Math.max(1, Math.round(rate * 0.05));
  let peak = 0;
  let loudest = 0;
  for (let i = a; i < b; i += block) {
    let sum = 0;
    const stop = Math.min(b, i + block);
    for (let j = i; j < stop; j++) {
      sum += samples[j] * samples[j];
      peak = Math.max(peak, Math.abs(samples[j]));
    }
    loudest = Math.max(loudest, Math.sqrt(sum / Math.max(1, stop - i)));
  }
  if (peak < 0.0008) return 1;
  return Math.max(0.3, Math.min(0.2 / loudest, 0.95 / peak, 12));
}

/** Loudest value in each of n slices, for drawing the waveform. */
export function peaks(samples: Float32Array, n: number): number[] {
  const out = new Array<number>(n).fill(0);
  const step = samples.length / n;
  for (let i = 0; i < n; i++) {
    const stop = Math.min(samples.length, Math.ceil((i + 1) * step));
    for (let j = Math.floor(i * step); j < stop; j++) out[i] = Math.max(out[i], Math.abs(samples[j]));
  }
  return out;
}
