import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { play, sfx, stopVoice } from "../audio/engine.ts";
import { pickDistractors } from "../core/distractors.ts";
import { drawFromBag, shuffle } from "../core/random.ts";
import { mediaKey, type Word } from "../core/types.ts";
import { activeWords, has, media, settings, targetSound } from "../store/store.ts";
import { Bar, NotReady } from "../ui/Bar.tsx";
import { DominoStrip } from "../ui/DominoStrip.tsx";
import { useAlive } from "../ui/hooks.ts";
import { Check, Speaker } from "../ui/icons.tsx";
import { cased, TileFace } from "../ui/LetterTile.tsx";
import { sleep } from "../ui/nav.ts";
import { rewardCorrect } from "../ui/rewards.ts";

let bag: string[] = [];

/** Mode 2: words → sounds. */
export function Match() {
  const [turn, setTurn] = useState(0);
  const last = useRef<string | null>(null);
  const round = useMemo(() => {
    // A choice that cannot be heard cannot be answered, so only recorded words take part.
    const pool = activeWords.value.filter(w => has(mediaKey.word(w.id)));
    const playable = pool.filter(w => pickDistractors(w, pool, targetSound.value).length === 2);
    const d = drawFromBag(bag, playable.map(w => w.id), last.current);
    bag = d.bag;
    last.current = d.next;
    const word = playable.find(w => w.id === d.next);
    return word ? { word, choices: shuffle([word, ...pickDistractors(word, pool, targetSound.value)]) } : null;
  }, [turn]);
  if (!round) return <NotReady picture="🎤">Grown-up: record at least three words first (gear, then Recordings).</NotReady>;
  return <MatchWord key={turn} {...round} onNext={() => setTurn(t => t + 1)} />;
}

function MatchWord({ word, choices, onNext }: { word: Word; choices: Word[]; onNext: () => void }) {
  const alive = useAlive();
  const [heard, setHeard] = useState<ReadonlySet<string>>(new Set());
  const [out, setOut] = useState<ReadonlySet<string>>(new Set());
  const [right, setRight] = useState(false);
  const [speaking, setSpeaking] = useState("");
  const [lit, setLit] = useState(-1);
  const locked = useRef(false);
  const timer = useRef(0);
  void media.value;

  useEffect(() => () => {
    clearTimeout(timer.current);
    stopVoice();
  }, []);

  const say = (w: Word) => {
    const length = play(mediaKey.word(w.id));
    setSpeaking(w.id);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => alive.current && setSpeaking(""), Math.max(0.4, length) * 1000);
    if (!heard.has(w.id)) setHeard(new Set([...heard, w.id]));
  };
  const allHeard = choices.every(c => heard.has(c.id) || out.has(c.id));

  const listen = (w: Word) => {
    if (!locked.current && !out.has(w.id)) say(w);
  };
  const pick = async (w: Word) => {
    if (locked.current || out.has(w.id)) return;
    // Until all three have been heard, touching a row only says it. Listening comes first.
    if (!allHeard) return say(w);
    locked.current = true;
    if (w.id !== word.id) {
      setOut(new Set([...out, w.id]));
      await sleep(0.45);
      if (!alive.current) return;
      const length = play(mediaKey.word(word.id));
      await sleep(Math.max(0.4, length) + 0.1);
      locked.current = false;
      return;
    }
    clearTimeout(timer.current);
    setSpeaking("");
    setRight(true);
    sfx.bell();
    await sleep(0.7);
    for (let i = 0; i < word.tiles.length; i++) {
      if (!alive.current) return;
      setLit(i);
      await sleep(Math.max(0.4, play(mediaKey.phoneme(word.tiles[i].phonemeId))) + 0.15);
    }
    if (!alive.current) return;
    setLit(-1);
    await sleep(Math.max(0.6, play(mediaKey.word(word.id))) + 0.3);
    if (!alive.current) return;
    await rewardCorrect();
    if (alive.current) onNext();
  };

  const showWords = settings.value.showPrinted === "always" || right;
  return (
    <main class="screen match" style={{ "--tiles": word.tiles.length }}>
      <Bar>
        <div class={`word-box ${right ? "done" : ""}`}>
          {word.tiles.map((t, i) => (
            <button key={i} class="word-tile" aria-label={`Sound ${t.grapheme}`} onClick={() => !locked.current && play(mediaKey.phoneme(t.phonemeId))}>
              <span class={`tile-wrap ${lit === i ? "lit" : ""}`}><TileFace {...t} muted={t.phonemeId !== "silent" && !has(mediaKey.phoneme(t.phonemeId))} /></span>
            </button>
          ))}
        </div>
      </Bar>
      <div class="choices">
        {choices.map((c, i) => {
          const gone = out.has(c.id);
          const won = right && c.id === word.id;
          return (
            <div key={c.id} class={`choice ${gone ? "gone" : ""} ${won ? "won" : ""} ${right && !won ? "dim" : ""} ${allHeard && !gone && !right ? "ready" : ""} ${speaking === c.id ? "speaking" : ""}`} style={{ "--n": i }}>
              <button class="round say" aria-label={`Listen to choice ${i + 1}`} disabled={gone} onClick={() => listen(c)}><Speaker size={56} /></button>
              <button class="pick" aria-label={`Choose ${i + 1}`} disabled={gone} onClick={() => void pick(c)}>
                <span class="pick-word">{showWords ? cased(c.text) : ""}</span>
                <span class="pick-mark">{won ? <Check size={52} /> : null}</span>
              </button>
              <i class={`heard ${heard.has(c.id) ? "on" : ""}`} />
            </div>
          );
        })}
      </div>
      <DominoStrip />
    </main>
  );
}
