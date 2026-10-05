import type { Database } from "../types";
export interface CalendarEvent {
  id: string;
  date: string;
  kind:
    | "abertura"
    | "deadline"
    | "resultado"
    | "festival"
    | "prazo interno"
    | "tarefa"
    | "sessão";
  title: string;
  detail: string;
  festivalId: string;
  callId?: string;
  filmId?: string;
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
      callId: c.id,
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
    const festival = fs.get(s.festivalId);
    const filmTitle = db.films.find((f) => f.id === s.filmId)?.title || "";
    const personalBase = {
      title: festival?.name || "Festival",
      festivalId: s.festivalId,
      filmId: s.filmId,
    };
    if (s.resultDate || s.expectedDecisionDate)
      events.push({
        id: s.id + "-result",
        date: s.resultDate || s.expectedDecisionDate,
        kind: "resultado",
        ...personalBase,
        detail: `${filmTitle}${s.resultDate ? " · resultado registrado" : " · previsão"}`,
        confirmed: Boolean(s.resultDate),
      });
    if (s.internalDeadline)
      events.push({
        id: s.id + "-internal",
        date: s.internalDeadline,
        kind: "prazo interno",
        ...personalBase,
        detail: `${filmTitle}${s.nextAction ? ` · ${s.nextAction}` : ""}`,
        confirmed: true,
      });
    for (const task of s.tasks) {
      if (!task.due || task.done) continue;
      events.push({
        id: task.id,
        date: task.due,
        kind: "tarefa",
        ...personalBase,
        detail: `${filmTitle} · ${task.title}`,
        confirmed: true,
      });
    }
    for (const screening of s.screenings) {
      if (!screening.date) continue;
      events.push({
        id: screening.id,
        date: screening.date,
        kind: "sessão",
        ...personalBase,
        detail: `${filmTitle}${screening.place ? ` · ${screening.place}` : ""}`,
        confirmed: true,
      });
    }
  }
  return events
    .filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i)
    .sort((a, b) => a.date.localeCompare(b.date));
}

const icsEscape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

export function calendarToICS(events: CalendarEvent[]) {
  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Circuito//Calendario de distribuicao//PT-BR",
    "CALSCALE:GREGORIAN",
  ];
  for (const event of events) {
    rows.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(event.id)}@circuito.local`,
      `DTSTART;VALUE=DATE:${event.date.replaceAll("-", "")}`,
      `SUMMARY:${icsEscape(`${event.kind}: ${event.title}`)}`,
      `DESCRIPTION:${icsEscape(event.detail)}`,
      `CATEGORIES:${icsEscape(event.kind)}`,
      "END:VEVENT",
    );
  }
  rows.push("END:VCALENDAR");
  return rows.join("\r\n") + "\r\n";
}
