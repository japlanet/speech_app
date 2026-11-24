import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { MediaRecord } from "../core/types.ts";

/** How a recording or picture is stored. `bytes` is only used where the browser refuses to store Blobs. */
type StoredMedia = Omit<MediaRecord, "blob"> & { blob?: Blob; bytes?: ArrayBuffer };

interface Schema extends DBSchema {
  kv: { key: string; value: unknown };
  media: { key: string; value: StoredMedia };
}

// All of the japlanet games share one website, so the database name says whose it is.
const NAME = "sound-studio";
let opening: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  opening ??= openDB<Schema>(NAME, 1, {
    upgrade(d) {
      d.createObjectStore("kv");
      d.createObjectStore("media", { keyPath: "id" });
    },
    terminated() {
      opening = null;
    },
  }).catch(e => {
    opening = null;
    throw e;
  });
  return opening;
}

/** iPadOS can drop the database connection while the app is in the background; try once more if so. */
async function run<T>(job: (d: IDBPDatabase<Schema>) => Promise<T>): Promise<T> {
  try {
    return await job(await db());
  } catch (e) {
    if (e instanceof DOMException && e.name === "InvalidStateError") {
      opening = null;
      return job(await db());
    }
    throw e;
  }
}

export const kvGet = <T>(key: string) => run(d => d.get("kv", key)) as Promise<T | undefined>;
export const kvPut = (key: string, value: unknown) => run(async d => void (await d.put("kv", value, key)));

const unpack = ({ bytes, ...m }: StoredMedia): MediaRecord => ({ ...m, blob: m.blob ?? new Blob([bytes ?? new ArrayBuffer(0)], { type: m.type }) });

/** Copy the Blob into memory first: one that still points at a recorder or file can go bad after a restart. */
async function pack(m: MediaRecord): Promise<{ asBlob: StoredMedia; asBytes: StoredMedia }> {
  const bytes = await m.blob.arrayBuffer();
  const { blob: _, ...rest } = m;
  return { asBlob: { ...rest, blob: new Blob([bytes], { type: m.type }) }, asBytes: { ...rest, bytes } };
}

export async function mediaPut(m: MediaRecord): Promise<void> {
  const p = await pack(m);
  try {
    await run(async d => void (await d.put("media", p.asBlob)));
  } catch {
    await run(async d => void (await d.put("media", p.asBytes)));
  }
}

export const mediaGet = async (id: string) => {
  const m = await run(d => d.get("media", id));
  return m && unpack(m);
};
export const mediaDelete = (id: string) => run(d => d.delete("media", id));
export const mediaAll = async () => (await run(d => d.getAll("media"))).map(unpack);
export const mediaKeys = async () => (await run(d => d.getAllKeys("media"))) as string[];

/** Replace everything at once, so a half-finished import can never leave a mixture behind. */
export async function replaceAll(kv: Record<string, unknown>, media: MediaRecord[]): Promise<void> {
  const packed = await Promise.all(media.map(pack));
  const write = (form: "asBlob" | "asBytes") =>
    run(async d => {
      const tx = d.transaction(["kv", "media"], "readwrite");
      const done = tx.done;
      done.catch(() => undefined);
      await tx.objectStore("media").clear();
      for (const p of packed) await tx.objectStore("media").put(p[form]);
      for (const [k, v] of Object.entries(kv)) await tx.objectStore("kv").put(v, k);
      await done;
    });
  try {
    await write("asBlob");
  } catch {
    await write("asBytes");
  }
}
