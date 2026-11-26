import { CATALOGUE } from "./phonemes.ts";
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS } from "./seed.ts";
import { ALL_PRIZES } from "./prizes.ts";
import type { MediaRecord, Progress, RepDay, Settings, Wheel, Word } from "./types.ts";

export interface BackupMedia extends Omit<MediaRecord, "blob"> {
  file: string;
}
export interface BackupData {
  app: "sound-studio";
  format: 1;
  savedAt: string;
  words: Word[];
  wheels: Wheel[];
  settings: Settings;
  progress: Progress;
  reps: RepDay[];
  colours: Record<string, string>;
  media: BackupMedia[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;
const real = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
const bool = (v: unknown, fallback = true) => (typeof v === "boolean" ? v : fallback);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const sound = (v: unknown) => (typeof v === "string" && CATALOGUE[v] ? v : "");

export const LIMITS = {
  target: [1, 200], roundLength: [2, 20], stepUp: [1, 20], dropAfter: [1, 10], maxDecoys: [0, 4],
} as const;

/** Read a backup's data.json, ignoring anything that does not make sense. Throws if it is not one of ours. */
export function readBackup(raw: unknown): BackupData {
  if (!isObj(raw) || raw.app !== "sound-studio") throw new Error("This file is not a Sound Studio backup.");
  if (raw.format !== 1) throw new Error("This backup was made by a newer version of the app. Update the app first.");

  const words: Word[] = list(raw.words)
    .map(w => ({
      id: str(w.id), text: str(w.text), emoji: str(w.emoji), active: bool(w.active), distractors: strs(w.distractors).slice(0, 2),
      tiles: list(w.tiles).map(t => ({ grapheme: str(t.grapheme), phonemeId: sound(t.phonemeId) })),
    }))
    .filter(w => w.id && w.text && w.tiles.length && w.tiles.every(t => t.grapheme && t.phonemeId));

  let seenActive = false;
  const wheels: Wheel[] = list(raw.wheels)
    .map(w => ({
      id: str(w.id), name: str(w.name, "Wheel"), centre: str(w.centre), phonemeId: sound(w.phonemeId),
      target: num(w.target, DEFAULT_SETTINGS.defaultTarget, ...LIMITS.target), active: bool(w.active, false),
      items: list(w.items).map(i => ({ id: str(i.id), label: str(i.label), emoji: str(i.emoji) })).filter(i => i.id),
    }))
    .filter(w => w.id)
    .map(w => {
      const active = w.active && !seenActive;
      seenActive ||= active;
      return { ...w, active };
    });

  const s = isObj(raw.settings) ? raw.settings : {};
  const d = DEFAULT_SETTINGS;
  const settings: Settings = {
    childName: str(s.childName).slice(0, 30),
    letterCase: s.letterCase === "upper" ? "upper" : "lower",
    showPrinted: s.showPrinted === "always" ? "always" : "afterCorrect",
    defaultTarget: num(s.defaultTarget, d.defaultTarget, ...LIMITS.target),
    roundLength: num(s.roundLength, d.roundLength, ...LIMITS.roundLength),
    stepUp: num(s.stepUp, d.stepUp, ...LIMITS.stepUp),
    dropAfter: num(s.dropAfter, d.dropAfter, ...LIMITS.dropAfter),
    maxDecoys: num(s.maxDecoys, d.maxDecoys, ...LIMITS.maxDecoys),
  };

  const p = isObj(raw.progress) ? raw.progress : {};
  const chosen = isObj(p.chosen) ? p.chosen : {};
  const progress: Progress = {
    level: num(p.level, 0, 0, 4), streak: num(p.streak, 0, 0, 100), chain: num(p.chain, 0, 0, 40),
    unlocked: strs(p.unlocked).filter(id => ALL_PRIZES.some(x => x.id === id)), lastPrizeDate: str(p.lastPrizeDate),
    buildPrizeDate: str(p.buildPrizeDate), matchPrizeDate: str(p.matchPrizeDate),
    chosen: Object.fromEntries(Object.entries(DEFAULT_PROGRESS.chosen).map(([k, v]) => [k, str(chosen[k], v)])) as Progress["chosen"],
  };

  const reps: RepDay[] = list(raw.reps)
    .map(r => ({ date: str(r.date), wheelId: str(r.wheelId), wheelName: str(r.wheelName), reps: num(r.reps, 0, 0, 100_000), target: num(r.target, 20, 1, 1000) }))
    .filter(r => /^\d{4}-\d\d-\d\d$/.test(r.date) && r.wheelId);

  const colours: Record<string, string> = {};
  if (isObj(raw.colours)) for (const [k, v] of Object.entries(raw.colours)) if (sound(k) && typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) colours[k] = v;

  const media: BackupMedia[] = list(raw.media)
    .map(m => ({
      id: str(m.id), kind: m.kind === "image" ? ("image" as const) : ("audio" as const), type: str(m.type), file: str(m.file),
      start: real(m.start), end: real(m.end), gain: real(m.gain),
    }))
    .filter(m => m.id && m.file && m.type.startsWith(`${m.kind}/`) && m.type !== "image/svg+xml");

  return { app: "sound-studio", format: 1, savedAt: str(raw.savedAt), words, wheels, settings, progress, reps, colours, media };
}
