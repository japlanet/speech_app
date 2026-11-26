import { prizeDue, progress, setProgress, settings, winPrize, type PrizeMode } from "../store/store.ts";
import { celebrate } from "./Celebration.tsx";
import { showUnlock } from "./Unlock.tsx";

/** Filled in by the domino strip while it is on screen. */
export const strip: { settle: (() => Promise<void>) | null; paint: (() => void) | null } = { settle: null, paint: null };

/**
 * One more domino for a correct answer, shown full screen; the chain falls when the round is complete.
 * The first round finished in each mode each day also opens a prize.
 */
export async function rewardCorrect(mode: Exclude<PrizeMode, "wheel">): Promise<void> {
  await strip.settle?.();
  const round = settings.value.roundLength;
  const chain = progress.value.chain + 1;
  const full = chain >= round;
  setProgress({ chain });
  // The strip below catches up while it is covered.
  setTimeout(() => strip.paint?.(), 500);
  await celebrate("dominoes", chain - 1, chain, round);
  if (full) setProgress({ chain: Math.max(0, progress.value.chain - chain) });
  strip.paint?.();
  if (full && prizeDue(mode)) await showUnlock(winPrize(mode));
}
