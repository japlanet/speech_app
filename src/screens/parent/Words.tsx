import { useMemo, useState } from "preact/hooks";
import { minimalPairs, needsMorePairs, pickDistractors } from "../../core/distractors.ts";
import { CATALOGUE, PHONEME_IDS, phonemesFor } from "../../core/phonemes.ts";
import { cutGaps, suggestSplit, toggleGap } from "../../core/split.ts";
import { mediaKey, type Tile, type Word } from "../../core/types.ts";
import { activeWords, deleteWord, has, newId, saveWord, targetSound, words } from "../../store/store.ts";
import { TileFace } from "../../ui/LetterTile.tsx";
import { Picture } from "../../ui/Picture.tsx";
import { Field, PicturePicker, SoundButtons, SureButton, Switch } from "./bits.tsx";

export function Words() {
  const [editing, setEditing] = useState<Word | null>(null);
  if (editing) return <WordEditor key={editing.id} word={editing} onClose={() => setEditing(null)} />;
  const sorted = [...words.value].sort((a, b) => a.text.localeCompare(b.text));
  return (
    <>
      <section class="card hero">
        <div class="grow"><h2>{activeWords.value.length} words in use</h2><p>Tap a word to change it. Switched-off words are kept, but not used in the games.</p></div>
        <button class="btn primary big-btn" onClick={() => setEditing({ id: newId(), text: "", tiles: [], emoji: "", active: true, distractors: [] })}>Add a word</button>
      </section>
      <div class="word-grid">
        {sorted.map(w => (
          <button key={w.id} class={`card word-card ${w.active ? "" : "off"}`} onClick={() => setEditing(w)}>
            <span class="word-pic"><Picture mediaKey={mediaKey.wordPicture(w.id)} emoji={w.emoji} /></span>
            <span class="word-tiles">{w.tiles.map((t, i) => <span key={i} class="mini-tile"><TileFace {...t} /></span>)}</span>
            <span class="flags">
              {!w.active && <em>off</em>}
              {w.active && !has(mediaKey.word(w.id)) && <em class="amber">not recorded</em>}
              {w.active && needsMorePairs(w, words.value) && <em class="amber">needs more minimal pairs</em>}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

const normal = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

function WordEditor({ word, onClose }: { word: Word; onClose: () => void }) {
  const isNew = !words.value.some(w => w.id === word.id);
  const [text, setText] = useState(word.text);
  const [tiles, setTiles] = useState<Tile[]>(word.tiles);
  const [emoji, setEmoji] = useState(word.emoji);
  const [active, setActive] = useState(word.active);
  const [distractors, setDistractors] = useState(word.distractors);
  const cuts = cutGaps(tiles);
  const letters = tiles.map(t => t.grapheme).join("");

  const changeText = (raw: string) => {
    const next = normal(raw);
    setText(next);
    if (next !== letters) setTiles(suggestSplit(next));
  };
  const twin = words.value.find(w => w.id !== word.id && w.text === text);
  const unknown = tiles.some(t => !t.phonemeId);
  const ready = text.length > 0 && tiles.length > 0 && !unknown && !twin;
  const draft: Word = { ...word, text, tiles, emoji: emoji.trim(), active, distractors };
  const pool = activeWords.value.filter(w => w.id !== word.id);
  const suggested = useMemo(() => (ready ? pickDistractors({ ...draft, distractors: [] }, pool, targetSound.value, () => 0.5) : []), [text, JSON.stringify(tiles), pool.length]);
  const pairs = ready ? minimalPairs(draft, pool).length : 0;
  const save = () => { saveWord(draft); onClose(); };

  return (
    <>
      <div class="editor-head">
        <button class="btn" onClick={onClose}>Cancel</button>
        <h2 class="grow">{isNew ? "New word" : word.text}</h2>
        <button class="btn primary big-btn" disabled={!ready} onClick={save}>Save word</button>
      </div>
      <section class="card">
        <Field label="Word"><input class="input" value={text} maxLength={12} autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck={false} onInput={e => changeText(e.currentTarget.value)} /></Field>
        {twin && <p class="warn">“{text}” is already in the list.</p>}
        {tiles.length > 0 && (
          <>
            <p class="tip">One tile per sound. Tap between two letters to split or join them.</p>
            <div class="splitter">
              {[...letters].map((ch, i) => (
                <span key={i} class="split-part">
                  {i > 0 && <button class={`gap ${cuts.has(i) ? "cut" : ""}`} aria-label={cuts.has(i) ? "Join these letters" : "Split here"} onClick={() => setTiles(toggleGap(tiles, i))}><i /></button>}
                  <b>{ch}</b>
                </span>
              ))}
            </div>
            <div class="tile-rows">
              {tiles.map((t, i) => {
                const likely = phonemesFor(t.grapheme);
                return (
                  <div class="tile-row" key={i}>
                    <span class="mini-tile"><TileFace {...t} /></span>
                    <select class="input" aria-label={`Sound of ${t.grapheme}`} value={t.phonemeId} onChange={e => { const v = e.currentTarget.value; setTiles(tiles.map((x, j) => (j === i ? { ...x, phonemeId: v } : x))); }}>
                      {!t.phonemeId && <option value="">Choose its sound…</option>}
                      {likely.map(id => <option key={id} value={id}>{CATALOGUE[id].hint}</option>)}
                      <optgroup label="All sounds">{PHONEME_IDS.filter(id => !likely.includes(id)).map(id => <option key={id} value={id}>{CATALOGUE[id].hint}</option>)}</optgroup>
                    </select>
                  </div>
                );
              })}
            </div>
            {unknown && <p class="warn">Choose a sound for every tile, or join its letters to a neighbour.</p>}
          </>
        )}
      </section>
      <section class="card">
        <Switch label="Use in the games" on={active} onChange={setActive} />
        {!isNew && <div class="row"><div class="grow"><b>Recording</b><small>The whole word, said naturally</small></div><SoundButtons id={mediaKey.word(word.id)} label={text} hint="the whole word" /></div>}
        <div class="row">
          <div class="grow"><b>Picture</b><small>A photo, or an emoji typed here</small><input class="input emoji-input" value={emoji} maxLength={8} aria-label="Emoji" onInput={e => setEmoji(e.currentTarget.value)} /></div>
          {!isNew && <PicturePicker id={mediaKey.wordPicture(word.id)} emoji={emoji} />}
        </div>
        {isNew && <p class="tip">Save the word first, then open it to add a photo and a recording.</p>}
      </section>
      {ready && (
        <section class="card">
          <h3>Wrong answers in “words → sounds”</h3>
          {pairs < 2 && <p class="warn">Needs more minimal pairs: {pairs === 0 ? "no word" : "only one word"} in use differs from “{text}” by exactly one sound. The closest words are used instead.</p>}
          <p class="tip">Chosen automatically, for example: {suggested.map(w => w.text).join(" and ") || "none yet"}. Pick your own here if you prefer.</p>
          <div class="two">
            {[0, 1].map(n => (
              <select key={n} class="input" aria-label={`Wrong answer ${n + 1}`} value={distractors[n] ?? ""} onChange={e => {
                const next = [distractors[0] ?? "", distractors[1] ?? ""];
                next[n] = e.currentTarget.value;
                setDistractors(next.filter((x, i) => x && next.indexOf(x) === i));
              }}>
                <option value="">Automatic</option>
                {pool.filter(w => w.id === distractors[n] || !distractors.includes(w.id)).sort((a, b) => a.text.localeCompare(b.text)).map(w => <option key={w.id} value={w.id}>{w.text}</option>)}
              </select>
            ))}
          </div>
        </section>
      )}
      {!isNew && <SureButton label="Delete this word" sure="Tap again to delete it and its recording" onSure={() => { void deleteWord(word.id); onClose(); }} />}
    </>
  );
}
