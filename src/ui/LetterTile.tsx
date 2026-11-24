import { inkFor } from "../core/colours.ts";
import { colourOf, progress, settings } from "../store/store.ts";

export const cased = (s: string) => (settings.value.letterCase === "upper" ? s.toUpperCase() : s.toLowerCase());

/** The look of a tile: one sound, one colour. Place it inside whatever handles the touches. */
export function TileFace({ grapheme, phonemeId, muted = false }: { grapheme: string; phonemeId: string; muted?: boolean }) {
  const colour = colourOf(phonemeId);
  return (
    <span class={`tile-face skin-${progress.value.chosen.tile} len-${Math.min(grapheme.length, 3)}`} style={{ "--tile-colour": colour, color: inkFor(colour) }}>
      {cased(grapheme)}
      {muted && <MutedBadge />}
    </span>
  );
}

export function MutedBadge() {
  return (
    <span class="muted-badge" role="img" aria-label="No recording yet">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19h8l11-9v28l-11-9H6z" fill="currentColor" /><path d="M32 19l10 10M42 19l-10 10" /></svg>
    </span>
  );
}
