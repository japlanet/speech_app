import { Prizes } from "./screens/Prizes.tsx";
import { Wheel } from "./screens/Wheel.tsx";
import { saveFailed, progress } from "./store/store.ts";
import { screen } from "./ui/nav.ts";
import { CelebrationLayer } from "./ui/Celebration.tsx";
import { Scene } from "./ui/Scene.tsx";
import { Build } from "./screens/Build.tsx";
import { Home } from "./screens/Home.tsx";
import { Match } from "./screens/Match.tsx";
import { Pin, Setup } from "./screens/Pin.tsx";
import { Parent } from "./screens/parent/Parent.tsx";

export function App() {
  const s = screen.value;
  return (
    <>
      <Scene id={progress.value.chosen.background} />
      {s === "home" && <Home />}
      {s === "build" && <Build />}
      {s === "match" && <Match />}
      {s === "wheel" && <Wheel />}
      {s === "prizes" && <Prizes />}
      {s === "setup" && <Setup />}
      {s === "pin" && <Pin />}
      {s === "parent" && <Parent />}
      <CelebrationLayer />
      {saveFailed.value && <div class="save-failed" role="alert">Grown-up: the iPad could not save the last change. Free up some space, then make a backup.</div>}
    </>
  );
}
