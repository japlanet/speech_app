import type { Prize } from "../core/prizes.ts";
import { Scene } from "./Scene.tsx";
import { Spin } from "./icons.tsx";

export function PrizePreview({ p }: { p: Prize }) {
  switch (p.slot) {
    case "background":
      return <span class="pv pv-scene"><Scene id={p.id} /></span>;
    case "domino":
      return <span class="pv pv-dominoes">{[0, 1, 2, 3].map(i => <i key={i} style={{ background: p.colours![i % p.colours!.length] }} />)}</span>;
    case "marble":
      return <span class="pv"><i class="pv-marble" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${p.colours![0]} 25%, ${p.colours![1]})` }} /></span>;
    case "tile":
      return <span class="pv" style={{ "--tile": "72px" }}><span class="pv-tile"><span class={`tile-face skin-${p.id}`} style={{ "--tile-colour": "#6cc5f3" }}>a</span></span></span>;
    case "spin":
      return <span class="pv pv-spin"><Spin size={76} />{p.id !== "sp-plain" && <b>{p.emoji}</b>}</span>;
    default:
      return <span class="pv pv-emoji">{p.emoji}</span>;
  }
}
