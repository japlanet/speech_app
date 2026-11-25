import { beat, FALL, layRun, type Run } from "./dominoes.ts";

/** The timetable of the full-screen celebration, in seconds. */
export const IN = 0.2;
/** The new domino lands. */
export const IMPACT = 1;
export const FILL = 0.45;
/** The dominoes play their tune, one note each. */
export const TUNE = IMPACT + FILL + 0.05;
export const OUT = 0.3;
export const BIG_ROLL = 1.5;

export const noteGap = (count: number) => Math.min(0.09, 0.75 / Math.max(1, count));
/** When everything leaps together. */
export const leap = (count: number) => TUNE + count * noteGap(count) + 0.06;
/** A domino joins the chain. */
export const stepLength = (count: number) => leap(count) + 0.65 + OUT;

/** The round is complete: the last domino lands and the whole chain goes over. */
export const TOPPLE = IMPACT + 0.05;
export const allDown = (count: number) => TOPPLE + (count - 1) * beat(count) + FALL + 0.15;
export const finaleLength = (count: number) => allDown(count) + BIG_ROLL + OUT;

/** The chain as big as the screen allows. */
export const bigRun = (width: number, height: number, count: number, slots: number): Run =>
  layRun(width, Number.POSITIVE_INFINITY, count, slots, Math.min(height * 0.36, (width - 90) / (0.374 * (slots - 1) + 1.25)));

/** On the wheel every rep is quick, so the full screen comes at each quarter of the day's target. */
export const isMilestone = (count: number, target: number) =>
  count > 0 && count <= target && Math.floor((4 * count) / target) > Math.floor((4 * (count - 1)) / target);
/** The count at the milestone before this one. */
export function milestoneBefore(count: number, target: number): number {
  for (let c = count - 1; c > 0; c--) if (isMilestone(c, target)) return c;
  return 0;
}
