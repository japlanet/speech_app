import { useState } from "preact/hooks";
import { mediaKey, type PhonemeId } from "../../core/types.ts";
import { activeWheel, has, media, missing, needed, type Needed } from "../../store/store.ts";
import { TileFace } from "../../ui/LetterTile.tsx";
import { SoundButtons } from "./bits.tsx";
import { recordThese } from "./RecordDialog.tsx";

const GROUPS: [Needed["group"], string][] = [["sounds", "Sounds"], ["wheel", "This week’s wheel"], ["words", "Words"], ["prizes", "New prizes"]];

export function Recordings() {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const left = missing.value;
  const none = needed.value.length > 0 && left.length === needed.value.length;
  const wheel = activeWheel.value;
  void media.value;
  return (
    <>
      <section class={`card hero ${left.length ? "todo" : "good"}`}>
        <div class="grow">
          <h2>{none ? "Let’s record the sounds first" : left.length ? `${left.length} recording${left.length === 1 ? "" : "s"} missing` : "Everything is recorded"}</h2>
          <p>{left.length
            ? `The app only ever plays your own voice, so nothing is heard until you record it. ${none ? `There are ${left.length} to do. You can stop at any time and carry on later.` : ""}`
            : "Nothing is missing for the words, the wheel and the prizes in use now."}</p>
        </div>
        {left.length > 0 && <button class="btn primary big-btn" onClick={() => recordThese(left)}>{none ? "Start recording" : "Record the missing ones"}</button>}
      </section>
      <section class="card tip-card">
        <p><b>Keep sounds pure.</b> Say a long “fffff”, not “fuh”. Say “t” and “p” as a short, quiet puff with no “uh” after it. A quiet room and 20 cm from the iPad works best.</p>
      </section>
      <div class="segments solo"><button class={onlyMissing ? "" : "on"} onClick={() => setOnlyMissing(false)}>All</button><button class={onlyMissing ? "on" : ""} onClick={() => setOnlyMissing(true)}>Missing only</button></div>
      {GROUPS.map(([id, title]) => {
        const all = needed.value.filter(n => n.group === id);
        const rows = onlyMissing ? all.filter(n => !has(n.key)) : all;
        if (!rows.length) return null;
        return (
          <section class="card" key={id}>
            <h3>{title} <small>{all.filter(n => has(n.key)).length} of {all.length} recorded</small></h3>
            {id === "wheel" && wheel?.phonemeId && !onlyMissing && (
              <div class="row">
                <div class="grow"><b>Middle of the wheel: {wheel.centre}</b><small>Optional. Until you record one, the middle plays your recording of the sound itself.</small></div>
                <SoundButtons id={mediaKey.wheelCentre(wheel.id)} label={wheel.centre} hint={`the middle of ${wheel.name}`} />
              </div>
            )}
            <div class="rec-grid">
              {rows.map(n => (
                <div class={`rec ${has(n.key) ? "" : "missing"}`} key={n.key}>
                  {id === "sounds" ? <span class="mini-tile"><TileFace grapheme={n.label} phonemeId={n.key.slice(3) as PhonemeId} /></span> : null}
                  <div class="grow"><b>{n.label}</b><small>{has(n.key) ? n.hint : "Not recorded"}</small></div>
                  <SoundButtons id={n.key} label={n.label} hint={n.hint} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
