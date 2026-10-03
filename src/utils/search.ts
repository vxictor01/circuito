import type { Database, Festival, Call } from "../types";
import { norm } from "../migrations/legacy";
import {
  daysBetween,
  deadlineStatus,
  nextDeadline,
  currentFees,
  todayISO,
} from "./deadlines";
export interface FestivalFilters {
  query: string;
  country: string;
  region: string;
  genre: string;
  format: string;
  minutes: string;
  pf: string;
  fee: string;
  premiere: string;
  deadline: string;
  priority: string;
  activity: string;
  favorite: boolean;
  needsUpdate: boolean;
  filmId: string;
}
export const emptyFilters: FestivalFilters = {
  query: "",
  country: "",
  region: "",
  genre: "",
  format: "",
  minutes: "",
  pf: "",
  fee: "",
  premiere: "",
  deadline: "",
  priority: "",
  activity: "",
  favorite: false,
  needsUpdate: false,
  filmId: "",
};
export function indexes(db: Database) {
  const editions = new Map(db.editions.map((e) => [e.id, e]));
  const latestYear = new Map<string, number>();
  for (const e of db.editions)
    latestYear.set(
      e.festivalId,
      Math.max(e.year, latestYear.get(e.festivalId) || 0),
    );
  const callsByFestival = new Map<string, Call[]>();
  for (const c of db.calls) {
    const edition = editions.get(c.editionId);
    if (!edition) continue;
    let calls = callsByFestival.get(edition.festivalId);
    if (!calls) {
      calls = [];
      callsByFestival.set(edition.festivalId, calls);
    }
    calls.push(c);
  }
  return { editions, callsByFestival, latestYear };
}
export function latestCalls(
  festivalId: string,
  _db: Database,
  index = indexes(_db),
) {
  const max = index.latestYear.get(festivalId);
  return (index.callsByFestival.get(festivalId) || []).filter(
    (c) => index.editions.get(c.editionId)?.year === max,
  );
}
export function needsUpdate(f: Festival, staleDays: number, now = new Date()) {
  const dates = f.sources
    .map((s) => s.checkedAt)
    .filter(Boolean)
    .sort();
  const latest = dates.at(-1);
  return (
    !latest ||
    daysBetween(latest, todayISO("America/Sao_Paulo", now)) > staleDays ||
    f.sources.every(
      (s) =>
        s.confidence === "não verificado" || s.confidence === "edição anterior",
    )
  );
}
export function matchCall(
  c: Call,
  filters: FestivalFilters,
  now: Date,
  timezone: string,
) {
  const fees = currentFees(c, now, timezone);
  if (filters.format && !c.formats.includes(filters.format as never))
    return false;
  if (filters.genre && !c.genres.includes(filters.genre as never)) return false;
  if (
    filters.minutes &&
    (c.maxMinutes === null ||
      Number(filters.minutes) > c.maxMinutes ||
      (c.minMinutes !== null && Number(filters.minutes) < c.minMinutes))
  )
    return false;
  if (filters.pf && c.pf !== filters.pf) return false;
  if (
    filters.fee === "free" &&
    !fees.some((f) => f.free === "sim" || f.amount === 0)
  )
    return false;
  if (
    filters.fee === "paid" &&
    !fees.some((f) => f.amount !== null && f.amount > 0)
  )
    return false;
  if (
    filters.fee === "unknown" &&
    !(
      !fees.length ||
      fees.every((f) => f.free === "não confirmado" && f.amount === null)
    )
  )
    return false;
  if (filters.premiere === "none" && c.premiere !== "nenhuma") return false;
  if (
    filters.premiere === "no-world" &&
    ![
      "nenhuma",
      "internacional",
      "continental",
      "nacional",
      "estadual",
      "municipal",
      "preferência",
    ].includes(c.premiere)
  )
    return false;
  if (filters.deadline) {
    const status = deadlineStatus(c, now, timezone);
    if (filters.deadline === "open" && !status.open) return false;
    else if (filters.deadline === "closed" && status.label !== "Encerrado")
      return false;
    else if (/^\d+$/.test(filters.deadline)) {
      const d = nextDeadline(c, now, timezone);
      if (!d || c.confidence === "edição anterior") return false;
      const days = daysBetween(todayISO(d.timezone || timezone, now), d.date);
      if (days < 0 || days > Number(filters.deadline)) return false;
    }
  }
  return true;
}
export function filterFestivals(
  db: Database,
  filters: FestivalFilters,
  now = new Date(),
  index = indexes(db),
) {
  const q = norm(filters.query);
  const structured = !!(
    filters.format ||
    filters.minutes ||
    filters.pf ||
    filters.fee ||
    filters.premiere ||
    filters.deadline
  );
  return db.festivals.filter((f) => {
    const calls = latestCalls(f.id, db, index);
    if (
      q &&
      !norm(
        [
          f.name,
          f.internationalName,
          ...f.aliases,
          f.country,
          f.region,
          f.city,
          ...f.tags,
          ...f.genres,
          f.description,
          f.personalNotes,
          ...calls.map((c) => c.name + " " + c.notes),
        ].join(" "),
      ).includes(q)
    )
      return false;
    if (filters.country && f.country !== filters.country) return false;
    if (filters.region && f.region !== filters.region) return false;
    if (filters.priority && f.priority !== filters.priority) return false;
    if (filters.activity && f.activity !== filters.activity) return false;
    if (filters.favorite && !f.favorite) return false;
    if (filters.needsUpdate && !needsUpdate(f, db.settings.staleDays, now))
      return false;
    // Todas as regras precisam coexistir na mesma chamada; não mistura categorias incompatíveis.
    if (structured)
      return calls.some((c) =>
        matchCall(c, filters, now, db.settings.timezone),
      );
    if (
      filters.genre &&
      !f.genres.includes(filters.genre as never) &&
      !calls.some((c) => c.genres.includes(filters.genre as never))
    )
      return false;
    return true;
  });
}
