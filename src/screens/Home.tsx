import { prize } from "../core/prizes.ts";
import { lock, progress, settings, targetSound, activeWheel, colourOf } from "../store/store.ts";
import { inkFor } from "../core/colours.ts";
import { Gear, Speaker } from "../ui/icons.tsx";
import { TileFace } from "../ui/LetterTile.tsx";
import { go } from "../ui/nav.ts";

export function Home() {
  const name = settings.value.childName.trim();
  const wheel = activeWheel.value;
  return (
    <main class="screen home">
      <header class="home-top">
        <button class="avatar-button" aria-label="Prizes" onClick={() => go("prizes")}>
          <span class="avatar">{prize(progress.value.chosen.avatar).emoji}</span>
        </button>
        <h1>{name ? `${name}’s Sound Studio` : "Sound Studio"}</h1>
        <button class="gear-button" aria-label="Grown-ups" onClick={() => go(lock.value ? "pin" : "setup")}><Gear size={40} /></button>
      </header>
      <nav class="modes">
        <button class="mode mode-build" aria-label="Sounds to words" onClick={() => go("build")}>
          <span class="mode-art art-build">
            <span class="art-tiles"><i><TileFace grapheme="c" phonemeId="k" /></i><i><TileFace grapheme="t" phonemeId="t" /></i></span>
            <span class="art-box"><b /><b><TileFace grapheme="a" phonemeId="a_short" /></b><b /></span>
          </span>
        </button>
        <button class="mode mode-match" aria-label="Words to sounds" onClick={() => go("match")}>
          <span class="mode-art art-match">
            <span class="art-word"><TileFace grapheme="c" phonemeId="k" /><TileFace grapheme="a" phonemeId="a_short" /><TileFace grapheme="t" phonemeId="t" /></span>
            {[0, 1, 2].map(i => <span key={i} class="art-row"><Speaker size={46} /><em /></span>)}
          </span>
        </button>
        <button class="mode mode-wheel" aria-label="Practice wheel" onClick={() => go("wheel")}>
          <span class="mode-art art-wheel">
            <svg viewBox="-110 -118 220 228">
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i * Math.PI) / 4;
                const b = a + Math.PI / 4;
                return <path key={i} d={`M0 0L${100 * Math.cos(a)} ${100 * Math.sin(a)}A100 100 0 0 1 ${100 * Math.cos(b)} ${100 * Math.sin(b)}z`} fill={["#f7c52b", "#6cc5f3", "#f291b8", "#93e3c1"][i % 4]} stroke="#fffaf0" stroke-width="4" />;
              })}
              <circle r="100" fill="none" stroke="#1b2238" stroke-width="6" />
              <circle r="36" fill={targetSound.value ? colourOf(targetSound.value) : "#fffaf0"} stroke="#1b2238" stroke-width="5" />
              <text y="15" text-anchor="middle" font-size="44" font-weight="700" fill={targetSound.value ? inkFor(colourOf(targetSound.value)) : "#1b2238"}>{wheel?.centre ?? ""}</text>
              <path d="M-15-116h30L0-84z" fill="#db3a2d" stroke="#1b2238" stroke-width="5" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </nav>
    </main>
  );
}
