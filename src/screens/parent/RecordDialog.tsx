import { signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { decode, forget, playBuffer, stopVoice } from "../../audio/engine.ts";
import { MAX_SECONDS, MicError, Recorder } from "../../audio/recorder.ts";
import { autoTrim, gainFor, peaks } from "../../core/trim.ts";
import { mediaGet } from "../../store/db.ts";
import { dropMedia, saveMedia } from "../../store/store.ts";
import { Mic, PlayIcon, StopIcon } from "../../ui/icons.tsx";
import { SureButton } from "./bits.tsx";

export interface ToRecord {
  key: string;
  label: string;
  hint: string;
}
const queue = signal<ToRecord[] | null>(null);
export const recordThese = (list: ToRecord[]) => (queue.value = list.length ? list : null);
export const recorderOpen = () => queue.value !== null;

export function RecordDialogHost() {
  return queue.value ? <RecordDialog list={queue.value} onClose={() => (queue.value = null)} /> : null;
}

interface Take {
  blob: Blob;
  buffer: AudioBuffer;
  start: number;
  end: number;
  /** The samples as one channel, for trimming and drawing. */
  samples: Float32Array;
}

function mono(b: AudioBuffer): Float32Array {
  if (b.numberOfChannels === 1) return b.getChannelData(0);
  const out = new Float32Array(b.length);
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += d[i] / b.numberOfChannels;
  }
  return out;
}

function RecordDialog({ list, onClose }: { list: ToRecord[]; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const item = list[at];
  const mic = useRef(new Recorder());
  const taking = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const [state, setState] = useState<"idle" | "opening" | "recording" | "working">("idle");
  const [take, setTake] = useState<Take | null>(null);
  const [saved, setSaved] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      stopVoice();
      mic.current.close();
    };
  }, []);

  // Show the recording that is already there, so it can be re-trimmed.
  useEffect(() => {
    let current = true;
    setTake(null);
    setChanged(false);
    setSaved(false);
    setError("");
    void (async () => {
      try {
        const m = await mediaGet(item.key);
        if (!m || !current) return;
        const buffer = await decode(m.blob);
        if (!current) return;
        setSaved(true);
        setTake({ blob: m.blob, buffer, samples: mono(buffer), start: m.start ?? 0, end: Math.min(m.end ?? buffer.duration, buffer.duration) });
      } catch {
        if (current) setError("The saved recording could not be opened. Please record it again.");
      }
    })();
    return () => void (current = false);
  }, [item.key]);

  const begin = async () => {
    setError("");
    setState("opening");
    try {
      await mic.current.open();
      if (!live.current) return mic.current.close();
      stopVoice();
      taking.current = mic.current.start();
      setTake(null);
      setState("recording");
    } catch (e) {
      setState("idle");
      setError(e instanceof MicError ? e.message : "The microphone could not be started. Please try again.");
    }
  };

  const finish = async () => {
    const t = taking.current;
    if (!t) return;
    taking.current = null;
    setState("working");
    try {
      const blob = await t.stop();
      const buffer = await decode(blob);
      if (!live.current) return;
      const samples = mono(buffer);
      const trim = autoTrim(samples, buffer.sampleRate);
      const next = { blob, buffer, samples, start: trim.start, end: trim.end };
      setTake(next);
      setChanged(true);
      hear(next);
      if (!samples.some(s => Math.abs(s) > 0.002)) setError("That sounds silent. Check the microphone and try again.");
    } catch (e) {
      setError(e instanceof MicError ? e.message : "That recording could not be used. Please try again.");
    }
    if (live.current) setState("idle");
  };

  useEffect(() => {
    if (state !== "recording") return;
    const t = setTimeout(() => void finish(), MAX_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [state]);

  const hear = (t: Take) => playBuffer(t.buffer, t.start, t.end, gainFor(t.samples, t.buffer.sampleRate, t.start, t.end));

  const save = async () => {
    if (!take) return;
    try {
      await saveMedia({
        id: item.key, kind: "audio", type: take.blob.type || "audio/mp4", blob: take.blob,
        start: take.start, end: take.end, gain: gainFor(take.samples, take.buffer.sampleRate, take.start, take.end),
      });
    } catch {
      return setError("The iPad could not save this. It may be out of space.");
    }
    forget(item.key);
    if (at + 1 < list.length) setAt(at + 1);
    else onClose();
  };

  const last = at + 1 >= list.length;
  return (
    <div class="dialog-back">
      <div class="dialog record scrolls" role="dialog" aria-label={`Record ${item.label}`}>
        <header class="record-head">
          <div>
            <h2 class="record-label">{item.label}</h2>
            <p>{item.hint}</p>
          </div>
          <div class="record-nav">
            {list.length > 1 && <span>{at + 1} of {list.length}</span>}
            <button class="btn" disabled={state === "recording"} onClick={onClose}>Close</button>
          </div>
        </header>

        {state === "recording" ? <Level mic={mic.current} /> : take ? <Waveform take={take} onChange={(start, end) => { setTake({ ...take, start, end }); setChanged(true); }} /> : <div class="wave empty">{state === "working" ? "One moment…" : saved ? "" : "No recording yet. Missing sounds stay silent in the game."}</div>}
        {take && state !== "recording" && <p class="tip">Drag the blue handles to trim. Silence has already been trimmed for you.</p>}
        {error && <p class="warn" role="alert">{error}</p>}

        <div class="record-main">
          {state === "recording"
            ? <button class="record-button stop" aria-label="Stop" onClick={() => void finish()}><StopIcon size={64} /></button>
            : <button class="record-button" aria-label="Record" disabled={state !== "idle"} onClick={() => void begin()}><Mic size={64} /></button>}
        </div>
        <p class="tip centre">{state === "recording" ? "Tap to stop" : take ? "Tap to record it again" : "Tap, wait a moment, then say it"}</p>

        <footer class="record-foot">
          {take && state === "idle" && <button class="btn" onClick={() => hear(take)}><PlayIcon size={26} /> Play</button>}
          {take && state === "idle" && changed && <button class="btn" onClick={() => setTake({ ...take, ...autoTrim(take.samples, take.buffer.sampleRate) })}>Trim for me</button>}
          {saved && state === "idle" && <SureButton label="Delete" sure="Really delete?" onSure={async () => { await dropMedia([item.key]); setTake(null); setSaved(false); setChanged(false); }} />}
          <span class="grow" />
          {list.length > 1 && !last && <button class="btn" disabled={state === "recording"} onClick={() => setAt(at + 1)}>Skip</button>}
          <button class="btn primary big-btn" disabled={!take || !changed || state !== "idle"} onClick={() => void save()}>{last ? "Save" : "Save and next"}</button>
        </footer>
      </div>
    </div>
  );
}

function Level({ mic }: { mic: Recorder }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, Math.sqrt(mic.level()) * 1.3)})`;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div class="wave level"><div class="level-bar" ref={bar} /><span>Listening…</span></div>;
}

function Waveform({ take, onChange }: { take: Take; onChange: (start: number, end: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const grab = useRef<"start" | "end" | null>(null);
  const length = take.buffer.duration;
  useEffect(() => {
    const c = canvas.current!;
    const ratio = Math.min(3, window.devicePixelRatio || 1);
    const w = (c.width = Math.round(c.clientWidth * ratio));
    const h = (c.height = Math.round(c.clientHeight * ratio));
    const g = c.getContext("2d")!;
    const bars = Math.max(40, Math.floor(w / (4 * ratio)));
    const p = peaks(take.samples, bars);
    const top = Math.max(0.02, ...p);
    g.clearRect(0, 0, w, h);
    p.forEach((v, i) => {
      const t = ((i + 0.5) / bars) * length;
      const tall = Math.max(2 * ratio, (v / top) * (h - 24 * ratio));
      g.fillStyle = t >= take.start && t <= take.end ? "#2f74d0" : "#cfd6e2";
      g.fillRect((i / bars) * w, (h - tall) / 2, (w / bars) * 0.62, tall);
    });
  }, [take]);
  const pos = (e: PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * length;
  };
  const move = (e: PointerEvent) => {
    const t = pos(e);
    if (grab.current === "start") onChange(Math.min(t, take.end - 0.05), take.end);
    else if (grab.current === "end") onChange(take.start, Math.max(t, take.start + 0.05));
  };
  return (
    <div
      class="wave"
      onPointerDown={e => {
        const t = pos(e);
        grab.current = Math.abs(t - take.start) <= Math.abs(t - take.end) ? "start" : "end";
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={e => grab.current && move(e)}
      onPointerUp={() => (grab.current = null)}
      onPointerCancel={() => (grab.current = null)}
    >
      <canvas ref={canvas} />
      <i class="handle" style={{ left: `${(take.start / length) * 100}%` }} />
      <i class="handle" style={{ left: `${(take.end / length) * 100}%` }} />
    </div>
  );
}
