import { saveFailed, progress } from "./store/store.ts";
import { screen } from "./ui/nav.ts";
import { Scene } from "./ui/Scene.tsx";
import { Home } from "./screens/Home.tsx";
import { Pin, Setup } from "./screens/Pin.tsx";
import { Parent } from "./screens/parent/Parent.tsx";

export function App() {
  const s = screen.value;
  return (
    <>
      <Scene id={progress.value.chosen.background} />
      {s === "home" && <Home />}
      {s === "setup" && <Setup />}
      {s === "pin" && <Pin />}
      {s === "parent" && <Parent />}
      {saveFailed.value && <div class="save-failed" role="alert">Grown-up: the iPad could not save the last change. Free up some space, then make a backup.</div>}
    </>
  );
}
