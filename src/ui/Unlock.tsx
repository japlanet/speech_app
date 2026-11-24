import { useEffect, useState } from "preact/hooks";
import { sfx } from "../audio/engine.ts";
import type { Prize } from "../core/prizes.ts";
import { choosePrize } from "../store/store.ts";
import { Check } from "./icons.tsx";
import { PrizePreview } from "./PrizePreview.tsx";

const CONFETTI = ["#db3a2d", "#f7c52b", "#1f9d57", "#2f74d0", "#f291b8", "#8a4bc4"];

export function Confetti({ count = 42 }: { count?: number }) {
  const [bits] = useState(() => Array.from({ length: count }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.7, time: 1.8 + Math.random() * 1.4, turn: Math.random() * 720 - 360, colour: CONFETTI[i % CONFETTI.length] })));
  return <div class="confetti" aria-hidden="true">{bits.map((b, i) => <i key={i} style={{ left: `${b.left}%`, background: b.colour, animationDelay: `${b.delay}s`, animationDuration: `${b.time}s`, "--turn": `${b.turn}deg` }} />)}</div>;
}

/** Today's target is reached: the present opens. With every prize already won, there is still a trophy. */
export function Unlock({ prize, onClose }: { prize: Prize | null; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(true);
      sfx.fanfare();
      if (prize) choosePrize(prize.id);
    }, 1300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div class="unlock" role="dialog" aria-label="You won a prize">
      {open && <Confetti />}
      {open ? <div class="unlock-prize">{prize ? <PrizePreview p={prize} /> : <span class="pv pv-emoji">🏆</span>}</div> : <div class="unlock-box">🎁</div>}
      <button class={`round unlock-ok ${open ? "" : "hidden"}`} aria-label="Hooray" disabled={!open} onClick={onClose}><Check size={56} /></button>
    </div>
  );
}
