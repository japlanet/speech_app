/** Stop pinch zoom, double-tap zoom, rubber-banding, text selection and the long-press menu. */
export function calmTouches(): void {
  const stop = (e: Event) => e.preventDefault();
  for (const type of ["gesturestart", "gesturechange", "dblclick"]) document.addEventListener(type, stop, { passive: false });
  document.addEventListener("contextmenu", e => {
    if (!inParent(e.target)) e.preventDefault();
  });
  document.addEventListener("dragstart", stop);
  document.addEventListener(
    "touchmove",
    e => {
      if (!e.cancelable) return;
      // Only the parent area scrolls, and only with one finger.
      if (e.touches.length > 1 || !inParent(e.target)) e.preventDefault();
    },
    { passive: false },
  );
}

function inParent(t: EventTarget | null): boolean {
  return t instanceof Element && !!t.closest(".scrolls");
}
