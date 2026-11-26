import { computed, signal, type Signal } from "@preact/signals";
import { settleColours } from "../core/colours.ts";
import { localDate, msUntilMidnight } from "../core/day.ts";
import { CATALOGUE, PHONEME_IDS } from "../core/phonemes.ts";
import { awardPrize, ownsPrize, prize, type Prize, UNLOCK_LINES } from "../core/prizes.ts";
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, seedWheels, seedWords } from "../core/seed.ts";
import { mediaKey, type Lock, type MediaRecord, type Phoneme, type PrizeSlot, type Progress, type RepDay, type Settings, type Wheel, type Word } from "../core/types.ts";
import * as db from "./db.ts";

export const words = signal<Word[]>([]);
export const wheels = signal<Wheel[]>([]);
export const settings = signal<Settings>(DEFAULT_SETTINGS);
export const progress = signal<Progress>(DEFAULT_PROGRESS);
export const reps = signal<RepDay[]>([]);
/** Colour of each sound, by phoneme id. */
export const colours = signal<Record<string, string>>({});
export const lock = signal<Lock | null>(null);
/** Ids of every stored recording and picture. */
export const media = signal<ReadonlySet<string>>(new Set());
export const saveFailed = signal(false);
export const today = signal(localDate());

const parts = { words, wheels, settings, progress, reps, colours, lock } as const;
type Part = keyof typeof parts;

/** Change one part of the data and save it. The screen updates at once; the write follows. */
function put<K extends Part>(key: K, value: (typeof parts)[K] extends Signal<infer V> ? V : never): void {
  (parts[key] as Signal<unknown>).value = value;
  db.kvPut(key, value).then(
    () => (saveFailed.value = false),
    () => (saveFailed.value = true),
  );
}

// ---- What is in use ----

export const activeWords = computed(() => words.value.filter(w => w.active));
export const activeWheel = computed(() => wheels.value.find(w => w.active) ?? null);
/** The sound being worked on this week, taken from the active wheel. */
export const targetSound = computed(() => activeWheel.value?.phonemeId || null);

export const phonemes = computed<Phoneme[]>(() => {
  const used = new Set<string>();
  for (const w of words.value) for (const t of w.tiles) used.add(t.phonemeId);
  for (const w of wheels.value) if (w.phonemeId) used.add(w.phonemeId);
  return PHONEME_IDS.filter(id => used.has(id)).map(id => ({ ...CATALOGUE[id], colour: colours.value[id] ?? "#6f7b8a" }));
});
/** Sounds that could turn up as decoys or tiles in play: everything in use, plus its colour. */
export const colourOf = (id: string) => colours.value[id] ?? "#6f7b8a";
export const has = (key: string) => media.value.has(key);

export interface Needed {
  key: string;
  label: string;
  hint: string;
  group: "sounds" | "words" | "wheel" | "prizes";
}

/** Every recording the app can use right now. Switched-off words and wheels are left out of the count. */
export const needed = computed<Needed[]>(() => {
  const out: Needed[] = [];
  const live = new Set<string>();
  for (const w of activeWords.value) for (const t of w.tiles) live.add(t.phonemeId);
  if (targetSound.value) live.add(targetSound.value);
  live.delete("silent");
  for (const p of phonemes.value) if (live.has(p.id)) out.push({ key: mediaKey.phoneme(p.id), label: p.grapheme, hint: p.hint, group: "sounds" });
  const wheel = activeWheel.value;
  if (wheel) {
    // The centre may use its own recording or, failing that, our recording of the sound itself.
    if (!wheel.phonemeId) out.push({ key: mediaKey.wheelCentre(wheel.id), label: wheel.centre, hint: `middle of ${wheel.name}`, group: "wheel" });
    for (const i of wheel.items) out.push({ key: mediaKey.wheelItem(i.id), label: i.label, hint: `the blended model for “${i.label}”`, group: "wheel" });
  }
  for (const w of activeWords.value) out.push({ key: mediaKey.word(w.id), label: w.text, hint: "the whole word", group: "words" });
  for (const [slot, line] of Object.entries(UNLOCK_LINES) as [PrizeSlot, string][]) out.push({ key: mediaKey.unlocked(slot), label: line, hint: "said when this prize is won", group: "prizes" });
  return out;
});
export const missing = computed(() => needed.value.filter(n => !media.value.has(n.key)));
export const centreKey = (w: Wheel) => (has(mediaKey.wheelCentre(w.id)) || !w.phonemeId ? mediaKey.wheelCentre(w.id) : mediaKey.phoneme(w.phonemeId));

// ---- Loading ----

export async function load(): Promise<void> {
  const get = <T>(key: Part, fallback: T) => db.kvGet<T>(key).then(v => v ?? fallback);
  words.value = await get("words", seedWords());
  wheels.value = await get("wheels", seedWheels());
  settings.value = { ...DEFAULT_SETTINGS, ...(await get<Partial<Settings>>("settings", {})) };
  progress.value = tidyProgress(await get<Partial<Progress>>("progress", {}));
  reps.value = await get("reps", []);
  colours.value = settled(await get("colours", {}), words.value, wheels.value);
  lock.value = await get<Lock | null>("lock", null);
  media.value = new Set(await db.mediaKeys());
}

export function tidyProgress(p: Partial<Progress>): Progress {
  const out = { ...DEFAULT_PROGRESS, ...p, chosen: { ...DEFAULT_PROGRESS.chosen, ...p.chosen } };
  for (const slot of Object.keys(out.chosen) as (keyof typeof out.chosen)[]) {
    if (!ownsPrize(out.chosen[slot], out.unlocked)) out.chosen[slot] = DEFAULT_PROGRESS.chosen[slot];
  }
  return out;
}

function settled(existing: Record<string, string>, ws: Word[], whs: Wheel[], protect: string[] = []): Record<string, string> {
  const used = new Set(ws.flatMap(w => w.tiles.map(t => t.phonemeId)));
  for (const w of whs) if (w.phonemeId) used.add(w.phonemeId);
  return settleColours(PHONEME_IDS.filter(id => used.has(id)), existing, ws, protect);
}

// ---- Changes ----

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function saveWord(w: Word): void {
  const list = words.value.some(x => x.id === w.id) ? words.value.map(x => (x.id === w.id ? w : x)) : [...words.value, w];
  put("words", list);
  put("colours", settled(colours.value, list, wheels.value));
}

export async function deleteWord(id: string): Promise<void> {
  put("words", words.value.filter(w => w.id !== id).map(w => ({ ...w, distractors: w.distractors.filter(d => d !== id) })));
  await dropMedia([mediaKey.word(id), mediaKey.wordPicture(id)]);
}

export function saveWheel(w: Wheel): void {
  let list = wheels.value.some(x => x.id === w.id) ? wheels.value.map(x => (x.id === w.id ? w : x)) : [...wheels.value, w];
  if (w.active) list = list.map(x => ({ ...x, active: x.id === w.id }));
  const before = wheels.value.find(x => x.id === w.id);
  put("wheels", list);
  put("colours", settled(colours.value, words.value, list));
  const gone = (before?.items ?? []).filter(i => !w.items.some(j => j.id === i.id));
  if (gone.length) void dropMedia(gone.flatMap(i => [mediaKey.wheelItem(i.id), mediaKey.itemPicture(i.id)]));
}

export async function deleteWheel(id: string): Promise<void> {
  const w = wheels.value.find(x => x.id === id);
  if (!w) return;
  put("wheels", wheels.value.filter(x => x.id !== id));
  await dropMedia([mediaKey.wheelCentre(id), ...w.items.flatMap(i => [mediaKey.wheelItem(i.id), mediaKey.itemPicture(i.id)])]);
}

export const setSettings = (change: Partial<Settings>) => put("settings", { ...settings.value, ...change });
export const setProgress = (change: Partial<Progress>) => put("progress", { ...progress.value, ...change });
export const setLock = (l: Lock) => put("lock", l);

export function setColour(id: string, colour: string): void {
  put("colours", settled({ ...colours.value, [id]: colour }, words.value, wheels.value, [id]));
}

export function resetColours(): void {
  put("colours", settled({}, words.value, wheels.value));
}

export async function saveMedia(m: MediaRecord): Promise<void> {
  await db.mediaPut(m);
  media.value = new Set([...media.value, m.id]);
}

export async function dropMedia(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => db.mediaDelete(id)));
  const next = new Set(media.value);
  for (const id of ids) next.delete(id);
  media.value = next;
}

export function resetProgress(): void {
  put("progress", { ...DEFAULT_PROGRESS, chosen: { ...DEFAULT_PROGRESS.chosen } });
  put("reps", []);
}

// ---- Wheel reps and prizes ----

export const repsToday = computed(() => {
  const w = activeWheel.value;
  return w ? (reps.value.find(r => r.date === today.value && r.wheelId === w.id)?.reps ?? 0) : 0;
});

/** Count one attempt. Returns true if it is the one that reaches today's target. */
export function addRep(): boolean {
  checkDay();
  const w = activeWheel.value;
  if (!w) return false;
  const before = repsToday.value;
  const row: RepDay = { date: today.value, wheelId: w.id, wheelName: w.name, reps: before + 1, target: w.target };
  put("reps", [...reps.value.filter(r => !(r.date === row.date && r.wheelId === row.wheelId)), row]);
  return before + 1 >= w.target && progress.value.lastPrizeDate !== today.value;
}

/** Each mode gives one prize a day: the wheel at its target, the other two when a domino round falls. */
export type PrizeMode = "build" | "match" | "wheel";
const PRIZE_DAY = { build: "buildPrizeDate", match: "matchPrizeDate", wheel: "lastPrizeDate" } as const;

export function prizeDue(mode: PrizeMode): boolean {
  checkDay();
  return progress.value[PRIZE_DAY[mode]] !== today.value;
}

/** Give this mode's prize for today. Null only if every prize is won and in use. */
export function winPrize(mode: PrizeMode = "wheel"): Prize | null {
  const won = awardPrize(progress.value.unlocked, progress.value.chosen);
  setProgress({ [PRIZE_DAY[mode]]: today.value, unlocked: won.unlocked });
  return won.prize;
}

export function choosePrize(id: string): void {
  if (ownsPrize(id, progress.value.unlocked)) setProgress({ chosen: { ...progress.value.chosen, [prize(id).slot]: id } });
}

export function checkDay(): void {
  const d = localDate();
  if (d !== today.value) today.value = d;
}

export function watchMidnight(): void {
  const wait = () => setTimeout(() => (checkDay(), wait()), msUntilMidnight());
  wait();
  document.addEventListener("visibilitychange", checkDay);
}
