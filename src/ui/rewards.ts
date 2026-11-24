import { progress, setProgress, settings } from "../store/store.ts";
import { sleep } from "./nav.ts";

type Act = (() => Promise<void>) | null;
/** Filled in by the domino strip while it is on screen. */
export const strip: { add: Act; topple: Act; settle: Act } = { add: null, topple: null, settle: null };

/** One more domino for a correct answer; the chain falls when the round is complete. */
export async function rewardCorrect(): Promise<void> {
  await strip.settle?.();
  const chain = progress.value.chain + 1;
  setProgress({ chain });
  await (strip.add?.() ?? sleep(0.3));
  if (chain >= settings.value.roundLength) await strip.topple?.();
  else await sleep(0.25);
}
