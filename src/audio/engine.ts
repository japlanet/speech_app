import { effect } from "@preact/signals";
import { media } from "../store/store.ts";
import { mediaGet } from "../store/db.ts";

/*
 * Everything that makes a noise.
 *
 * Speech is ONLY ever a recording made in the parent area. There is no text-to-speech anywhere in the
 * app, and none may be added: synthesised "fuh" is the very error this app helps to train out. If a
 * recording is missing, play() returns 0 and the screen shows a muted speaker.
 *
 * The only synthesised sounds are clicks, ticks and chimes. Every Web Audio call is guarded, because an
 * interrupted iPad audio session can throw, and no screen may ever get stuck waiting for a sound.
 */

interface Clip {
  buffer: AudioBuffer;
  start: number;
  end: number;
  gain: number;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let connected = false;
let voice: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
const clips = new Map<string, Clip>();
const loading = new Map<string, Promise<Clip | null>>();

type AudioSession = { type: string };
/** "playback" also means the iPad's silent switch does not mute the app. */
export function setSession(type: "playback" | "play-and-record"): void {
  try {
    const s = (navigator as unknown as { audioSession?: AudioSession }).audioSession;
    if (s) s.type = type;
  } catch {
    /* not supported */
  }
}

export function context(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** iPadOS keeps audio locked until a touch, and locks it again after a call, Siri or a long sleep. */
function unlock(): void {
  const c = context();
  if (!c || !master) return;
  if (!connected) {
    connected = true;
    master.connect(c.destination);
  }
  if (c.state === "running") return;
  try {
    void c.resume().catch(() => undefined);
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, 22050);
    s.connect(c.destination);
    s.start();
  } catch {
    /* try again on the next touch */
  }
}

export function installUnlock(): void {
  setSession("playback");
  // Safari only counts some of these as a real touch, so listen to them all.
  for (const type of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) document.addEventListener(type, unlock, { capture: true, passive: true });
  // iPadOS can leave sound running-but-silent after a spell in the background. Stop it cleanly; the next touch restarts it.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void ctx?.suspend().catch(() => undefined);
  });
  // Decode recordings ahead of time so that the first tap is instant.
  let last: ReadonlySet<string> = new Set();
  effect(() => {
    const now = media.value;
    for (const id of last) if (!now.has(id)) clips.delete(id);
    for (const id of now) if (!id.startsWith("p") || id.startsWith("ph:")) void loadClip(id);
    last = now;
  });
}

export async function decode(blob: Blob): Promise<AudioBuffer> {
  const c = context();
  if (!c) throw new Error("no audio");
  return c.decodeAudioData(await blob.arrayBuffer());
}

function loadClip(id: string): Promise<Clip | null> {
  const ready = clips.get(id);
  if (ready) return Promise.resolve(ready);
  const busy = loading.get(id);
  if (busy) return busy;
  const job = (async () => {
    try {
      const m = await mediaGet(id);
      if (!m || m.kind !== "audio") return null;
      const buffer = await decode(m.blob);
      const clip = { buffer, start: m.start ?? 0, end: Math.min(m.end ?? buffer.duration, buffer.duration), gain: m.gain ?? 1 };
      clips.set(id, clip);
      return clip;
    } catch {
      return null;
    } finally {
      loading.delete(id);
    }
  })();
  loading.set(id, job);
  return job;
}

/** Forget a decoded recording, after it has been replaced. */
export function forget(id: string): void {
  clips.delete(id);
  loading.delete(id);
  void loadClip(id);
}

export function forgetAll(): void {
  clips.clear();
  loading.clear();
}

export function stopVoice(): void {
  const v = voice;
  voice = null;
  if (!v || !ctx) return;
  try {
    v.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.012);
    v.src.stop(ctx.currentTime + 0.06);
  } catch {
    /* already stopped */
  }
}

function start(clip: Clip): number {
  const c = context();
  if (!c || !master) return 0;
  stopVoice();
  const length = Math.max(0.05, clip.end - clip.start);
  try {
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = clip.buffer;
    const t = c.currentTime;
    // A 4 ms fade at each end hides clicks at the trim points without softening the sound.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(clip.gain, t + 0.004);
    gain.gain.setValueAtTime(clip.gain, t + length - 0.004);
    gain.gain.linearRampToValueAtTime(0, t + length);
    src.connect(gain).connect(master);
    src.start(t, clip.start, length);
    voice = { src, gain };
  } catch {
    /* never block play on sound */
  }
  return length;
}

/** Play a recording. Returns how long it lasts in seconds, or 0 if there is no recording. */
export function play(id: string): number {
  const clip = clips.get(id);
  if (clip) return start(clip);
  if (!media.value.has(id)) return 0;
  void loadClip(id).then(c => c && start(c));
  return 0.8;
}

export function playBuffer(buffer: AudioBuffer, from: number, to: number, gain: number): number {
  return start({ buffer, start: from, end: to, gain });
}

// ---- Toy noises (never speech) ----

function blip(freq: number, at: number, length: number, level: number, type: OscillatorType = "sine", toFreq = freq): void {
  if (!ctx || !master) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (toFreq !== freq) o.frequency.exponentialRampToValueAtTime(toFreq, t + length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + length + 0.02);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  tick: () => blip(1900, 0, 0.03, 0.07, "triangle", 1200),
  snap: () => { blip(700, 0, 0.05, 0.14, "triangle", 420); blip(1400, 0.02, 0.04, 0.05); },
  click: (i = 0) => { blip(900 + (i % 5) * 90, 0, 0.05, 0.22, "triangle", 300); blip(2400, 0, 0.015, 0.08, "square"); },
  place: () => { blip(320, 0, 0.09, 0.2, "triangle", 180); blip(1600, 0, 0.02, 0.06); },
  roll: (x: number) => blip(180 + x * 120, 0, 0.06, 0.06, "sine", 140),
  bell: () => [1047, 1319, 1568, 2093].forEach((f, i) => blip(f, i * 0.09, 0.5, 0.1)),
  rep: (share: number) => { blip(520 + share * 500, 0, 0.14, 0.14, "triangle"); blip((520 + share * 500) * 1.5, 0.06, 0.18, 0.08); },
  land: () => { blip(660, 0, 0.16, 0.12, "triangle"); blip(880, 0.1, 0.24, 0.12, "triangle"); },
  fanfare: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => blip(f, i * 0.13, 0.4, 0.13, "triangle")),
};
