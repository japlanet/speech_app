import { lock, setLock } from "./store.ts";

const TRIES = "sound-studio-pin-tries";

async function digest(salt: string, text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${text}`));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function newRecoveryCode(): string {
  return [...crypto.getRandomValues(new Uint32Array(8))].map(n => String(n % 10)).join("");
}

export async function setPin(pin: string, recovery: string): Promise<void> {
  const salt = newRecoveryCode() + newRecoveryCode();
  setLock({ salt, pinHash: await digest(salt, pin), recoveryHash: await digest(salt, recovery) });
  clearTries();
}

interface Tries { count: number; until: number }
function tries(): Tries {
  try {
    return { count: 0, until: 0, ...JSON.parse(localStorage.getItem(TRIES) ?? "{}") };
  } catch {
    return { count: 0, until: 0 };
  }
}
function saveTries(t: Tries): void {
  try {
    localStorage.setItem(TRIES, JSON.stringify(t));
  } catch {
    /* private mode */
  }
}
const clearTries = () => saveTries({ count: 0, until: 0 });

/** Seconds before another guess is allowed. After every 5 wrong guesses the wait doubles: 30 s, 60 s, up to 10 min. */
export function waitSeconds(): number {
  return Math.min(600, Math.max(0, Math.ceil((tries().until - Date.now()) / 1000)));
}

async function check(which: "pinHash" | "recoveryHash", text: string): Promise<boolean> {
  const l = lock.value;
  if (!l || waitSeconds() > 0) return false;
  if ((await digest(l.salt, text)) === l[which]) {
    clearTries();
    return true;
  }
  const count = tries().count + 1;
  const wait = count % 5 === 0 ? Math.min(600, 30 * 2 ** (count / 5 - 1)) : 0;
  saveTries({ count, until: wait ? Date.now() + wait * 1000 : 0 });
  return false;
}
export const checkPin = (pin: string) => check("pinHash", pin);
export const checkRecovery = (code: string) => check("recoveryHash", code);
