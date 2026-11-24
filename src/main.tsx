import "@fontsource/andika/latin-400.css";
import "@fontsource/andika/latin-700.css";
import "./styles.css";
import { render } from "preact";
import { App } from "./app.tsx";
import { installUnlock } from "./audio/engine.ts";
import { registerWorker } from "./store/update.ts";
import { load, lock, watchMidnight } from "./store/store.ts";
import { screen } from "./ui/nav.ts";
import { calmTouches } from "./ui/touch.ts";

async function boot() {
  const root = document.getElementById("app")!;
  calmTouches();
  try {
    await load();
  } catch {
    root.textContent = "Sound Studio could not open its storage on this iPad. Please close the app and open it again.";
    return;
  }
  screen.value = lock.value ? "home" : "setup";
  installUnlock();
  watchMidnight();
  render(<App />, root);
  registerWorker();
  // Ask the iPad to keep our data even if it runs low on space.
  void navigator.storage?.persist?.().catch(() => undefined);
}
void boot();
