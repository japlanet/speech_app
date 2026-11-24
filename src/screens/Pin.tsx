import { useEffect, useState } from "preact/hooks";
import { checkPin, checkRecovery, newRecoveryCode, setPin, waitSeconds } from "../store/lockbox.ts";
import { lock } from "../store/store.ts";
import { HomeIcon } from "../ui/icons.tsx";
import { go } from "../ui/nav.ts";

export function Keypad({ length, title, note, onDone, busyFor = 0 }: { length: number; title: string; note?: string; onDone: (code: string) => void; busyFor?: number }) {
  const [code, setCode] = useState("");
  const press = (d: string) => {
    if (busyFor > 0 || code.length >= length) return;
    const next = code + d;
    setCode(next);
    if (next.length === length) {
      onDone(next);
      setTimeout(() => setCode(""), 250);
    }
  };
  return (
    <div class="keypad">
      <h2>{title}</h2>
      <div class="pin-dots">{Array.from({ length }, (_, i) => <i key={i} class={i < code.length ? "on" : ""} />)}</div>
      <p class="keypad-note">{busyFor > 0 ? `Please wait ${busyFor} seconds.` : (note ?? "")}</p>
      <div class="keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => <button key={d} class="key" onClick={() => press(d)}>{d}</button>)}
        <span />
        <button class="key" onClick={() => press("0")}>0</button>
        <button class="key small" onClick={() => setCode(code.slice(0, -1))}>delete</button>
      </div>
    </div>
  );
}

export function Pin() {
  const [mode, setMode] = useState<"pin" | "recover" | "new" | "again">("pin");
  const [note, setNote] = useState("");
  const [first, setFirst] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(waitSeconds());
  useEffect(() => {
    const t = setInterval(() => setBusy(waitSeconds()), 500);
    return () => clearInterval(t);
  }, []);
  const enter = async (text: string) => {
    const ok = mode === "pin" ? await checkPin(text) : await checkRecovery(text);
    setBusy(waitSeconds());
    if (!ok) return setNote(mode === "pin" ? "That is not the PIN." : "That is not the recovery code.");
    setNote("");
    if (mode === "pin") return go("parent");
    setCode(text);
    setMode("new");
  };
  return (
    <main class="screen pin-screen">
      <button class="round" aria-label="Home" onClick={() => go("home")}><HomeIcon /></button>
      {mode === "pin" && <Keypad key="p" length={4} title="Grown-ups: enter your PIN" note={note} busyFor={busy} onDone={enter} />}
      {mode === "recover" && <Keypad key="r" length={8} title="Enter your 8-digit recovery code" note={note} busyFor={busy} onDone={enter} />}
      {mode === "new" && <Keypad key="n" length={4} title="Choose a new PIN" onDone={p => (setFirst(p), setMode("again"))} />}
      {mode === "again" && (
        <Keypad key="a" length={4} title="Enter the new PIN again" onDone={async p => {
          if (p !== first) return setMode("new");
          await setPin(p, code);
          go("parent");
        }} />
      )}
      {mode === "pin" && <button class="link" onClick={() => (setMode("recover"), setNote(""))}>Forgotten the PIN?</button>}
    </main>
  );
}

const iPad = /iPad|iPhone/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const installed = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
export const inSafariTab = iPad && !installed;

export function Setup() {
  const [step, setStep] = useState<"install" | "pin" | "again" | "code">(inSafariTab && !lock.value ? "install" : "pin");
  const [pin, choose] = useState("");
  const [note, setNote] = useState("");
  const [code] = useState(newRecoveryCode);
  return (
    <main class="screen pin-screen">
      {lock.value && step !== "code" && <button class="round" aria-label="Back" onClick={() => go("home")}><HomeIcon /></button>}
      {step === "install" && (
        <div class="sheet">
          <h2>First, add this to the Home Screen</h2>
          <ol>
            <li>Tap the <b>Share</b> button in Safari (a square with an arrow).</li>
            <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
            <li>Close Safari and open <b>Sound Studio</b> from the Home Screen.</li>
          </ol>
          <p>The Home Screen app keeps its own storage. Anything you record here in Safari would <b>not</b> appear there.</p>
          <button class="link" onClick={() => setStep("pin")}>Carry on in Safari, just to look around</button>
        </div>
      )}
      {step === "pin" && <Keypad key="1" length={4} title="Welcome! Grown-ups: choose a 4-digit PIN" note={note} onDone={p => (choose(p), setStep("again"))} />}
      {step === "again" && <Keypad key="2" length={4} title="Enter the same PIN again" onDone={p => (p === pin ? setStep("code") : (setNote("Those did not match. Let’s try again."), setStep("pin")))} />}
      {step === "code" && (
        <div class="sheet">
          <h2>Write this recovery code down</h2>
          <p class="code">{code.slice(0, 4)} {code.slice(4)}</p>
          <p>It is the only way back in if you forget the PIN. It is not shown again.</p>
          <button class="big" onClick={async () => { await setPin(pin, code); go("parent"); }}>I’ve written it down</button>
        </div>
      )}
    </main>
  );
}
