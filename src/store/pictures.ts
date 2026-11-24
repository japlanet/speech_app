import { forgetPicture } from "../ui/Picture.tsx";
import { saveMedia } from "./store.ts";

/** Shrink a photo and save it. Redrawing it also drops where and when it was taken. */
export async function savePicture(key: string, file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("no picture");
    forgetPicture(key);
    await saveMedia({ id: key, kind: "image", type: "image/jpeg", blob });
  } finally {
    URL.revokeObjectURL(url);
  }
}
