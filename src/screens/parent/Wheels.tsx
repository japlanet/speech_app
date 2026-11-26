import { useState } from "preact/hooks";
import { LIMITS } from "../../core/backup.ts";
import { CATALOGUE, PHONEME_IDS } from "../../core/phonemes.ts";
import { mediaKey, type Wheel, type WheelItem } from "../../core/types.ts";
import { deleteWheel, has, newId, saveWheel, settings, wheels } from "../../store/store.ts";
import { Field, PicturePicker, SoundButtons, Stepper, SureButton, Switch } from "./bits.tsx";

export function Wheels() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = wheels.value.find(w => w.id === openId);
  if (open) return <WheelEditor wheel={open} onClose={() => setOpenId(null)} />;
  const add = () => {
    const w: Wheel = { id: newId(), name: "New wheel", centre: "", phonemeId: "", items: [], target: settings.value.defaultTarget, active: wheels.value.length === 0 };
    saveWheel(w);
    setOpenId(w.id);
  };
  return (
    <>
      <section class="card hero">
        <div class="grow"><h2>Practice wheels</h2><p>One wheel is in use at a time. Its sound is also the one the other games lean towards.</p></div>
        <button class="btn primary big-btn" onClick={add}>New wheel</button>
      </section>
      {wheels.value.map(w => (
        <section key={w.id} class={`card wheel-card ${w.active ? "good" : ""}`}>
          <div class="grow">
            <h3>{w.name}</h3>
            <p>{w.items.map(i => i.label || "?").join(", ") || "No pictures yet"} · {w.target} a day</p>
            <small>{w.items.filter(i => has(mediaKey.wheelItem(i.id))).length} of {w.items.length} recorded</small>
          </div>
          {w.active ? <b class="pill">This week</b> : <button class="btn" onClick={() => saveWheel({ ...w, active: true })}>Use this week</button>}
          <button class="btn" onClick={() => setOpenId(w.id)}>Edit</button>
        </section>
      ))}
    </>
  );
}

function WheelEditor({ wheel, onClose }: { wheel: Wheel; onClose: () => void }) {
  const set = (change: Partial<Wheel>) => saveWheel({ ...wheel, ...change });
  const setItem = (id: string, change: Partial<WheelItem>) => set({ items: wheel.items.map(i => (i.id === id ? { ...i, ...change } : i)) });
  const move = (at: number, by: number) => {
    const items = [...wheel.items];
    [items[at], items[at + by]] = [items[at + by], items[at]];
    set({ items });
  };
  return (
    <>
      <div class="editor-head"><h2 class="grow">{wheel.name}</h2><button class="btn primary big-btn" onClick={onClose}>Done</button></div>
      <section class="card">
        <div class="two">
          <Field label="Name (only you see this)"><input class="input" value={wheel.name} maxLength={40} onInput={e => set({ name: e.currentTarget.value })} /></Field>
          <Field label="Letters in the middle"><input class="input" value={wheel.centre} maxLength={4} autocapitalize="none" autocorrect="off" onInput={e => set({ centre: e.currentTarget.value.trim() })} /></Field>
        </div>
        <Field label="Target sound">
          <select class="input" value={wheel.phonemeId} onChange={e => set({ phonemeId: e.currentTarget.value, centre: wheel.centre || (CATALOGUE[e.currentTarget.value]?.grapheme ?? "") })}>
            <option value="">Not linked to one sound</option>
            {PHONEME_IDS.filter(id => id !== "silent").map(id => <option key={id} value={id}>{CATALOGUE[id].hint}</option>)}
          </select>
        </Field>
        <Switch label="Use this week" hint="Turns the other wheels off" on={wheel.active} onChange={on => set({ active: on })} />
        <Stepper label="Daily target" hint={laps(wheel.target, wheel.items.length)} value={wheel.target} min={LIMITS.target[0]} max={LIMITS.target[1]} step={wheel.target >= 20 ? 5 : 1} stepDown={wheel.target > 20 ? 5 : 1} onChange={target => set({ target })} />
        <div class="row">
          <div class="grow"><b>Recording for the middle</b><small>{wheel.phonemeId ? "Optional: otherwise it plays your recording of the sound" : "The sound on its own"}</small></div>
          <SoundButtons id={mediaKey.wheelCentre(wheel.id)} label={wheel.centre || "middle"} hint={`the middle of ${wheel.name}`} />
        </div>
      </section>
      <section class="card">
        <h3>Pictures around the wheel <small>3 to 12 work best</small></h3>
        {wheel.items.map((i, n) => (
          <div class="item" key={i.id}>
            <PicturePicker id={mediaKey.itemPicture(i.id)} emoji={i.emoji} />
            <div class="grow item-fields">
              <Field label="Label"><input class="input" value={i.label} maxLength={16} autocapitalize="none" autocorrect="off" onInput={e => setItem(i.id, { label: e.currentTarget.value })} /></Field>
              <Field label="Emoji"><input class="input emoji-input" value={i.emoji} maxLength={8} onInput={e => setItem(i.id, { emoji: e.currentTarget.value.trim() })} /></Field>
            </div>
            <SoundButtons id={mediaKey.wheelItem(i.id)} label={i.label || "picture"} hint={`the blended model for “${i.label}”`} />
            <div class="item-tools">
              <button class="btn" aria-label="Move up" disabled={n === 0} onClick={() => move(n, -1)}>↑</button>
              <button class="btn" aria-label="Move down" disabled={n === wheel.items.length - 1} onClick={() => move(n, 1)}>↓</button>
              <SureButton label="Remove" sure="Sure?" onSure={() => set({ items: wheel.items.filter(x => x.id !== i.id) })} />
            </div>
          </div>
        ))}
        {wheel.items.length < 12 && <button class="btn" onClick={() => set({ items: [...wheel.items, { id: newId(), label: "", emoji: "" }] })}>Add a picture</button>}
      </section>
      <SureButton label="Delete this wheel" sure="Tap again to delete it and its recordings" onSure={() => { onClose(); void deleteWheel(wheel.id); }} />
    </>
  );
}

/** "12 = twice round the wheel" when the target is a whole number of laps. */
function laps(target: number, items: number): string {
  const base = "How many times to say it each day";
  if (items < 2 || target % items !== 0) return base;
  const n = target / items;
  return `${base}. ${target} = ${n === 1 ? "once" : n === 2 ? "twice" : `${n} times`} round the wheel, every picture ${n === 1 ? "once" : n === 2 ? "twice" : `${n} times`}`;
}
