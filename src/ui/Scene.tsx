import type { ComponentChildren } from "preact";

type Def = { sky: [string, string]; art: ComponentChildren };

const hill = (d: string, fill: string) => <path d={d} fill={fill} />;
const dots = (pts: [number, number, number][], fill: string, opacity = 1) =>
  pts.map(([x, y, r]) => <circle key={`${x},${y}`} cx={x} cy={y} r={r} fill={fill} opacity={opacity} />);

const SCENES: Record<string, Def> = {
  "bg-meadow": {
    sky: ["#cfeeff", "#fdf6e6"],
    art: <>{dots([[150, 120, 46], [205, 110, 60], [265, 125, 44], [760, 170, 40], [810, 160, 54], [865, 175, 38]], "#fff", 0.85)}
      {hill("M0 820Q250 690 520 800T1000 760V1000H0z", "#b9e29a")}{hill("M0 890Q300 800 600 880T1000 850V1000H0z", "#93cf72")}</>,
  },
  "bg-space": {
    sky: ["#1b1f4b", "#4b3a7e"],
    art: <>{dots([[90, 90, 4], [200, 220, 3], [330, 80, 5], [470, 190, 3], [610, 70, 4], [720, 240, 3], [900, 110, 5], [60, 430, 3], [940, 420, 4], [520, 420, 3], [260, 560, 4], [800, 600, 3]], "#fff6c9")}
      <circle cx="850" cy="300" r="70" fill="#f2a65a" /><ellipse cx="850" cy="300" rx="115" ry="22" fill="none" stroke="#ffe0a8" stroke-width="10" transform="rotate(-18 850 300)" />
      {hill("M0 900Q240 820 500 890T1000 860V1000H0z", "#8d83b8")}{dots([[180, 930, 26], [520, 950, 34], [800, 925, 22]], "#786da6")}</>,
  },
  "bg-sea": {
    sky: ["#9fe3f2", "#2d8fc0"],
    art: <>{dots([[120, 640, 12], [150, 560, 18], [130, 470, 9], [860, 500, 14], [830, 410, 10], [880, 340, 18], [500, 300, 9]], "#fff", 0.45)}
      <path d="M90 900q30-90 0-160M140 910q-30-70 5-150M900 900q-30-90 10-170" fill="none" stroke="#1d7a5f" stroke-width="18" stroke-linecap="round" />
      {hill("M0 900Q260 850 520 895T1000 880V1000H0z", "#f2dca0")}</>,
  },
  "bg-snow": {
    sky: ["#dcebfa", "#f7fbff"],
    art: <>{dots([[80, 120, 8], [220, 260, 6], [380, 100, 9], [520, 300, 6], [680, 150, 8], [830, 280, 7], [940, 90, 9], [140, 480, 7], [860, 520, 8]], "#fff")}
      {hill("M0 830Q240 720 520 810T1000 770V1000H0z", "#e3eefb")}<path d="M160 800l50-120 50 120zM790 800l44-110 44 110z" fill="#6ba58a" />{hill("M0 890Q300 830 600 890T1000 860V1000H0z", "#fff")}</>,
  },
  "bg-jungle": {
    sky: ["#d9f2c0", "#8fcf8b"],
    art: <>{hill("M0 760Q200 640 420 760T1000 700V1000H0z", "#6fb56d")}<path d="M0 0q150 60 130 260Q60 120 0 150zM1000 0q-150 60-130 260 70-140 130-110z" fill="#4d9a57" />
      {hill("M0 880Q280 800 560 880T1000 840V1000H0z", "#3f8a4d")}</>,
  },
  "bg-sunset": {
    sky: ["#ffb37a", "#ffe3b0"],
    art: <><circle cx="500" cy="640" r="150" fill="#ffd86b" />{hill("M0 800Q260 690 520 790T1000 740V1000H0z", "#c9788f")}{hill("M0 890Q300 820 620 890T1000 850V1000H0z", "#8d5a86")}</>,
  },
};

export function Scene({ id }: { id: string }) {
  const s = SCENES[id] ?? SCENES["bg-meadow"];
  return (
    <div class="scene" style={{ background: `linear-gradient(${s.sky[0]}, ${s.sky[1]})` }} aria-hidden="true">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice">{s.art}</svg>
    </div>
  );
}
