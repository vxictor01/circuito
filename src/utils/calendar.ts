import type { Database } from "../types";
export interface CalendarEvent {
  id: string;
  date: string;
  kind: "abertura" | "deadline" | "resultado" | "festival";
  title: string;
  detail: string;
  festivalId: string;
  confirmed: boolean;
}
export function calendarEvents(db: Database) {
  const events: CalendarEvent[] = [];
  const es = new Map(db.editions.map((e) => [e.id, e]));
  const fs = new Map(db.festivals.map((f) => [f.id, f]));
  for (const c of db.calls) {
    const e = es.get(c.editionId);
    const f = fs.get(e?.festivalId || "");
    if (!e || !f) continue;
    const base = {
      title: f.name,
      detail: `${e.year} · ${c.name}`,
      festivalId: f.id,
    };
    if (c.opening)
      events.push({
        ...base,
        id: c.id + "-open",
        date: c.opening,
        kind: "abertura",
        confirmed: c.confidence === "confirmado",
      });
    for (const [d, i] of c.deadlines.map((d, i) => [d, i] as const))
      events.push({
        ...base,
        id: c.id + "-" + i,
        date: d.date,
        kind: "deadline",
        detail: `${c.name} · ${d.kind}`,
        confirmed: d.confirmed && c.confidence !== "edição anterior",
      });
  }
  for (const e of db.editions) {
    const f = fs.get(e.festivalId);
    if (!f) continue;
    for (const [k, date] of [
      ["festival", e.start],
      ["festival", e.end],
      ["resultado", e.resultDate],
    ] as const) {
      if (date)
        events.push({
          id: e.id + "-" + k + "-" + date,
          date,
          kind: k,
          title: f.name,
          detail: String(e.year),
          festivalId: f.id,
          confirmed: e.confidence === "confirmado",
        });
    }
  }
  for (const s of db.submissions) {
    if (s.resultDate)
      events.push({
        id: s.id + "-result",
        date: s.resultDate,
        kind: "resultado",
        title: fs.get(s.festivalId)?.name || "Festival",
        detail: db.films.find((f) => f.id === s.filmId)?.title || "",
        festivalId: s.festivalId,
        confirmed: true,
      });
  }
  return events
    .filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i)
    .sort((a, b) => a.date.localeCompare(b.date));
}
