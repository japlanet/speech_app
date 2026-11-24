import { saveFailed, progress } from "./store/store.ts";
import { screen } from "./ui/nav.ts";
import { Scene } from "./ui/Scene.tsx";
import { Home } from "./screens/Home.tsx";

export function App() {
  const s = screen.value;
  return (
    <>
      <Scene id={progress.value.chosen.background} />
      {(s === "home" || s === "setup") && <Home />}
      {saveFailed.value && <div class="save-failed" role="alert">Grown-up: the iPad could not save the last change. Free up some space, then make a backup.</div>}
    </>
  );
}
