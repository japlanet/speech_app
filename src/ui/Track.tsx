import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { prize } from "../core/prizes.ts";
import { progress } from "../store/store.ts";

/** The run, stretched sideways by k so that it always fills the width of the screen. */
const runPath = (k: number) => {
  const p = (x: number, y: number) => `${(x * k).toFixed(1)} ${y}`;
  return `M${p(40, 30)} C${p(150, 30)} ${p(150, 104)} ${p(262, 104)} S${p(380, 44)} ${p(490, 60)} S${p(610, 118)} ${p(720, 106)} S${p(850, 62)} ${p(946, 92)}`;
};

/** Today's reps as a marble run: the marble rolls on a little with every rep and drops into the cup at the target. */
export function Track({ count, target, won }: { count: number; target: number; won: boolean }) {
  const path = useRef<SVGPathElement>(null);
  const filled = useRef<SVGPathElement>(null);
  const marble = useRef<SVGGElement>(null);
  const shown = useRef(Math.min(1, count / target));
  const svg = useRef<SVGSVGElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      if (!svg.current) return;
      const r = svg.current.getBoundingClientRect();
      if (r.height > 0) setK(Math.max(0.9, Math.min(2.4, ((r.width / r.height) * 160 - 94) / 946)));
    };
    const watch = new ResizeObserver(fit);
    watch.observe(svg.current!);
    fit();
    return () => watch.disconnect();
  }, []);
  const RUN = runPath(k);
  const cup = 946 * k;
  const [light, dark] = prize(progress.value.chosen.marble).colours ?? ["#5fb4ff", "#1c5fc4"];

  useEffect(() => {
    const goal = Math.min(1, count / target);
    const start = shown.current;
    const began = performance.now();
    const length = path.current!.getTotalLength();
    let frame = 0;
    const draw = (share: number) => {
      if (!path.current || !marble.current || !filled.current) return;
      const p = path.current.getPointAtLength(share * length);
      marble.current.setAttribute("transform", `translate(${p.x} ${p.y - 17}) rotate(${share * 1400})`);
      filled.current.style.strokeDasharray = `${share * length} ${length + 10}`;
    };
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / 650);
      shown.current = start + (goal - start) * (1 - (1 - t) ** 3);
      draw(shown.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    draw(start);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [count, target, k]);

  return (
    <div class="track" role="img" aria-label={`${count} of ${target} today`}>
      <svg ref={svg} viewBox={`0 0 ${cup + 94} 160`} preserveAspectRatio="xMidYMid meet">
        <defs><radialGradient id="track-marble" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" /><stop offset=".25" stop-color={light} /><stop offset="1" stop-color={dark} /></radialGradient></defs>
        {[90, 262, 490, 720, 900].map(x => <path key={x} d={`M${x * k} 70V156`} stroke="#b9783f" stroke-width="12" stroke-linecap="round" />)}
        <path d={RUN} fill="none" stroke="#1b2238" stroke-width="30" stroke-linecap="round" />
        <path ref={path} d={RUN} fill="none" stroke="#e8c894" stroke-width="20" stroke-linecap="round" />
        <path ref={filled} d={RUN} fill="none" stroke="#1f9d57" stroke-width="20" stroke-linecap="round" />
        <path d={`M${cup + 6} 84h74l-10 66h-54z`} fill={won ? "#f7c52b" : "#fffaf0"} stroke="#1b2238" stroke-width="6" stroke-linejoin="round" />
        <text x={cup + 43} y="132" text-anchor="middle" font-size="40">{won ? "⭐" : "🎁"}</text>
        <g ref={marble}><circle r="19" fill="url(#track-marble)" stroke="#1b2238" stroke-width="4" /><path d="M-9 4q9 8 18-2" stroke="#fff" stroke-opacity=".6" stroke-width="4" fill="none" stroke-linecap="round" /></g>
      </svg>
      <b class="track-count">{count}</b>
    </div>
  );
}
