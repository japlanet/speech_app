import { useEffect, useState } from "preact/hooks";
import { media } from "../store/store.ts";
import { mediaGet } from "../store/db.ts";

/** Pictures are shared by every place that shows them, and refreshed when one is replaced. */
const urls = new Map<string, Promise<string | null>>();

export function forgetPicture(key: string): void {
  void urls.get(key)?.then(u => u && URL.revokeObjectURL(u));
  urls.delete(key);
}

export function forgetAllPictures(): void {
  for (const key of [...urls.keys()]) forgetPicture(key);
}

function urlFor(key: string): Promise<string | null> {
  let job = urls.get(key);
  if (!job) {
    job = mediaGet(key).then(m => (m ? URL.createObjectURL(m.blob) : null)).catch(() => null);
    urls.set(key, job);
  }
  return job;
}

/** A photo if there is one, otherwise the emoji, otherwise nothing. */
export function Picture({ mediaKey, emoji, class: cls = "" }: { mediaKey: string; emoji: string; class?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const stored = media.value;
  const present = stored.has(mediaKey);
  useEffect(() => {
    let live = true;
    setUrl(null);
    if (present) void urlFor(mediaKey).then(u => live && setUrl(u));
    return () => void (live = false);
  }, [mediaKey, present, stored]);
  if (present) return url ? <img class={`picture ${cls}`} src={url} alt="" draggable={false} /> : <span class={`picture ${cls}`} />;
  return emoji ? <span class={`picture emoji ${cls}`}>{emoji}</span> : null;
}
