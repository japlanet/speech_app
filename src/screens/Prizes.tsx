import { useState } from "preact/hooks";
import { sfx } from "../audio/engine.ts";
import { ALL_PRIZES, ownsPrize, SLOTS } from "../core/prizes.ts";
import { choosePrize, progress } from "../store/store.ts";
import { Bar } from "../ui/Bar.tsx";
import { PrizePreview } from "../ui/PrizePreview.tsx";

/** Pictures only: his prizes, and presents still to be won. Touch one to use it. */
export function Prizes() {
  const [shaking, setShaking] = useState("");
  const { unlocked, chosen } = progress.value;
  return (
    <main class="screen prizes">
      <Bar />
      <div class="prize-rows scrolls">
        {SLOTS.map(slot => (
          <div class="prize-row" key={slot}>
            {ALL_PRIZES.filter(p => p.slot === slot).map(p => {
              const mine = ownsPrize(p.id, unlocked);
              return (
                <button
                  key={p.id}
                  class={`prize ${mine ? "" : "locked"} ${chosen[slot] === p.id ? "on" : ""} ${shaking === p.id ? "shaking" : ""}`}
                  aria-label={mine ? p.id : "Not won yet"}
                  aria-pressed={chosen[slot] === p.id}
                  onClick={() => {
                    if (mine) {
                      choosePrize(p.id);
                      sfx.snap();
                    } else {
                      setShaking(p.id);
                      setTimeout(() => setShaking(""), 500);
                    }
                  }}
                >
                  {mine ? <PrizePreview p={p} /> : <span class="pv pv-emoji">🎁</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
