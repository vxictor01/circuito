import type { Call, Database, Festival, Priority } from "../types";
import { norm } from "../migrations/legacy";
import {
  currentFees,
  daysBetween,
  deadlineStatus,
  nextDeadline,
  todayISO,
} from "./deadlines";
import { eligibility } from "./eligibility";
import { brazilRegion } from "./normalization";

export type MatchState = "confirmed" | "pending" | "no";

export interface FestivalFilters {
  query: string;
  locationScope: "" | "brasil" | "exterior";
  country: string;
  brazilRegion: string;
  region: string;
  city: string;
  modality: string;
  language: string;
  genre: string;
  format: string;
  minutes: string;
  completionYear: string;
  pf: string;
  participation: string;
  fee: string;
  feeCeiling: string;
  premiere: string;
  onlineRule: string;
  deadline: string;
  closingFrom: string;
  closingTo: string;
  openingMonth: string;
  eventMonth: string;
  relevanceMin: string;
  relevanceBand: string;
  impact: string;
  relevanceConfidence: string;
  priority: string;
  activity: string;
  favorite: boolean;
  needsUpdate: boolean;
  dataQuality: "confirmed-only" | "include-pending";
  filmId: string;
  compatibility: string;
}

export const emptyFilters: FestivalFilters = {
  query: "",
  locationScope: "",
  country: "",
  brazilRegion: "",
  region: "",
  city: "",
  modality: "",
  language: "",
  genre: "",
  format: "",
  minutes: "",
  completionYear: "",
  pf: "",
  participation: "",
  fee: "",
  feeCeiling: "",
  premiere: "",
  onlineRule: "",
  deadline: "",
  closingFrom: "",
  closingTo: "",
  openingMonth: "",
  eventMonth: "",
  relevanceMin: "",
  relevanceBand: "",
  impact: "",
  relevanceConfidence: "",
  priority: "",
  activity: "",
  favorite: false,
  needsUpdate: false,
  dataQuality: "confirmed-only",
  filmId: "",
  compatibility: "",
};

export function indexes(db: Database) {
  const editions = new Map(db.editions.map((edition) => [edition.id, edition]));
  const latestYear = new Map<string, number>();
  const callsByFestival = new Map<string, Call[]>();
  for (const edition of db.editions)
    latestYear.set(
      edition.festivalId,
      Math.max(edition.year, latestYear.get(edition.festivalId) || 0),
    );
  for (const call of db.calls) {
    const edition = editions.get(call.editionId);
    if (!edition) continue;
    const calls = callsByFestival.get(edition.festivalId) || [];
    calls.push(call);
    callsByFestival.set(edition.festivalId, calls);
  }
  return { editions, callsByFestival, latestYear };
}

export function latestCalls(
  festivalId: string,
  db: Database,
  index = indexes(db),
) {
  const latestYear = index.latestYear.get(festivalId);
  return (index.callsByFestival.get(festivalId) || []).filter(
    (call) => index.editions.get(call.editionId)?.year === latestYear,
  );
}

export function needsUpdate(
  festival: Festival,
  staleDays: number,
  now = new Date(),
) {
  const dates = festival.sources
    .map((source) => source.accessedAt || source.checkedAt)
    .filter(Boolean)
    .sort();
  const latest = dates.at(-1);
  return (
    !latest ||
    daysBetween(latest, todayISO("America/Sao_Paulo", now)) > staleDays ||
    festival.sources.every((source) =>
      ["pendente", "confirmado em edição anterior", "não localizado"].includes(
        source.evidenceState,
      ),
    )
  );
}

const sourceConfirms = (call: Call, fields: string[]) =>
  call.confidence === "confirmado" ||
  call.sources.some(
    (source) =>
      source.evidenceState === "confirmado na edição atual" &&
      fields.some((field) => source.fields.includes(field)),
  );

const evaluate = (
  known: boolean,
  matches: boolean,
  verified: boolean,
): MatchState =>
  !known || !verified ? "pending" : matches ? "confirmed" : "no";

const combine = (states: MatchState[]): MatchState =>
  states.includes("no")
    ? "no"
    : states.includes("pending")
      ? "pending"
      : "confirmed";

export function matchCallState(
  call: Call,
  filters: FestivalFilters,
  now: Date,
  timezone: string,
  db?: Database,
): MatchState {
  const states: MatchState[] = [];
  const language = filters.language || filters.genre;
  if (filters.format)
    states.push(
      evaluate(
        call.formats.length > 0,
        call.formats.includes(filters.format as never),
        sourceConfirms(call, ["formats"]),
      ),
    );
  if (language) {
    const languages = call.languages.length ? call.languages : call.genres;
    states.push(
      evaluate(
        languages.length > 0,
        languages.includes(language as never),
        call.genresConfirmed && sourceConfirms(call, ["languages", "genres"]),
      ),
    );
  }
  if (filters.minutes) {
    const seconds = Math.round(Number(filters.minutes) * 60);
    const minSeconds =
      call.minSeconds ??
      (call.minMinutes === null ? null : Math.round(call.minMinutes * 60));
    const maxSeconds =
      call.maxSeconds ??
      (call.maxMinutes === null ? null : Math.round(call.maxMinutes * 60));
    const minOk =
      minSeconds === null ||
      (call.minInclusive ? seconds >= minSeconds : seconds > minSeconds);
    const maxOk =
      maxSeconds === null ||
      (call.maxInclusive ? seconds <= maxSeconds : seconds < maxSeconds);
    states.push(
      evaluate(
        Number.isFinite(seconds) && maxSeconds !== null,
        minOk && maxOk,
        sourceConfirms(call, ["minMinutes", "maxMinutes", "duration"]),
      ),
    );
  }
  if (filters.completionYear) {
    const year = Number(filters.completionYear);
    states.push(
      evaluate(
        Number.isInteger(year) &&
          call.minYear !== null &&
          call.maxYear !== null,
        call.minYear !== null &&
          call.maxYear !== null &&
          year >= call.minYear &&
          year <= call.maxYear,
        sourceConfirms(call, ["minYear", "maxYear", "productionYear"]),
      ),
    );
  }
  if (filters.pf)
    states.push(
      evaluate(
        call.pf !== "não confirmado",
        call.pf === filters.pf,
        sourceConfirms(call, ["pf", "eligibleEntrants"]),
      ),
    );
  if (filters.participation)
    states.push(
      evaluate(
        call.participationConditions.length > 0,
        call.participationConditions.includes(filters.participation as never),
        sourceConfirms(call, ["participationConditions"]),
      ),
    );
  if (filters.fee || filters.feeCeiling) {
    const fees = currentFees(call, now, timezone);
    const known = fees.some(
      (fee) => fee.free !== "não confirmado" || fee.amount !== null,
    );
    let matches = true;
    if (filters.fee === "free")
      matches = fees.some((fee) => fee.free === "sim" && fee.amount === 0);
    else if (filters.fee === "paid")
      matches = fees.some((fee) => fee.amount !== null && fee.amount > 0);
    else if (filters.fee === "waiver")
      matches = fees.some((fee) => Boolean(fee.waiver));
    else if (filters.fee === "unknown") matches = !known;
    if (filters.feeCeiling) {
      const ceiling = Number(filters.feeCeiling);
      const brl = fees.filter(
        (fee) => fee.currency === "BRL" && fee.amount !== null,
      );
      states.push(
        evaluate(
          brl.length > 0,
          matches && brl.some((fee) => (fee.amount as number) <= ceiling),
          sourceConfirms(call, ["fees"]),
        ),
      );
    } else if (filters.fee === "unknown")
      states.push(matches ? "confirmed" : "no");
    else states.push(evaluate(known, matches, sourceConfirms(call, ["fees"])));
  }
  if (filters.premiere) {
    let matches = call.premiere === filters.premiere;
    if (filters.premiere === "none")
      matches = call.premiereRequirement === "sem exigência confirmada";
    if (filters.premiere === "no-world")
      matches =
        call.premiereRequirement === "sem exigência confirmada" ||
        call.premiereRequirement === "preferencial" ||
        call.premiere !== "mundial";
    states.push(
      evaluate(
        call.premiereRequirement !== "desconhecida",
        matches,
        sourceConfirms(call, ["premiere"]),
      ),
    );
  }
  if (filters.onlineRule)
    states.push(
      evaluate(
        call.online !== "não confirmado",
        call.online === filters.onlineRule,
        sourceConfirms(call, ["online"]),
      ),
    );
  if (filters.deadline || filters.closingFrom || filters.closingTo) {
    const verified = call.deadlines.filter(
      (deadline) =>
        deadline.confirmed &&
        (sourceConfirms(call, ["deadlines"]) ||
          call.sources.some(
            (source) =>
              source.id === deadline.sourceId &&
              source.evidenceState === "confirmado na edição atual",
          )),
    );
    const verifiedCall = { ...call, deadlines: verified };
    const status = deadlineStatus(verifiedCall, now, timezone);
    const next = nextDeadline(verifiedCall, now, timezone);
    let matches = true;
    if (filters.deadline === "open") matches = status.open;
    else if (filters.deadline === "closed")
      matches = status.label === "Encerrado";
    else if (/^\d+$/.test(filters.deadline)) {
      const days = next
        ? daysBetween(todayISO(next.timezone || timezone, now), next.date)
        : -1;
      matches = days >= 0 && days <= Number(filters.deadline);
    }
    const closings = verified.filter((deadline) => deadline.kind !== "opening");
    if (filters.closingFrom)
      matches =
        matches &&
        closings.some((deadline) => deadline.date >= filters.closingFrom);
    if (filters.closingTo)
      matches =
        matches &&
        closings.some((deadline) => deadline.date <= filters.closingTo);
    states.push(evaluate(verified.length > 0, matches, true));
  }
  if (filters.filmId && filters.compatibility && db) {
    const film = db.films.find((item) => item.id === filters.filmId);
    if (!film) states.push("pending");
    else {
      const status = eligibility(film, call).status;
      const state: MatchState = [
        "compatível pelas regras verificadas",
        "provavelmente compatível",
      ].includes(status)
        ? "confirmed"
        : ["incompatível", "possível conflito"].includes(status)
          ? "no"
          : "pending";
      states.push(
        filters.compatibility === "compatible"
          ? state
          : filters.compatibility === "pending"
            ? state === "pending"
              ? "confirmed"
              : "no"
            : state === "no"
              ? "confirmed"
              : "no",
      );
    }
  }
  return states.length ? combine(states) : "confirmed";
}

export function matchCall(
  call: Call,
  filters: FestivalFilters,
  now: Date,
  timezone: string,
) {
  return matchCallState(call, filters, now, timezone) === "confirmed";
}

function personalPriority(
  db: Database,
  festival: Festival,
  filters: FestivalFilters,
): Priority {
  if (!filters.filmId) return festival.basePriority;
  const order: Priority[] = [
    "alta",
    "média",
    "baixa",
    "fora do plano",
    "sem prioridade",
  ];
  return (
    db.submissions
      .filter(
        (submission) =>
          submission.filmId === filters.filmId &&
          submission.festivalId === festival.id,
      )
      .map((submission) => submission.personalPriority)
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ||
    "sem prioridade"
  );
}

function festivalFieldsMatch(
  db: Database,
  festival: Festival,
  filters: FestivalFilters,
  now: Date,
) {
  const locations = festival.locations.length
    ? festival.locations
    : [
        {
          countryCode: festival.country === "Brasil" ? "BR" : "",
          countryName: festival.country,
          subdivisionCode: festival.region,
          subdivisionName: festival.region,
          city: festival.city,
        },
      ];
  const isBrazil = (location: (typeof locations)[number]) =>
    location.countryCode === "BR" || norm(location.countryName) === "brasil";
  if (filters.locationScope === "brasil" && !locations.some(isBrazil))
    return false;
  if (
    filters.locationScope === "exterior" &&
    !locations.some(
      (location) =>
        Boolean(location.countryCode || location.countryName) &&
        !isBrazil(location),
    )
  )
    return false;
  if (
    filters.country &&
    !locations.some(
      (location) =>
        location.countryCode === filters.country ||
        location.countryName === filters.country,
    )
  )
    return false;
  if (
    filters.region &&
    !locations.some(
      (location) =>
        location.subdivisionCode === filters.region ||
        location.subdivisionName === filters.region,
    )
  )
    return false;
  if (
    filters.brazilRegion &&
    !locations.some(
      (location) =>
        location.countryCode === "BR" &&
        brazilRegion(location.subdivisionCode) === filters.brazilRegion,
    )
  )
    return false;
  if (
    filters.city &&
    !locations.some((location) => norm(location.city) === norm(filters.city))
  )
    return false;
  if (filters.modality === "itinerante" && !festival.traveling) return false;
  if (filters.modality === "online" && !festival.onlineOnly) return false;
  if (filters.modality === "presencial" && festival.onlineOnly) return false;
  if (
    filters.openingMonth &&
    !festival.seasonality.opening.months.includes(Number(filters.openingMonth))
  )
    return false;
  if (
    filters.eventMonth &&
    !festival.seasonality.event.months.includes(Number(filters.eventMonth))
  )
    return false;
  if (
    filters.relevanceBand &&
    festival.relevance.band !== filters.relevanceBand
  )
    return false;
  if (filters.impact && festival.relevance.impact !== filters.impact)
    return false;
  if (
    filters.relevanceConfidence &&
    festival.relevance.confidence !== filters.relevanceConfidence
  )
    return false;
  if (
    filters.relevanceMin &&
    (festival.relevance.score === null ||
      festival.relevance.score < Number(filters.relevanceMin))
  )
    return false;
  if (
    filters.priority &&
    personalPriority(db, festival, filters) !== filters.priority
  )
    return false;
  if (filters.activity && festival.activity !== filters.activity) return false;
  if (filters.favorite && !festival.favorite) return false;
  if (filters.needsUpdate && !needsUpdate(festival, db.settings.staleDays, now))
    return false;
  return true;
}

export interface FestivalMatch {
  festival: Festival;
  confirmedCalls: Call[];
  pendingCalls: Call[];
}

export function filterFestivalMatches(
  db: Database,
  filters: FestivalFilters,
  now = new Date(),
  index = indexes(db),
): FestivalMatch[] {
  const query = norm(filters.query);
  const hasCallFilters = Boolean(
    filters.format ||
    filters.language ||
    filters.genre ||
    filters.minutes ||
    filters.completionYear ||
    filters.pf ||
    filters.participation ||
    filters.fee ||
    filters.feeCeiling ||
    filters.premiere ||
    filters.onlineRule ||
    filters.deadline ||
    filters.closingFrom ||
    filters.closingTo ||
    filters.compatibility,
  );
  const result: FestivalMatch[] = [];
  for (const festival of db.festivals) {
    const calls = latestCalls(festival.id, db, index);
    if (query) {
      const searchable = norm(
        [
          festival.name,
          festival.internationalName,
          festival.acronym,
          ...festival.aliases,
          ...festival.locations.flatMap((location) => [
            location.countryName,
            location.subdivisionName,
            location.subdivisionCode,
            location.city,
            location.district,
          ]),
          ...festival.tags,
          ...festival.languages,
          ...festival.contentGenres,
          ...festival.themes,
          festival.description,
          festival.personalNotes,
          ...calls.map((call) => `${call.name} ${call.notes}`),
        ].join(" "),
      );
      if (!searchable.includes(query)) continue;
    }
    if (!festivalFieldsMatch(db, festival, filters, now)) continue;
    const confirmedCalls: Call[] = [];
    const pendingCalls: Call[] = [];
    for (const call of calls) {
      const state = hasCallFilters
        ? matchCallState(call, filters, now, db.settings.timezone, db)
        : "confirmed";
      if (state === "confirmed") confirmedCalls.push(call);
      if (state === "pending") pendingCalls.push(call);
    }
    if (
      hasCallFilters &&
      !confirmedCalls.length &&
      !(filters.dataQuality === "include-pending" && pendingCalls.length)
    )
      continue;
    result.push({ festival, confirmedCalls, pendingCalls });
  }
  return result;
}

export function filterFestivals(
  db: Database,
  filters: FestivalFilters,
  now = new Date(),
  index = indexes(db),
) {
  return filterFestivalMatches(db, filters, now, index).map(
    (match) => match.festival,
  );
}
