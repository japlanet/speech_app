import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { forgetAll } from "../audio/engine.ts";
import { readBackup, type BackupData, type BackupMedia } from "../core/backup.ts";
import { localDate } from "../core/day.ts";
import type { MediaRecord } from "../core/types.ts";
import { forgetAllPictures } from "../ui/Picture.tsx";
import { mediaAll, replaceAll } from "./db.ts";
import { colours, load, progress, reps, settings, wheels, words } from "./store.ts";

const EXT: Record<string, string> = { "audio/mp4": "m4a", "audio/webm": "webm", "image/jpeg": "jpg", "image/png": "png" };

/** Everything except the PIN, in one .zip. */
export async function makeBackup(): Promise<File> {
  const files: Zippable = {};
  const list: BackupMedia[] = [];
  const all = await mediaAll();
  for (const [i, { blob, ...m }] of all.entries()) {
    const file = `media/${String(i + 1).padStart(4, "0")}-${m.id.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.${EXT[m.type] ?? "bin"}`;
    files[file] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
    list.push({ ...m, file });
  }
  const data: BackupData = {
    app: "sound-studio", format: 1, savedAt: new Date().toISOString(),
    words: words.value, wheels: wheels.value, settings: settings.value, progress: progress.value, reps: reps.value, colours: colours.value, media: list,
  };
  files["data.json"] = strToU8(JSON.stringify(data, null, 1));
  return new File([zipSync(files) as Uint8Array<ArrayBuffer>], `sound-studio-backup-${localDate()}.zip`, { type: "application/zip" });
}

export interface ReadyBackup {
  data: BackupData;
  media: MediaRecord[];
}

/** Open and check a backup without changing anything yet. */
export async function openBackup(file: Blob): Promise<ReadyBackup> {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error("This file could not be opened as a .zip.");
  }
  // A zip that was unpacked and re-packed by hand may have gained an outer folder.
  const main = Object.keys(zip).find(n => n === "data.json" || (n.endsWith("/data.json") && !n.startsWith("__MACOSX")));
  if (!main) throw new Error("This .zip is not a Sound Studio backup.");
  let raw: unknown;
  try {
    raw = JSON.parse(strFromU8(zip[main]));
  } catch {
    throw new Error("This backup is damaged.");
  }
  const root = main.slice(0, -"data.json".length);
  const data = readBackup(raw);
  const media: MediaRecord[] = [];
  for (const { file: name, ...m } of data.media) {
    const bytes = zip[root + name];
    if (bytes?.length) media.push({ ...m, blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: m.type }) });
  }
  return { data, media };
}

/** Replace everything on this iPad (except the PIN) with the backup. */
export async function restore({ data, media }: ReadyBackup): Promise<void> {
  const { words, wheels, settings, progress, reps, colours } = data;
  await replaceAll({ words, wheels, settings, progress, reps, colours }, media);
  forgetAll();
  forgetAllPictures();
  await load();
}
