import type { ComponentChildren } from "preact";
import { HomeIcon } from "./icons.tsx";
import { go } from "./nav.ts";

export function Bar({ children }: { children?: ComponentChildren }) {
  return (
    <header class="bar">
      <button class="round" aria-label="Home" onClick={() => go("home")}><HomeIcon /></button>
      <div class="bar-middle">{children}</div>
    </header>
  );
}

/** For a screen that cannot be played yet. Pictures for the child, one line for the grown-up. */
export function NotReady({ picture, children }: { picture: string; children: ComponentChildren }) {
  return (
    <main class="screen">
      <Bar />
      <div class="not-ready"><span>{picture}</span><p>{children}</p></div>
    </main>
  );
}
