import { useRef, useState } from "preact/hooks";
import { makeBackup, openBackup, restore, type ReadyBackup } from "../../store/backup.ts";
import { SureButton } from "./bits.tsx";

const size = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

export function Backup() {
  const [file, setFile] = useState<File | null>(null);
  const [incoming, setIncoming] = useState<ReadyBackup | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const work = async (job: () => Promise<void>) => {
    setBusy(true);
    setNote("");
    try { await job(); } catch (e) { setNote(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(false);
  };
  const keep = async (f: File) => {
    // The share sheet is the dependable way to save a file from a Home Screen app.
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f] });
        return setNote("Done. Check that the file is where you meant to put it.");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return setNote("Not saved.");
      }
    }
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setNote("The file is in your downloads.");
  };
  return (
    <>
      <section class="card">
        <h3>Save a backup</h3>
        <p>One .zip with every word, wheel, recording, picture and all progress. Keep it in iCloud Drive or send it to yourself. It holds your voice and photos, so treat it as private.</p>
        {file
          ? <div class="row"><div class="grow"><b>{file.name}</b><small>{size(file.size)}, ready</small></div><button class="btn primary big-btn" onClick={() => void keep(file)}>Save it to…</button></div>
          : <button class="btn primary big-btn" disabled={busy} onClick={() => work(async () => setFile(await makeBackup()))}>{busy ? "Making it…" : "Make a backup"}</button>}
      </section>
      <section class="card">
        <h3>Restore a backup</h3>
        <p>This replaces everything on this iPad with what is in the backup. Your PIN stays the same.</p>
        {incoming
          ? (
            <div class="row">
              <div class="grow"><b>From {incoming.data.savedAt ? new Date(incoming.data.savedAt).toLocaleString() : "an unknown date"}</b><small>{incoming.data.words.length} words, {incoming.data.wheels.length} wheels, {incoming.media.filter(m => m.kind === "audio").length} recordings, {incoming.media.filter(m => m.kind === "image").length} pictures</small></div>
              <button class="btn" onClick={() => setIncoming(null)}>Cancel</button>
              <SureButton label="Replace everything" sure="Tap again to replace it all" onSure={() => void work(async () => { await restore(incoming); setIncoming(null); setFile(null); setNote("Restored."); })} />
            </div>
          )
          : <button class="btn" disabled={busy} onClick={() => input.current?.click()}>Choose a backup file</button>}
        <input ref={input} type="file" accept=".zip,application/zip" hidden onChange={e => {
          const el = e.currentTarget;
          const f = el.files?.[0];
          el.value = "";
          if (f) void work(async () => setIncoming(await openBackup(f)));
        }} />
      </section>
      {note && <p class="banner tip-card card" role="status">{note}</p>}
    </>
  );
}
