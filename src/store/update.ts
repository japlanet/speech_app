import { signal } from "@preact/signals";
import { screen } from "../ui/nav.ts";

export const offlineReady = signal(false);
let reg: ServiceWorkerRegistration | null = null;
let reloading = false;

function useWaiting(): boolean {
  if (!reg?.waiting) return false;
  reg.waiting.postMessage("use-new-version");
  return true;
}

/** Save the app for offline use. A new version is swapped in as the app opens, never in the middle of play. */
export function registerWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (controlled && !reloading) {
      reloading = true;
      location.reload();
    }
    controlled = true;
  });
  void navigator.serviceWorker.ready.then(() => (offlineReady.value = true));
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: "none" })
    .then(r => {
      reg = r;
      useWaiting();
    })
    .catch(() => undefined);
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (Date.now() - hiddenAt > 10 * 60_000 && screen.value === "home") useWaiting();
  });
}

/** For the parent area. The only time the app itself asks the website for anything after the first load. */
export async function checkForUpdate(): Promise<"none" | "updating" | "offline"> {
  if (!reg) return "none";
  if (useWaiting()) return "updating";
  try {
    await reg.update();
  } catch {
    return "offline";
  }
  const next = reg.installing;
  if (next) await new Promise<void>(done => {
    next.addEventListener("statechange", () => next.state !== "installing" && done());
    setTimeout(done, 20_000);
  });
  return useWaiting() ? "updating" : "none";
}
