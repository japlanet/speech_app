import { signal } from "@preact/signals";
import { stopVoice } from "../audio/engine.ts";

export type Screen = "setup" | "home" | "build" | "match" | "wheel" | "prizes" | "pin" | "parent";
export const screen = signal<Screen>("home");
export type ParentTab = "recordings" | "words" | "wheels" | "settings" | "history" | "backup";
export const parentTab = signal<ParentTab>("recordings");

export function go(to: Screen): void {
  stopVoice();
  screen.value = to;
}
export const sleep = (seconds: number) => new Promise<void>(r => setTimeout(r, seconds * 1000));
