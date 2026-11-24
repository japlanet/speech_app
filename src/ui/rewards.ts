import { progress, setProgress, settings } from "../store/store.ts";
import { sleep } from "./nav.ts";

/** Set by the domino strip while it is on screen. Resolves when the celebration is over. */
export const strip: { topple: (() => Promise<void>) | null; add: (() => Promise<void>) | null } = { topple: null, add: null };

/** One more domino for a correct answer; the chain falls when the round is complete. */
export async function rewardCorrect(): Promise<void> {
  const chain = progress.value.chain + 1;
  setProgress({ chain });
  await (strip.add?.() ?? sleep(0.5));
  if (chain >= settings.value.roundLength) await strip.topple?.();
}
