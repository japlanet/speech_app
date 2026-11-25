import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { play, sfx, stopVoice } from "../audio/engine.ts";
import { pickDistractors } from "../core/distractors.ts";
import { drawFromBag, shuffle } from "../core/random.ts";
import { mediaKey, type Word } from "../core/types.ts";
import { activeWords, has, media, settings, targetSound } from "../store/store.ts";
import { Bar, NotReady } from "../ui/Bar.tsx";
import { DominoStrip } from "../ui/DominoStrip.tsx";
import { useAlive } from "../ui/hooks.ts";
import { SoundBars, Speaker } from "../ui/icons.tsx";
import { cased, TileFace } from "../ui/LetterTile.tsx";
import { popFrom } from "../ui/fx.ts";
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
  /** The card in his hand, whether it is over the box, and whether he tried before hearing all three. */
  const [heldId, setHeldId] = useState("");
  const [over, setOver] = useState(false);
  const [listenFirst, setListenFirst] = useState(false);
  const [speaking, setSpeaking] = useState("");
  const [lit, setLit] = useState(-1);
  const locked = useRef(false);
  const timer = useRef(0);
  const answer = useRef<HTMLDivElement>(null);
  const held = useRef<{ w: Word; el: HTMLElement; pointer: number; x0: number; y0: number; moved: boolean; card: DOMRect; box: DOMRect; inside: boolean } | null>(null);
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
    setHeard(h => (h.has(w.id) ? h : new Set([...h, w.id])));
  };
  const allHeard = choices.every(c => heard.has(c.id) || out.has(c.id));

  const listen = (w: Word) => {
    if (!locked.current && !out.has(w.id)) say(w);
  };

  // ---- Dragging a card. The words are unseen, so a card speaks when it is touched or picked up. ----
  const down = (w: Word, e: PointerEvent) => {
    // One card at a time: a resting palm must not steal another.
    if (e.button > 0 || held.current || locked.current || out.has(w.id)) return;
    const el = e.currentTarget as HTMLElement;
    el.style.transition = "none";
    el.style.transform = "";
    held.current = { w, el, pointer: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, card: el.getBoundingClientRect(), box: answer.current!.getBoundingClientRect(), inside: false };
    setHeldId(w.id);
    setListenFirst(false);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* the touch has already ended */
    }
  };
  const move = (e: PointerEvent) => {
    const h = held.current;
    if (!h || h.pointer !== e.pointerId) return;
    const dx = e.clientX - h.x0;
    const dy = e.clientY - h.y0;
    if (!h.moved) {
      if (Math.hypot(dx, dy) < 12) return;
      h.moved = true;
      say(h.w);
    }
    h.el.style.transform = `translate3d(${dx}px,${dy}px,0)`;
    // Generous: a finger in the box counts, and so does a card that mostly covers it.
    const cx = h.card.left + h.card.width / 2 + dx;
    const cy = h.card.top + h.card.height / 2 + dy;
    const near = (x: number, y: number, room: number) => x > h.box.left - room && x < h.box.right + room && y > h.box.top - room && y < h.box.bottom + room;
    const inside = near(e.clientX, e.clientY, 10) || near(cx, cy, 24);
    if (inside !== h.inside) {
      h.inside = inside;
      setOver(inside);
    }
  };
  const up = (e: PointerEvent, cancelled = false) => {
    const h = held.current;
    if (!h || h.pointer !== e.pointerId) return;
    held.current = null;
    if (!alive.current) return;
    setHeldId("");
    setOver(false);
    if (!h.moved) {
      if (!cancelled) say(h.w);
      return;
    }
    if (cancelled || !h.inside) return goHome(h.el);
    // Listening comes first: until all three have been heard the card goes back, and the speakers wiggle.
    if (!choices.every(c => c.id === h.w.id || heard.has(c.id) || out.has(c.id))) {
      goHome(h.el);
      setListenFirst(true);
      return;
    }
    void drop(h);
  };
  const goHome = (el: HTMLElement) => {
    el.style.transition = "transform .35s ease-out";
    el.style.transform = "";
  };
  const drop = async ({ w, el, card, box }: { w: Word; el: HTMLElement; card: DOMRect; box: DOMRect }) => {
    locked.current = true;
    if (w.id !== word.id) {
      goHome(el);
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
    el.style.transition = "transform .16s ease-out";
    el.style.transform = `translate3d(${box.left + (box.width - card.width) / 2 - card.left}px,${box.top + (box.height - card.height) / 2 - card.top}px,0)`;
    sfx.snap();
    await sleep(0.18);
    if (!alive.current) return;
    // From here the box itself shows the card, so it stays put if the iPad is turned.
    setRight(true);
    sfx.bell();
    popFrom(answer.current);
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
      <div class="match-area">
        <div class="choices">
          {choices.map((c, i) => {
            const gone = out.has(c.id);
            const won = right && c.id === word.id;
            const state = [gone && "gone", won && "won", right && !won && "dim", allHeard && !gone && !right && "ready", speaking === c.id && "speaking", heldId === c.id && "held", listenFirst && !heard.has(c.id) && "unheard"].filter(Boolean).join(" ");
            return (
              <div key={c.id} class={`choice ${state}`} style={{ "--n": i }}>
                <button class="round say" aria-label={`Listen to choice ${i + 1}`} disabled={gone} onClick={() => listen(c)}><Speaker size={56} /></button>
                <button
                  class="pick"
                  aria-label={`Choice ${i + 1}: drag into the box`}
                  disabled={gone}
                  onPointerDown={e => down(c, e)}
                  onPointerMove={move}
                  onPointerUp={e => up(e)}
                  onPointerCancel={e => up(e, true)}
                  onLostPointerCapture={e => up(e, true)}
                >
                  <WordCard text={settings.value.showPrinted === "always" ? c.text : ""} />
                </button>
                <i class={`heard ${heard.has(c.id) ? "on" : ""}`} />
              </div>
            );
          })}
        </div>
        <div ref={answer} class={`answer ${allHeard ? "ready" : ""} ${over ? "over" : ""} ${right ? "done" : ""}`} aria-label="Answer box">
          {right ? <WordCard text={word.text} /> : null}
        </div>
      </div>
      <DominoStrip />
    </main>
  );
}

function WordCard({ text }: { text: string }) {
  return <span class="word-card">{text ? <span class="card-text" style={{ "--chars": text.length }}>{cased(text)}</span> : <SoundBars size={64} />}</span>;
}
