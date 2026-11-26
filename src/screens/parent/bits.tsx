import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { forgetPicture, Picture } from "../../ui/Picture.tsx";
import { dropMedia, has } from "../../store/store.ts";
import { savePicture } from "../../store/pictures.ts";
import { play } from "../../audio/engine.ts";
import { Mic, Muted, Speaker } from "../../ui/icons.tsx";
import { recordThese } from "./RecordDialog.tsx";

/** Asks for a second tap before doing anything that cannot be undone. */
export function SureButton({ label, sure, onSure }: { label: string; sure: string; onSure: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return <button class={`btn danger ${armed ? "armed" : ""}`} onClick={() => (armed ? (setArmed(false), onSure()) : setArmed(true))}>{armed ? sure : label}</button>;
}

export function Stepper({ label, hint, value, min, max, step = 1, stepDown = step, onChange }: { label: string; hint?: string; value: number; min: number; max: number; step?: number; stepDown?: number; onChange: (n: number) => void }) {
  const to = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div class="row">
      <div class="grow"><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <div class="stepper">
        <button class="btn" aria-label={`Less: ${label}`} disabled={value <= min} onClick={() => to(value - stepDown)}>−</button>
        <output>{value}</output>
        <button class="btn" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => to(value + step)}>+</button>
      </div>
    </div>
  );
}

export function Switch({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div class="row">
      <div class="grow"><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <button class={`switch ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}><i /></button>
    </div>
  );
}

export function Choice<T extends string>({ label, hint, value, options, onChange }: { label: string; hint?: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div class="row">
      <div class="grow"><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <div class="segments">{options.map(([v, text]) => <button key={v} class={v === value ? "on" : ""} aria-pressed={v === value} onClick={() => onChange(v)}>{text}</button>)}</div>
    </div>
  );
}

/** Play what is recorded (or a muted speaker), beside a button to record or redo it. */
export function SoundButtons({ id, label, hint }: { id: string; label: string; hint: string }) {
  const there = has(id);
  return (
    <div class="sound-buttons">
      <button class="btn icon-btn" aria-label={there ? `Play ${label}` : `${label} is not recorded`} disabled={!there} onClick={() => play(id)}>{there ? <Speaker size={28} /> : <Muted size={28} />}</button>
      <button class={`btn icon-btn ${there ? "" : "primary"}`} aria-label={`${there ? "Re-record or trim" : "Record"} ${label}`} onClick={() => recordThese([{ key: id, label, hint }])}><Mic size={28} /></button>
    </div>
  );
}

export function PicturePicker({ id, emoji }: { id: string; emoji: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [bad, setBad] = useState(false);
  return (
    <div class="picker">
      <div class="picker-view"><Picture mediaKey={id} emoji={emoji} /></div>
      <div class="picker-buttons">
        <button class="btn" onClick={() => input.current?.click()}>{has(id) ? "Change photo" : "Add photo"}</button>
        {has(id) && <button class="btn" onClick={() => { forgetPicture(id); void dropMedia([id]); }}>Remove photo</button>}
      </div>
      {bad && <small class="warn">That picture could not be opened.</small>}
      <input ref={input} type="file" accept="image/*" hidden onChange={async e => {
        const el = e.currentTarget;
        const file = el.files?.[0];
        el.value = "";
        if (!file) return;
        setBad(false);
        try { await savePicture(id, file); } catch { setBad(true); }
      }} />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ComponentChildren }) {
  return <label class="field"><span>{label}</span>{children}</label>;
}
