import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  FORMATS,
  LANGUAGES,
  PARTICIPATION_CONDITIONS,
  PREMIERES,
  type Call,
  type Festival,
  type Priority,
} from "../types";
import { useStore } from "../store";
import {
  emptyFilters,
  filterFestivalMatches,
  indexes,
  latestCalls,
  type FestivalFilters,
  type FestivalMatch,
} from "../utils/search";
import { blankFestival } from "../utils/defaults";
import {
  currentFees,
  deadlineStatus,
  displayDate,
  effectiveDeadline,
  nextDeadline,
} from "../utils/deadlines";
import { eligibility } from "../utils/eligibility";
import { csvText, downloadText } from "../utils/backup";
import { brazilRegion, displayLocations } from "../utils/normalization";
import { Badge, Empty, Heading, Tags } from "../components/Shared";
import { EntityForm } from "../components/EntityForm";

const STATE_KEY = "circuito-festival-list-state-v4";
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DEFAULT_COLUMNS = [
  "favorite",
  "festival",
  "compatibleCall",
  "submissions",
  "deadline",
  "fee",
  "relevance",
  "priority",
];
const COLUMN_LABELS: Record<string, string> = {
  favorite: "Favorito",
  festival: "Festival e local",
  compatibleCall: "Categoria compatível",
  submissions: "Inscrições",
  deadline: "Próximo prazo",
  fee: "Taxa aplicável",
  relevance: "Relevância",
  priority: "Minha prioridade",
  compatibility: "Compatibilidade",
  submissionStatus: "Situação da inscrição",
  duration: "Limite de duração",
  entrants: "Pessoa autorizada",
  premiere: "Estreia exigida",
  opening: "Abertura provável",
  event: "Realização",
  verification: "Última verificação",
};

function initialState() {
  let saved: Partial<{
    filters: FestivalFilters;
    page: number;
    sort: string;
    expanded: boolean;
    scrollY: number;
  }> = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "{}");
  } catch {
    saved = {};
  }
  const query =
    new URLSearchParams(location.hash.split("?")[1] || "").get("q") ||
    saved.filters?.query ||
    "";
  return {
    filters: {
      ...emptyFilters,
      dataQuality: "include-pending" as const,
      ...(saved.filters || {}),
      query,
    },
    page: Math.max(1, saved.page || 1),
    sort: saved.sort || "name",
    expanded: saved.expanded || false,
    scrollY: saved.scrollY || 0,
  };
}

export function Festivals() {
  const { db, change, setNotice } = useStore();
  const restored = useRef(initialState()).current;
  const [filters, setFilters] = useState<FestivalFilters>(restored.filters);
  const [expanded, setExpanded] = useState(restored.expanded);
  const [page, setPage] = useState(restored.page);
  const [sort, setSort] = useState(restored.sort);
  const [edit, setEdit] = useState<ReturnType<typeof blankFestival> | null>(
    null,
  );
  const [now, setNow] = useState(() => new Date());
  const [locationNotice, setLocationNotice] = useState("");
  const [viewName, setViewName] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    setTimeout(() => window.scrollTo(0, restored.scrollY), 0);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const save = () =>
      sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          filters,
          page,
          sort,
          expanded,
          scrollY: window.scrollY,
        }),
      );
    save();
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [filters, page, sort, expanded]);

  const idx = useMemo(() => indexes(db), [db]);
  const matches = useMemo(
    () => filterFestivalMatches(db, filters, now, idx),
    [db, filters, now, idx],
  );
  const sorted = useMemo(
    () =>
      [...matches].sort((left, right) => {
        const a = left.festival;
        const b = right.festival;
        if (sort === "deadline")
          return (
            (nextCall(left)?.date || "9999").localeCompare(
              nextCall(right)?.date || "9999",
            ) || a.name.localeCompare(b.name, "pt-BR")
          );
        if (sort === "relevance")
          return (
            (b.relevance.score ?? -1) - (a.relevance.score ?? -1) ||
            a.name.localeCompare(b.name, "pt-BR")
          );
        if (sort === "priority") {
          const order: Record<Priority, number> = {
            alta: 0,
            média: 1,
            baixa: 2,
            "fora do plano": 3,
            "sem prioridade": 4,
          };
          return (
            order[priorityFor(a)] - order[priorityFor(b)] ||
            a.name.localeCompare(b.name, "pt-BR")
          );
        }
        return a.name.localeCompare(b.name, "pt-BR");
      }),
    [matches, sort, db, now, filters.filmId],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(sorted.length / db.settings.pageSize),
  );
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice(
    (safePage - 1) * db.settings.pageSize,
    safePage * db.settings.pageSize,
  );
  const callCount = matches.reduce(
    (total, match) =>
      total + match.confirmedCalls.length + match.pendingCalls.length,
    0,
  );
  const comparisonPool = useMemo(
    () =>
      filterFestivalMatches(
        db,
        { ...emptyFilters, dataQuality: "include-pending" },
        now,
        idx,
      ),
    [db, idx, now],
  );
  const comparisonMatches = comparisonIds
    .map((id) => comparisonPool.find((match) => match.festival.id === id))
    .filter((match): match is FestivalMatch => Boolean(match));

  function nextCall(match: FestivalMatch) {
    const calls = match.confirmedCalls.length
      ? match.confirmedCalls
      : match.pendingCalls.length
        ? match.pendingCalls
        : latestCalls(match.festival.id, db, idx);
    return calls
      .map((call) => {
        const deadline =
          nextDeadline(call, now, db.settings.timezone) ||
          effectiveDeadline(call);
        return { call, deadline, date: deadline?.date || "" };
      })
      .filter((item) => item.date)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }

  function priorityFor(festival: Festival): Priority {
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
      festival.basePriority
    );
  }
  function exportCSV() {
    const rows = sorted.map((match) => {
      const matchedCalls = match.confirmedCalls.length
        ? match.confirmedCalls
        : match.pendingCalls;
      const next = nextCall(match);
      const fees = matchedCalls.flatMap((call) => currentFees(call, now));
      return [
        match.festival.name,
        displayLocations(match.festival),
        matchedCalls.map((call) => call.name).join(" | "),
        match.confirmedCalls.length,
        match.pendingCalls.length,
        next?.date || "",
        fees
          .map((fee) =>
            fee.free === "sim"
              ? "gratuito"
              : fee.amount === null
                ? "não confirmado"
                : `${fee.currency} ${fee.amount}`,
          )
          .join(" | "),
        match.festival.relevance.score,
        match.festival.relevance.band,
        match.festival.relevance.confidence,
        priorityFor(match.festival),
        match.festival.activity,
        match.festival.website,
      ];
    });
    downloadText(
      `Circuito_festivais_${new Date().toISOString().slice(0, 10)}.csv`,
      csvText([
        [
          "Festival",
          "Local",
          "Chamadas correspondentes",
          "Chamadas confirmadas",
          "Chamadas pendentes",
          "Próximo prazo",
          "Taxas",
          "Nota de relevância",
          "Faixa de relevância",
          "Confiança da relevância",
          "Prioridade",
          "Atividade",
          "Site",
        ],
        ...rows,
      ]),
      "text/csv;charset=utf-8",
    );
  }

  const set = (key: keyof FestivalFilters, value: string | boolean) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  function setScope(value: FestivalFilters["locationScope"]) {
    const removed = [
      filters.country,
      filters.brazilRegion,
      filters.region,
      filters.city,
    ]
      .filter(Boolean)
      .join(" · ");
    setPage(1);
    setFilters((current) => ({
      ...current,
      locationScope: value,
      country: "",
      brazilRegion: "",
      region: "",
      city: "",
    }));
    setLocationNotice(
      removed ? `Filtros geográficos incompatíveis removidos: ${removed}.` : "",
    );
  }
  function clearFilters() {
    setFilters({ ...emptyFilters, dataQuality: "include-pending" });
    setPage(1);
    setLocationNotice("");
  }

  const locationPool = db.festivals.flatMap((festival) => festival.locations);
  const countryOptions = [
    ...new Map(
      locationPool
        .filter(
          (location) =>
            filters.locationScope !== "brasil" || location.countryCode === "BR",
        )
        .filter(
          (location) =>
            filters.locationScope !== "exterior" ||
            location.countryCode !== "BR",
        )
        .map((location) => [
          location.countryCode || location.countryName,
          location.countryName,
        ]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const scopedLocations = locationPool.filter((location) => {
    if (filters.locationScope === "brasil" && location.countryCode !== "BR")
      return false;
    if (filters.locationScope === "exterior" && location.countryCode === "BR")
      return false;
    if (
      filters.country &&
      ![location.countryCode, location.countryName].includes(filters.country)
    )
      return false;
    if (
      filters.brazilRegion &&
      brazilRegion(location.subdivisionCode) !== filters.brazilRegion
    )
      return false;
    if (
      filters.region &&
      ![location.subdivisionCode, location.subdivisionName].includes(
        filters.region,
      )
    )
      return false;
    return true;
  });
  const regionOptions = [
    ...new Map(
      scopedLocations
        .filter(
          (location) => location.subdivisionCode || location.subdivisionName,
        )
        .map((location) => [
          location.subdivisionCode || location.subdivisionName,
          location.countryCode === "BR"
            ? location.subdivisionCode
            : location.subdivisionName,
        ]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const cityOptions = [
    ...new Set(
      scopedLocations.map((location) => location.city).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const film = db.films.find((item) => item.id === filters.filmId);
  const columns = db.settings.festivalColumns.length
    ? db.settings.festivalColumns
    : DEFAULT_COLUMNS;

  function callsFor(match: FestivalMatch) {
    return match.confirmedCalls.length
      ? match.confirmedCalls
      : match.pendingCalls.length
        ? match.pendingCalls
        : latestCalls(match.festival.id, db, idx);
  }
  function feeLabel(calls: Call[]) {
    const feesByCall = calls.map((call) =>
      currentFees(call, now, db.settings.timezone),
    );
    const fees = feesByCall.flat();
    const hasFree = fees.some(
      (fee) => fee.free === "sim" && fee.amount === 0,
    );
    const knownPaid = fees.filter(
      (fee) => fee.amount !== null && fee.amount > 0,
    );
    const hasUnknown = feesByCall.some(
      (group) =>
        !group.length ||
        group.every(
          (fee) => fee.amount === null && fee.free !== "sim",
        ),
    );
    if (hasFree && knownPaid.length) return "Gratuito ou pago por categoria";
    if (hasFree && hasUnknown) return "Gratuito; outras taxas desconhecidas";
    if (hasFree)
      return "Gratuito confirmado";
    const known = knownPaid;
    if (known.length) {
      const currencies = new Set(known.map((fee) => fee.currency));
      if (currencies.size > 1)
        return hasUnknown
          ? "Varia por moeda/categoria; outras desconhecidas"
          : "Varia por moeda/categoria";
      const amounts = known.map((fee) => fee.amount as number);
      const currency = known[0].currency;
      const label = Math.min(...amounts) === Math.max(...amounts)
        ? `${currency} ${Math.min(...amounts).toFixed(2)}`
        : `${currency} ${Math.min(...amounts).toFixed(2)}–${Math.max(...amounts).toFixed(2)}`;
      return hasUnknown ? `${label}; outras taxas desconhecidas` : label;
    }
    return "Taxa desconhecida";
  }
  function compatibilityBadge(festivalId: string, calls: Call[]) {
    if (!film) return null;
    const statuses = calls.map((call) => eligibility(film, call).status);
    const compatible = statuses.some((status) =>
      [
        "compatível pelas regras verificadas",
        "provavelmente compatível",
      ].includes(status),
    );
    const incompatible =
      statuses.length > 0 &&
      statuses.every((status) =>
        ["incompatível", "possível conflito"].includes(status),
      );
    return (
      <Badge
        tone={compatible ? "positive" : incompatible ? "warning" : "unknown"}
      >
        {compatible
          ? "Compatível pelas regras verificadas"
          : incompatible
            ? "Incompatível"
            : "Depende de confirmação"}
      </Badge>
    );
  }
  async function toggleColumn(column: string) {
    await change((data) => {
      const current = data.settings.festivalColumns;
      data.settings.festivalColumns = current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column];
    });
  }
  async function moveColumn(column: string, delta: number) {
    await change((data) => {
      const current = [...data.settings.festivalColumns];
      const from = current.indexOf(column);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return;
      [current[from], current[to]] = [current[to], current[from]];
      data.settings.festivalColumns = current;
    });
  }
  async function saveView() {
    if (!viewName.trim()) {
      setNotice("Dê um nome à vista antes de salvar.");
      return;
    }
    await change((data) => {
      data.settings.savedFestivalViews.push({
        id: crypto.randomUUID(),
        name: viewName.trim(),
        filters: { ...filters },
        sort,
        columns: [...columns],
      });
    });
    setViewName("");
    setNotice("Vista de festivais salva.");
  }
  function toggleComparison(festivalId: string) {
    setComparisonIds((current) => {
      if (current.includes(festivalId))
        return current.filter((id) => id !== festivalId);
      if (current.length >= 4) {
        setNotice("A comparação aceita até quatro festivais por vez.");
        return current;
      }
      return [...current, festivalId];
    });
  }
  const chips = filterChips(filters);

  return (
    <>
      <Heading
        title="Festivais"
        eyebrow="ACERVO / PESQUISA"
        description="Descubra oportunidades sem transformar lacunas em confirmação."
        actions={
          <>
            <button disabled={!sorted.length} onClick={exportCSV}>
              Exportar recorte CSV
            </button>
            <button
              className="primary"
              onClick={() => setEdit(blankFestival())}
            >
              + Novo festival
            </button>
          </>
        }
      />
      <div className="catalog-context">
        <span>
          <strong>{db.festivals.length}</strong> festivais no acervo
        </span>
        <span>{countryOptions.length} países</span>
        <span>Localização do evento define Brasil/exterior</span>
      </div>

      <section
        className="filter-panel primary-filters"
        aria-label="Filtros principais"
      >
        <div
          className="segmented location-scope"
          aria-label="Localização do festival"
        >
          {[
            ["", "Todos"],
            ["brasil", "No Brasil"],
            ["exterior", "Fora do Brasil"],
          ].map(([value, label]) => (
            <button
              key={label}
              aria-pressed={filters.locationScope === value}
              onClick={() =>
                setScope(value as FestivalFilters["locationScope"])
              }
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Buscar festivais"
            placeholder="Nome, sigla, cidade, chamada ou tema…"
            value={filters.query}
            onChange={(event) => set("query", event.target.value)}
          />
        </label>
        <div className="filter-grid">
          <Filter
            label="Filme"
            value={filters.filmId}
            onChange={(value) => set("filmId", value)}
            options={db.films.map((item) => [item.id, item.title])}
          />
          <Filter
            label="Linguagem"
            value={filters.language}
            onChange={(value) => set("language", value)}
            options={LANGUAGES}
          />
          <Filter
            label="Formato"
            value={filters.format}
            onChange={(value) => set("format", value)}
            options={FORMATS.filter((format) =>
              ["curta", "média", "longa"].includes(format),
            )}
          />
          <Filter
            label="Prazo"
            value={filters.deadline}
            onChange={(value) => set("deadline", value)}
            options={[
              ["open", "Aberto agora"],
              ["7", "Encerra em 7 dias"],
              ["30", "Encerra em 30 dias"],
              ["90", "Encerra em 90 dias"],
              ["closed", "Encerrado"],
            ]}
          />
          <Filter
            label="Taxa"
            value={filters.fee}
            onChange={(value) => set("fee", value)}
            options={[
              ["free", "Gratuito confirmado"],
              ["paid", "Pago confirmado"],
              ["waiver", "Isenção possível"],
              ["unknown", "Desconhecida"],
            ]}
          />
          <Filter
            label="Relevância"
            value={filters.relevanceBand}
            onChange={(value) => set("relevanceBand", value)}
            options={[
              "muito alta",
              "alta",
              "intermediária",
              "menor alcance documentado",
              "pendente",
            ]}
          />
          <Filter
            label="Prioridade"
            value={filters.priority}
            onChange={(value) => set("priority", value)}
            options={[
              "alta",
              "média",
              "baixa",
              "fora do plano",
              "sem prioridade",
            ]}
          />
        </div>
        <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ocultar filtros avançados" : "Filtros avançados"}
        </button>
      </section>

      {expanded && (
        <section className="filter-panel" aria-label="Filtros avançados">
          <h2>Localização e modalidade</h2>
          <div className="filter-grid">
            {filters.locationScope !== "brasil" && (
              <Filter
                label="País"
                value={filters.country}
                onChange={(value) => {
                  setFilters((current) => ({
                    ...current,
                    country: value,
                    region: "",
                    city: "",
                  }));
                  setPage(1);
                }}
                options={countryOptions}
              />
            )}
            {(filters.locationScope === "brasil" ||
              filters.country === "BR") && (
              <Filter
                label="Região brasileira"
                value={filters.brazilRegion}
                onChange={(value) => {
                  setFilters((current) => ({
                    ...current,
                    brazilRegion: value,
                    region: "",
                    city: "",
                  }));
                  setPage(1);
                }}
                options={[
                  "Norte",
                  "Nordeste",
                  "Centro-Oeste",
                  "Sudeste",
                  "Sul",
                ]}
              />
            )}
            <Filter
              label={
                filters.locationScope === "brasil" || filters.country === "BR"
                  ? "UF"
                  : "Subdivisão administrativa"
              }
              value={filters.region}
              onChange={(value) => {
                setFilters((current) => ({
                  ...current,
                  region: value,
                  city: "",
                }));
                setPage(1);
              }}
              options={regionOptions}
            />
            <Filter
              label="Cidade"
              value={filters.city}
              onChange={(value) => set("city", value)}
              options={cityOptions}
            />
            <Filter
              label="Modalidade"
              value={filters.modality}
              onChange={(value) => set("modality", value)}
              options={["presencial", "online", "itinerante"]}
            />
          </div>
          {locationNotice && <p role="status">{locationNotice}</p>}

          <h2>Obra, participação e estreia</h2>
          <div className="filter-grid">
            <label>
              Duração precisa (minutos)
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.minutes}
                onChange={(event) => set("minutes", event.target.value)}
                placeholder="Ex.: 20,5"
              />
            </label>
            <label>
              Ano de conclusão
              <input
                type="number"
                min="1900"
                max="2200"
                value={filters.completionYear}
                onChange={(event) => set("completionYear", event.target.value)}
              />
            </label>
            <Filter
              label="Pessoa física"
              value={filters.pf}
              onChange={(value) => set("pf", value)}
              options={["sim", "não", "não confirmado"]}
            />
            <Filter
              label="Condição de participação"
              value={filters.participation}
              onChange={(value) => set("participation", value)}
              options={PARTICIPATION_CONDITIONS}
            />
            <Filter
              label="Estreia"
              value={filters.premiere}
              onChange={(value) => set("premiere", value)}
              options={[
                ...PREMIERES.filter(
                  (premiere) => premiere !== "não confirmado",
                ),
                ["none", "Sem exigência confirmada"],
              ]}
            />
            <Filter
              label="Regra sobre exibição online"
              value={filters.onlineRule}
              onChange={(value) => set("onlineRule", value)}
              options={["permitido", "proibido", "restrito", "não confirmado"]}
            />
            {filters.filmId && (
              <Filter
                label="Compatibilidade"
                value={filters.compatibility}
                onChange={(value) => set("compatibility", value)}
                options={[
                  ["compatible", "Compatível pelas regras verificadas"],
                  ["pending", "Depende de confirmação"],
                  ["incompatible", "Incompatível"],
                ]}
              />
            )}
          </div>

          <h2>Calendário, custo e pesquisa</h2>
          <div className="filter-grid">
            <Filter
              label="Mês provável de abertura"
              value={filters.openingMonth}
              onChange={(value) => set("openingMonth", value)}
              options={MONTHS.map((month, index) => [String(index + 1), month])}
            />
            <Filter
              label="Mês de realização"
              value={filters.eventMonth}
              onChange={(value) => set("eventMonth", value)}
              options={MONTHS.map((month, index) => [String(index + 1), month])}
            />
            <label>
              Encerramento a partir de
              <input
                type="date"
                value={filters.closingFrom}
                onChange={(event) => set("closingFrom", event.target.value)}
              />
            </label>
            <label>
              Encerramento até
              <input
                type="date"
                value={filters.closingTo}
                onChange={(event) => set("closingTo", event.target.value)}
              />
            </label>
            <label>
              Teto em BRL
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.feeCeiling}
                onChange={(event) => set("feeCeiling", event.target.value)}
                placeholder="Só compara taxas em BRL"
              />
            </label>
            <label>
              Nota mínima de relevância
              <input
                type="number"
                min="0"
                max="100"
                value={filters.relevanceMin}
                onChange={(event) => set("relevanceMin", event.target.value)}
              />
            </label>
            <Filter
              label="Impacto"
              value={filters.impact}
              onChange={(value) => set("impact", value)}
              options={[
                "internacional amplo",
                "nacional",
                "especializado",
                "regional/local",
                "comunitário",
                "pendente",
              ]}
            />
            <Filter
              label="Confiança da relevância"
              value={filters.relevanceConfidence}
              onChange={(value) => set("relevanceConfidence", value)}
              options={["alta", "média", "baixa", "pendente"]}
            />
            <Filter
              label="Atividade"
              value={filters.activity}
              onChange={(value) => set("activity", value)}
              options={["ativo", "atividade não confirmada", "inativo"]}
            />
            <Filter
              label="Qualidade dos dados"
              value={filters.dataQuality}
              onChange={(value) =>
                set("dataQuality", value as FestivalFilters["dataQuality"])
              }
              options={[
                ["confirmed-only", "Somente correspondências confirmadas"],
                ["include-pending", "Incluir pendências identificadas"],
              ]}
            />
          </div>
          <div className="filter-bottom">
            <label className="check">
              <input
                type="checkbox"
                checked={filters.favorite}
                onChange={(event) => set("favorite", event.target.checked)}
              />
              Favoritos
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.needsUpdate}
                onChange={(event) => set("needsUpdate", event.target.checked)}
              />
              Atualização necessária
            </label>
          </div>
          <p className="small muted">
            Dentro de cada grupo as opções são alternativas; entre grupos os
            critérios são cumulativos. Duração, taxa, estreia e prazo precisam
            coexistir na mesma chamada da edição consultada.
          </p>
        </section>
      )}

      {chips.length > 0 && (
        <div className="filter-chips" aria-label="Filtros ativos">
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => set(chip.key, chip.clear)}>
              {chip.label} ×
            </button>
          ))}
          <button className="text-button" onClick={clearFilters}>
            Limpar tudo
          </button>
        </div>
      )}

      <section className="toolbar" aria-label="Visualização e vistas salvas">
        <div className="segmented">
          <button
            aria-pressed={db.settings.festivalView === "table"}
            onClick={() =>
              change((data) => {
                data.settings.festivalView = "table";
              })
            }
          >
            Tabela
          </button>
          <button
            aria-pressed={db.settings.festivalView === "cards"}
            onClick={() =>
              change((data) => {
                data.settings.festivalView = "cards";
              })
            }
          >
            Cards
          </button>
        </div>
        <details>
          <summary>Colunas</summary>
          <div className="column-picker">
            {Object.entries(COLUMN_LABELS).map(([column, label]) => (
              <div key={column}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={columns.includes(column)}
                    onChange={() => toggleColumn(column)}
                  />
                  {label}
                </label>
                {columns.includes(column) && (
                  <span>
                    <button
                      aria-label={`Mover ${label} para a esquerda`}
                      onClick={() => moveColumn(column, -1)}
                    >
                      ←
                    </button>
                    <button
                      aria-label={`Mover ${label} para a direita`}
                      onClick={() => moveColumn(column, 1)}
                    >
                      →
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
        <label>
          Nome da vista
          <input
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
          />
        </label>
        <button onClick={saveView}>Salvar vista</button>
        {db.settings.savedFestivalViews.map((view) => (
          <button
            key={view.id}
            onClick={() => {
              setFilters({
                ...emptyFilters,
                ...view.filters,
              } as FestivalFilters);
              setSort(view.sort);
              setPage(1);
              void change((data) => {
                data.settings.festivalColumns = [...view.columns];
              });
            }}
          >
            {view.name}
          </button>
        ))}
      </section>

      <div className="results-bar">
        <span role="status">
          <strong>{sorted.length}</strong>{" "}
          {sorted.length === 1
            ? "festival encontrado"
            : "festivais encontrados"}
          {" · "}
          <strong>{callCount}</strong>{" "}
          {callCount === 1
            ? "chamada correspondente"
            : "chamadas correspondentes"}
        </span>
        <label>
          Ordenar por{" "}
          <select
            aria-label="Ordenação dos festivais"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            <option value="name">Nome</option>
            <option value="deadline">Próximo prazo</option>
            <option value="relevance">Relevância</option>
            <option value="priority">Prioridade</option>
          </select>
        </label>
      </div>

      {comparisonMatches.length > 0 && (
        <section className="panel" aria-label="Comparação de festivais">
          <header className="section-heading">
            <div>
              <p className="eyebrow">COMPARAÇÃO / ATÉ QUATRO</p>
              <h2>Diferenças operacionais</h2>
            </div>
            <button onClick={() => setComparisonIds([])}>
              Limpar comparação
            </button>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Critério</th>
                  {comparisonMatches.map((match) => (
                    <th key={match.festival.id}>
                      <a href={`#/festivais/${match.festival.id}`}>
                        {match.festival.name}
                      </a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Local",
                    (match: FestivalMatch) => displayLocations(match.festival),
                  ],
                  [
                    "Chamadas",
                    (match: FestivalMatch) =>
                      callsFor(match)
                        .map((call) => call.name)
                        .join(" · ") || "Pendente",
                  ],
                  [
                    "Próximo prazo",
                    (match: FestivalMatch) =>
                      nextCall(match)?.date
                        ? displayDate(nextCall(match)!.date)
                        : "Desconhecido",
                  ],
                  ["Taxa", (match: FestivalMatch) => feeLabel(callsFor(match))],
                  [
                    "Relevância",
                    (match: FestivalMatch) =>
                      match.festival.relevance.score === null
                        ? "Pendente"
                        : `${match.festival.relevance.score}/100 · ${match.festival.relevance.band}`,
                  ],
                  [
                    "Prioridade",
                    (match: FestivalMatch) => priorityFor(match.festival),
                  ],
                ].map(([label, value]) => (
                  <tr key={label as string}>
                    <th scope="row">{label as string}</th>
                    {comparisonMatches.map((match) => (
                      <td key={match.festival.id}>
                        {(value as (match: FestivalMatch) => string)(match)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!visible.length ? (
        <Empty
          title="Nenhum festival com esses filtros."
          action={<button onClick={clearFilters}>Limpar filtros</button>}
        >
          Revise os chips ativos ou use “Incluir pendências identificadas”.
          Nenhuma lacuna foi interpretada como elegibilidade confirmada.
        </Empty>
      ) : db.settings.festivalView === "table" ? (
        <FestivalTable
          matches={visible}
          columns={columns}
          db={db}
          filters={filters}
          callsFor={callsFor}
          nextCall={nextCall}
          feeLabel={feeLabel}
          priorityFor={priorityFor}
          compatibilityBadge={compatibilityBadge}
          comparisonIds={comparisonIds}
          toggleComparison={toggleComparison}
          change={change}
          now={now}
        />
      ) : (
        <div className="festival-cards">
          {visible.map((match) => {
            const festival = match.festival;
            const calls = callsFor(match);
            const next = nextCall(match);
            const pendingOnly =
              !match.confirmedCalls.length && match.pendingCalls.length > 0;
            return (
              <article className="festival-card" key={festival.id}>
                <div className="card-top">
                  <span className="eyebrow">{displayLocations(festival)}</span>
                  <Favorite festival={festival} change={change} />
                </div>
                <h2>
                  <a href={`#/festivais/${festival.id}`}>{festival.name}</a>
                </h2>
                <p>
                  {calls.map((call) => call.name).join(" · ") ||
                    "Chamada pendente"}
                </p>
                <Tags tags={festival.languages} />
                <div className="card-bottom">
                  <Badge tone={pendingOnly ? "unknown" : "positive"}>
                    {pendingOnly
                      ? "Depende de confirmação"
                      : "Correspondência confirmada"}
                  </Badge>
                  <span className="small muted">{feeLabel(calls)}</span>
                </div>
                {next && (
                  <span className="small">
                    Próximo prazo: {displayDate(next.date)}
                  </span>
                )}
                {compatibilityBadge(festival.id, calls)}
                <button
                  aria-pressed={comparisonIds.includes(festival.id)}
                  onClick={() => toggleComparison(festival.id)}
                >
                  {comparisonIds.includes(festival.id)
                    ? "Remover da comparação"
                    : "Comparar"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div className="pagination">
        <span className="small muted">
          Página {safePage} de {totalPages} · {db.settings.pageSize} por página
        </span>
        <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
          ← Anterior
        </button>
        <button
          disabled={safePage >= totalPages}
          onClick={() => setPage(safePage + 1)}
        >
          Próxima →
        </button>
      </div>
      {edit && (
        <EntityForm
          table="festivals"
          entity={edit}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}

type Change = ReturnType<typeof useStore>["change"];
function Favorite({
  festival,
  change,
}: {
  festival: Festival;
  change: Change;
}) {
  return (
    <button
      className={`favorite ${festival.favorite ? "is-favorite" : ""}`}
      aria-label={`${festival.favorite ? "Remover dos" : "Adicionar aos"} favoritos: ${festival.name}`}
      aria-pressed={festival.favorite}
      onClick={() =>
        change((data) => {
          const record = data.festivals.find((item) => item.id === festival.id);
          if (record) record.favorite = !record.favorite;
        })
      }
    >
      {festival.favorite ? "★" : "☆"}
    </button>
  );
}

function FestivalTable({
  matches,
  columns,
  db,
  filters,
  callsFor,
  nextCall,
  feeLabel,
  priorityFor,
  compatibilityBadge,
  comparisonIds,
  toggleComparison,
  change,
  now,
}: {
  matches: FestivalMatch[];
  columns: string[];
  db: ReturnType<typeof useStore>["db"];
  filters: FestivalFilters;
  callsFor: (match: FestivalMatch) => Call[];
  nextCall: (
    match: FestivalMatch,
  ) =>
    | {
        call: Call;
        deadline: ReturnType<typeof effectiveDeadline>;
        date: string;
      }
    | undefined;
  feeLabel: (calls: Call[]) => string;
  priorityFor: (festival: Festival) => Priority;
  compatibilityBadge: (festivalId: string, calls: Call[]) => ReactNode;
  comparisonIds: string[];
  toggleComparison: (festivalId: string) => void;
  change: Change;
  now: Date;
}) {
  return (
    <div className="table-scroll">
      <table className="festival-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {COLUMN_LABELS[column] || column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const festival = match.festival;
            const calls = callsFor(match);
            const next = nextCall(match);
            const status = next
              ? deadlineStatus(next.call, now, db.settings.timezone)
              : null;
            const pendingOnly =
              !match.confirmedCalls.length && match.pendingCalls.length > 0;
            const submission = filters.filmId
              ? db.submissions.find(
                  (item) =>
                    item.filmId === filters.filmId &&
                    item.festivalId === festival.id,
                )
              : undefined;
            return (
              <tr key={festival.id}>
                {columns.map((column) => {
                  if (column === "favorite")
                    return (
                      <td key={column}>
                        <Favorite festival={festival} change={change} />
                      </td>
                    );
                  if (column === "festival")
                    return (
                      <th scope="row" key={column}>
                        <a
                          className="festival-name"
                          href={`#/festivais/${festival.id}`}
                        >
                          {festival.name}
                        </a>
                        <span className="location">
                          {displayLocations(festival)}
                        </span>
                        <button
                          className="text-button"
                          aria-pressed={comparisonIds.includes(festival.id)}
                          onClick={() => toggleComparison(festival.id)}
                        >
                          {comparisonIds.includes(festival.id)
                            ? "Remover da comparação"
                            : "Comparar"}
                        </button>
                      </th>
                    );
                  if (column === "compatibleCall")
                    return (
                      <td key={column}>
                        <strong>
                          {calls[0]?.name || "Chamada não confirmada"}
                        </strong>
                        {calls.length > 1 && (
                          <small>
                            {calls.length} chamadas correspondentes; colunas
                            agregadas
                          </small>
                        )}
                        <small>
                          {[
                            ...new Set(calls.flatMap((call) => call.languages)),
                          ].join(", ") || "Linguagem pendente"}
                          {" · "}
                          {[
                            ...new Set(calls.flatMap((call) => call.formats)),
                          ].join(", ") || "formato pendente"}
                        </small>
                        {pendingOnly && (
                          <Badge tone="unknown">Depende de confirmação</Badge>
                        )}
                      </td>
                    );
                  if (column === "submissions")
                    return (
                      <td key={column}>
                        <Badge tone={status?.tone || "unknown"}>
                          {status?.label ||
                            calls[0]?.submissionMode ||
                            "Não confirmada"}
                        </Badge>
                      </td>
                    );
                  if (column === "deadline")
                    return (
                      <td key={column}>
                        {next ? (
                          <>
                            <strong>{displayDate(next.date)}</strong>
                            <small>
                              {next.deadline?.originalLabel ||
                                next.deadline?.kind}
                              {!next.deadline?.confirmed
                                ? " · previsão/histórico"
                                : ""}
                            </small>
                          </>
                        ) : (
                          "Prazo desconhecido"
                        )}
                      </td>
                    );
                  if (column === "fee")
                    return <td key={column}>{feeLabel(calls)}</td>;
                  if (column === "relevance")
                    return (
                      <td key={column}>
                        {festival.relevance.score === null
                          ? "Avaliação pendente"
                          : `${festival.relevance.score}/100 · ${festival.relevance.band}`}
                        <small>{festival.relevance.confidence}</small>
                      </td>
                    );
                  if (column === "priority")
                    return (
                      <td key={column}>
                        <Badge
                          tone={
                            priorityFor(festival) === "alta"
                              ? "priority"
                              : "muted"
                          }
                        >
                          {priorityFor(festival)}
                        </Badge>
                        <small>
                          {filters.filmId ? "para o filme" : "prioridade-base"}
                        </small>
                      </td>
                    );
                  if (column === "compatibility")
                    return (
                      <td key={column}>
                        {compatibilityBadge(festival.id, calls)}
                      </td>
                    );
                  if (column === "submissionStatus")
                    return (
                      <td key={column}>
                        {submission?.planningStatus || "Sem planejamento"}
                      </td>
                    );
                  if (column === "duration")
                    return (
                      <td key={column}>
                        {[...new Set(calls.map(durationLabel))].join(" / ") ||
                          "Desconhecido"}
                      </td>
                    );
                  if (column === "entrants")
                    return (
                      <td key={column}>
                        PF: {calls[0]?.pf || "?"} · PJ: {calls[0]?.pj || "?"}
                      </td>
                    );
                  if (column === "premiere")
                    return (
                      <td key={column}>
                        {calls[0]?.premiere || "Desconhecida"}
                      </td>
                    );
                  if (column === "opening")
                    return (
                      <td key={column}>
                        {festival.seasonality.opening.months
                          .map((month) => MONTHS[month - 1])
                          .join(", ") || "Sem histórico"}
                      </td>
                    );
                  if (column === "event")
                    return (
                      <td key={column}>
                        {festival.seasonality.event.months
                          .map((month) => MONTHS[month - 1])
                          .join(", ") || "Sem histórico"}
                      </td>
                    );
                  if (column === "verification")
                    return (
                      <td key={column}>
                        {festival.sources
                          .map(
                            (source) => source.accessedAt || source.checkedAt,
                          )
                          .filter(Boolean)
                          .sort()
                          .at(-1) || "Nunca"}
                      </td>
                    );
                  return <td key={column}>—</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const durationLabel = (call: Call) => {
  if (call.maxSeconds === null) return "Duração desconhecida";
  const min =
    call.minSeconds === null ? "0:00" : formatDuration(call.minSeconds);
  const max = formatDuration(call.maxSeconds);
  return `${min}–${max}${call.maxInclusive ? " (inclusive)" : " (exclusivo)"}`;
};
const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function filterChips(filters: FestivalFilters) {
  const labels: Partial<Record<keyof FestivalFilters, string>> = {
    query: "Busca",
    locationScope: "Local",
    country: "País",
    brazilRegion: "Região",
    region: "UF/subdivisão",
    city: "Cidade",
    modality: "Modalidade",
    filmId: "Filme",
    compatibility: "Compatibilidade",
    language: "Linguagem",
    format: "Formato",
    minutes: "Duração",
    completionYear: "Conclusão",
    pf: "Pessoa física",
    participation: "Participação",
    fee: "Taxa",
    feeCeiling: "Teto",
    premiere: "Estreia",
    onlineRule: "Online",
    deadline: "Prazo",
    closingFrom: "Encerramento desde",
    closingTo: "Encerramento até",
    openingMonth: "Abertura",
    eventMonth: "Realização",
    relevanceMin: "Relevância mínima",
    relevanceBand: "Faixa de relevância",
    impact: "Impacto",
    relevanceConfidence: "Confiança",
    priority: "Prioridade",
    activity: "Atividade",
    favorite: "Favoritos",
    needsUpdate: "Atualização necessária",
    dataQuality: "Qualidade",
  };
  return (
    Object.entries(filters) as [keyof FestivalFilters, string | boolean][]
  )
    .filter(([key, value]) => {
      if (!value || key === "genre") return false;
      if (key === "dataQuality" && value === "include-pending") return false;
      return Boolean(labels[key]);
    })
    .map(([key, value]) => ({
      key,
      label: `${labels[key]}: ${value === true ? "sim" : value}`,
      clear: typeof value === "boolean" ? false : "",
    }));
}

export function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | readonly [string, string])[];
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos</option>
        {options.map((option) => {
          const [optionValue, title] = Array.isArray(option)
            ? option
            : [option, option];
          return (
            <option key={optionValue} value={optionValue}>
              {title}
            </option>
          );
        })}
      </select>
    </label>
  );
}
