/** The local calendar date, e.g. 2026-03-09. Reps reset when this changes. */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function msUntilMidnight(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 50).getTime() - d.getTime();
}
