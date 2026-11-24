import { reps } from "../../store/store.ts";

const pretty = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export function History() {
  const rows = [...reps.value].sort((a, b) => b.date.localeCompare(a.date) || a.wheelName.localeCompare(b.wheelName));
  const met = rows.filter(r => r.reps >= r.target).length;
  return (
    <section class="card">
      <h3>Practice history <small>{rows.length ? `target met on ${met} of ${rows.length}` : ""}</small></h3>
      {rows.length === 0 ? <p>Nothing yet. Each “I said it!” on the practice wheel is counted here.</p> : (
        <table class="history">
          <thead><tr><th>Date</th><th>Wheel</th><th>Reps</th><th>Target</th><th>Met</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.date + r.wheelId}><td>{pretty(r.date)}</td><td>{r.wheelName}</td><td>{r.reps}</td><td>{r.target}</td><td>{r.reps >= r.target ? "✓ yes" : "not yet"}</td></tr>)}</tbody>
        </table>
      )}
    </section>
  );
}
