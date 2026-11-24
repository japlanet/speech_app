import { useState } from "preact/hooks";
import { LIMITS } from "../../core/backup.ts";
import { blockedColours, PALETTE } from "../../core/colours.ts";
import { activeWheel, colours, phonemes, resetColours, resetProgress, saveWheel, setColour, setSettings, settings, words, progress } from "../../store/store.ts";
import { checkForUpdate, offlineReady } from "../../store/update.ts";
import { TileFace } from "../../ui/LetterTile.tsx";
import { go } from "../../ui/nav.ts";
import { Choice, Field, Stepper, SureButton } from "./bits.tsx";

export function SettingsTab() {
  const s = settings.value;
  const wheel = activeWheel.value;
  const target = wheel?.target ?? s.defaultTarget;
  const [update, setUpdate] = useState("");
  return (
    <>
      <section class="card">
        <Field label="Child’s name, shown on the home screen (kept on this iPad only)"><input class="input" value={s.childName} maxLength={30} onInput={e => setSettings({ childName: e.currentTarget.value })} /></Field>
        <Stepper label="Daily target" hint="For this week’s wheel, and for new wheels" value={target} min={LIMITS.target[0]} max={LIMITS.target[1]} step={target >= 10 ? 5 : 1} onChange={n => { setSettings({ defaultTarget: n }); if (wheel) saveWheel({ ...wheel, target: n }); }} />
        <Stepper label="Round length" hint="Words before the dominoes fall" value={s.roundLength} min={LIMITS.roundLength[0]} max={LIMITS.roundLength[1]} onChange={n => setSettings({ roundLength: n })} />
        <Choice label="Letters on tiles" value={s.letterCase} options={[["lower", "a b c"], ["upper", "A B C"]]} onChange={letterCase => setSettings({ letterCase })} />
        <Choice label="Printed words in “words → sounds”" hint="Hidden words make listening matter" value={s.showPrinted} options={[["afterCorrect", "After a right answer"], ["always", "Always"]]} onChange={showPrinted => setSettings({ showPrinted })} />
      </section>
      <section class="card">
        <h3>Extra tiles in “sounds → words” <small>now using {Math.min(progress.value.level, s.maxDecoys)}</small></h3>
        <Stepper label="Add one after" hint="words in a row with every tile right first time" value={s.stepUp} min={LIMITS.stepUp[0]} max={LIMITS.stepUp[1]} onChange={n => setSettings({ stepUp: n })} />
        <Stepper label="Take one away after" hint="wrong placements in one word" value={s.dropAfter} min={LIMITS.dropAfter[0]} max={LIMITS.dropAfter[1]} onChange={n => setSettings({ dropAfter: n })} />
        <Stepper label="Most extra tiles" hint="0 means never any" value={s.maxDecoys} min={LIMITS.maxDecoys[0]} max={LIMITS.maxDecoys[1]} onChange={n => setSettings({ maxDecoys: n })} />
      </section>
      <section class="card">
        <h3>Colours <small>one for each sound, the same everywhere</small></h3>
        <Colours />
        <SureButton label="Back to the starting colours" sure="Tap again to reset the colours" onSure={resetColours} />
      </section>
      <section class="card">
        <h3>This app</h3>
        <div class="row"><div class="grow"><b>{import.meta.env.DEV ? "Development copy" : offlineReady.value ? "Ready to use offline" : "Saving for offline use…"}</b><small>{update}</small></div>
          <button class="btn" onClick={async () => { setUpdate("Checking…"); const r = await checkForUpdate(); setUpdate(r === "updating" ? "Updating now…" : r === "offline" ? "No internet just now." : "You have the newest version."); }}>Check for update</button>
        </div>
        <div class="row"><div class="grow"><b>PIN</b><small>You will also get a new recovery code</small></div><button class="btn" onClick={() => go("setup")}>Change PIN</button></div>
        <div class="row"><div class="grow"><b>Reset progress</b><small>Clears prizes, dominoes, level and history. Words, wheels and recordings stay.</small></div><SureButton label="Reset progress" sure="Tap again to clear it all" onSure={resetProgress} /></div>
      </section>
    </>
  );
}

function Colours() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = phonemes.value.find(p => p.id === openId);
  const blocked = open ? blockedColours(open.id, colours.value, words.value) : new Set<string>();
  return (
    <>
      <div class="colour-grid">
        {phonemes.value.map(p => <button key={p.id} class={`mini-tile colour-tile ${p.id === openId ? "on" : ""}`} aria-label={`Colour of ${p.hint}`} onClick={() => setOpenId(p.id === openId ? null : p.id)}><TileFace grapheme={p.grapheme} phonemeId={p.id} /></button>)}
      </div>
      {open && (
        <div class="swatches">
          <p><b>{open.hint}</b>. Faded colours belong to a sound beside it in one of your words.</p>
          {PALETTE.map(c => <button key={c} class={`swatch ${open.colour.toLowerCase() === c ? "on" : ""}`} aria-label={c} disabled={blocked.has(c)} style={{ background: c }} onClick={() => setColour(open.id, c)} />)}
          <label class="swatch any" aria-label="Any other colour"><input type="color" value={open.colour} onChange={e => { const c = e.currentTarget.value.toLowerCase(); if (!blocked.has(c)) setColour(open.id, c); }} /></label>
        </div>
      )}
    </>
  );
}
