import { useEffect, useMemo, useState } from "react";
import { FORMATS, GENRES, type Call } from "../types";
import { useStore } from "../store";
import {
  emptyFilters,
  filterFestivals,
  indexes,
  latestCalls,
  type FestivalFilters,
} from "../utils/search";
import { blankFestival } from "../utils/defaults";
import {
  deadlineStatus,
  displayDate,
  effectiveDeadline,
  nextDeadline,
  currentFees,
} from "../utils/deadlines";
import { eligibility } from "../utils/eligibility";
import { Badge, Empty, Heading, Tags } from "../components/Shared";
import { EntityForm } from "../components/EntityForm";
export function Festivals() {
  const { db, change } = useStore();
  const [filters, setFilters] = useState<FestivalFilters>({
    ...emptyFilters,
    query:
      new URLSearchParams(location.hash.split("?")[1] || "").get("q") || "",
  });
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("name");
  const [edit, setEdit] = useState<ReturnType<typeof blankFestival> | null>(
    null,
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const idx = useMemo(() => indexes(db), [db]);
  const filtered = useMemo(
    () => filterFestivals(db, filters, now, idx),
    [db, filters, now, idx],
  );
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sort === "deadline") {
          const da = nextCall(a.id)?.date || "9999",
            db = nextCall(b.id)?.date || "9999";
          return da.localeCompare(db) || a.name.localeCompare(b.name);
        }
        if (sort === "priority") {
          const v = { alta: 0, média: 1, baixa: 2, "sem prioridade": 3 };
          return v[a.priority] - v[b.priority] || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name, "pt-BR");
      }),
    [filtered, sort, db, now],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(sorted.length / db.settings.pageSize),
  );
  const visible = sorted.slice(
    (page - 1) * db.settings.pageSize,
    page * db.settings.pageSize,
  );
  useEffect(() => {
    setPage(1);
  }, [filters, sort, db.settings.pageSize]);
  function nextCall(id: string) {
    const calls = latestCalls(id, db, idx);
    const list = calls
      .map((c) => ({
        c,
        deadline:
          nextDeadline(c, now, db.settings.timezone) || effectiveDeadline(c),
        date:
          (nextDeadline(c, now, db.settings.timezone) || effectiveDeadline(c))
            ?.date || "",
      }))
      .filter((x) => x.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    return (
      list.find((x) => deadlineStatus(x.c, now, db.settings.timezone).open) ||
      list.at(-1)
    );
  }
  const set = (key: keyof FestivalFilters, value: string | boolean) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const active = Object.entries(filters).filter(
    ([k, v]) => k !== "query" && v !== "" && v !== false,
  ).length;
  const countryOptions = [
    ...new Set(db.festivals.map((f) => f.country)),
  ].sort();
  const regionOptions = [
    ...new Set(
      db.festivals
        .filter((f) => !filters.country || f.country === filters.country)
        .map((f) => f.region)
        .filter(Boolean),
    ),
  ].sort();
  const film = db.films.find((f) => f.id === filters.filmId);
  function eligibilityBadge(id: string) {
    if (!film) return null;
    const es = latestCalls(id, db, idx).map((c) => eligibility(film, c).status);
    return (
      <Badge
        tone={
          es.includes("provavelmente compatível")
            ? "positive"
            : es.length && es.every((e) => e === "possível conflito")
              ? "warning"
              : "unknown"
        }
      >
        {es.includes("provavelmente compatível")
          ? "Compatibilidade provável"
          : es.length && es.every((e) => e === "possível conflito")
            ? "Possível conflito"
            : "Faltam informações"}
      </Badge>
    );
  }
  const feeLabel = (cs: Call[]) =>
    cs.some((c) =>
      currentFees(c, now, db.settings.timezone).some(
        (f) => f.free === "sim" || f.amount === 0,
      ),
    )
      ? "Gratuito"
      : cs.some((c) =>
            currentFees(c, now, db.settings.timezone).some(
              (f) => f.amount !== null && f.amount > 0,
            ),
          )
        ? "Com taxa"
        : "Não confirmado";
  return (
    <>
      <Heading
        title="Festivais"
        eyebrow="ACERVO / PESQUISA"
        description="Um mapa de possibilidades para os seus filmes."
        actions={
          <button className="primary" onClick={() => setEdit(blankFestival())}>
            + Novo festival
          </button>
        }
      />
      <div className="catalog-context">
        <span>
          <strong>{db.festivals.length}</strong> festivais no seu acervo
        </span>
        <span>{countryOptions.length} países</span>
        <span>Fontes e regras com verificação individual</span>
      </div>
      <section className="toolbar" aria-label="Pesquisa e visualização">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Buscar festivais"
            placeholder="Nome, cidade, perfil ou notas…"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
          />
        </label>
        <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          Filtros {active > 0 && <span className="filter-count">{active}</span>}
        </button>
        <div className="segmented">
          <button
            aria-pressed={db.settings.festivalView === "table"}
            onClick={() =>
              change((d) => {
                d.settings.festivalView = "table";
              })
            }
          >
            Tabela
          </button>
          <button
            aria-pressed={db.settings.festivalView === "cards"}
            onClick={() =>
              change((d) => {
                d.settings.festivalView = "cards";
              })
            }
          >
            Cards
          </button>
        </div>
      </section>
      {expanded && (
        <section className="filter-panel" aria-label="Filtros combináveis">
          <div className="filter-grid">
            <Filter
              label="País"
              value={filters.country}
              onChange={(v) => {
                set("country", v);
                set("region", "");
              }}
              options={countryOptions}
            />
            <Filter
              label="Estado / região"
              value={filters.region}
              onChange={(v) => set("region", v)}
              options={regionOptions}
            />
            <Filter
              label="Perfil / linguagem"
              value={filters.genre}
              onChange={(v) => set("genre", v)}
              options={GENRES}
            />
            <Filter
              label="Formato"
              value={filters.format}
              onChange={(v) => set("format", v)}
              options={FORMATS}
            />
            <label>
              Duração do seu filme (min)
              <input
                type="number"
                min="0"
                step="any"
                value={filters.minutes}
                onChange={(e) => set("minutes", e.target.value)}
                placeholder="Ex.: 14"
              />
            </label>
            <Filter
              label="Pessoa física"
              value={filters.pf}
              onChange={(v) => set("pf", v)}
              options={["sim", "não", "não confirmado"]}
            />
            <Filter
              label="Taxa"
              value={filters.fee}
              onChange={(v) => set("fee", v)}
              options={[
                ["free", "Gratuito"],
                ["paid", "Com taxa"],
                ["unknown", "Não confirmado"],
              ]}
            />
            <Filter
              label="Estreia"
              value={filters.premiere}
              onChange={(v) => set("premiere", v)}
              options={[
                ["none", "Sem exigência"],
                ["no-world", "Sem exigência mundial confirmada"],
              ]}
            />
            <Filter
              label="Prazo"
              value={filters.deadline}
              onChange={(v) => set("deadline", v)}
              options={[
                ["open", "Aberto agora"],
                ["7", "Nos próximos 7 dias"],
                ["30", "Nos próximos 30 dias"],
                ["60", "Nos próximos 60 dias"],
                ["90", "Nos próximos 90 dias"],
                ["closed", "Encerrado"],
              ]}
            />
            <Filter
              label="Prioridade"
              value={filters.priority}
              onChange={(v) => set("priority", v)}
              options={["alta", "média", "baixa", "sem prioridade"]}
            />
            <Filter
              label="Atividade"
              value={filters.activity}
              onChange={(v) => set("activity", v)}
              options={["ativo", "atividade não confirmada", "inativo"]}
            />
            <Filter
              label="Comparar com filme"
              value={filters.filmId}
              onChange={(v) => set("filmId", v)}
              options={db.films.map((f) => [f.id, f.title] as [string, string])}
            />
          </div>
          <div className="filter-bottom">
            <label className="check">
              <input
                type="checkbox"
                checked={filters.favorite}
                onChange={(e) => set("favorite", e.target.checked)}
              />
              Favoritos
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.needsUpdate}
                onChange={(e) => set("needsUpdate", e.target.checked)}
              />
              Precisam de atualização
            </label>
            <button
              className="text-button"
              onClick={() => setFilters({ ...emptyFilters })}
            >
              Limpar filtros
            </button>
          </div>
          <p className="small muted">
            Regras combinadas pertencem à mesma chamada da edição mais recente.
            Campos desconhecidos não contam como “sim”; prazos antigos não
            contam como abertos.
          </p>
        </section>
      )}
      <div className="results-bar">
        <span role="status">
          <strong>{sorted.length}</strong>{" "}
          {sorted.length === 1
            ? "festival encontrado"
            : "festivais encontrados"}
        </span>
        <label>
          Ordenar por{" "}
          <select
            aria-label="Ordenação dos festivais"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Nome</option>
            <option value="deadline">Próximo prazo</option>
            <option value="priority">Prioridade</option>
          </select>
        </label>
      </div>
      {!visible.length ? (
        <Empty
          title="Nenhum festival com esses filtros."
          action={
            <button onClick={() => setFilters({ ...emptyFilters })}>
              Limpar filtros
            </button>
          }
        >
          Amplie os critérios. Regras não confirmadas ficam fora dos filtros
          estritos.
        </Empty>
      ) : db.settings.festivalView === "table" ? (
        <div className="table-scroll">
          <table className="festival-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Favorito</span>
                </th>
                <th scope="col">Festival / local</th>
                <th scope="col">Perfis</th>
                <th scope="col">Duração / PF</th>
                <th scope="col">Taxa</th>
                <th scope="col">Prazo / verificação</th>
                <th scope="col">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => {
                const cs = latestCalls(f.id, db, idx);
                const next = nextCall(f.id);
                const status = next
                  ? deadlineStatus(
                      {
                        ...next.c,
                        deadlines: next.deadline ? [next.deadline] : [],
                      },
                      now,
                      db.settings.timezone,
                    )
                  : null;
                return (
                  <tr key={f.id}>
                    <td>
                      <button
                        className={`favorite ${f.favorite ? "is-favorite" : ""}`}
                        aria-label={`${f.favorite ? "Remover dos" : "Adicionar aos"} favoritos: ${f.name}`}
                        aria-pressed={f.favorite}
                        onClick={() =>
                          change((d) => {
                            d.festivals.find((x) => x.id === f.id)!.favorite =
                              !f.favorite;
                          })
                        }
                      >
                        {f.favorite ? "★" : "☆"}
                      </button>
                    </td>
                    <th scope="row">
                      <a className="festival-name" href={`#/festivais/${f.id}`}>
                        {f.name}
                      </a>
                      <span className="location">
                        {f.city} · {f.region ? f.region + " / " : ""}
                        {f.country}
                      </span>
                    </th>
                    <td>
                      <Tags tags={f.genres} />
                      {eligibilityBadge(f.id)}
                    </td>
                    <td>
                      <span>
                        {cs.length
                          ? Array.from(
                              new Set(
                                cs.map((c) =>
                                  c.maxMinutes === null
                                    ? "Não confirmado"
                                    : `Até ${c.maxMinutes} min`,
                                ),
                              ),
                            ).join(" / ")
                          : "Não confirmado"}
                      </span>
                      <small>
                        PF:{" "}
                        {cs.some((c) => c.pf === "sim")
                          ? "sim"
                          : cs.every((c) => c.pf === "não") && cs.length
                            ? "não"
                            : "não confirmado"}
                      </small>
                    </td>
                    <td>{feeLabel(cs)}</td>
                    <td>
                      {next ? (
                        <>
                          <Badge tone={status!.tone}>{status!.label}</Badge>
                          <small>
                            {displayDate(next.date)} · {next.c.confidence}
                          </small>
                        </>
                      ) : (
                        <Badge tone="unknown">Prazo não confirmado</Badge>
                      )}
                    </td>
                    <td>
                      <Badge
                        tone={f.priority === "alta" ? "priority" : "muted"}
                      >
                        {f.priority}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="festival-cards">
          {visible.map((f) => {
            const next = nextCall(f.id);
            const status = next
              ? deadlineStatus(
                  {
                    ...next.c,
                    deadlines: next.deadline ? [next.deadline] : [],
                  },
                  now,
                  db.settings.timezone,
                )
              : null;
            return (
              <article className="festival-card" key={f.id}>
                <div className="card-top">
                  <span className="eyebrow">
                    {f.country} / {f.region || f.city}
                  </span>
                  <button
                    className="favorite"
                    aria-label={`Favorito: ${f.name}`}
                    aria-pressed={f.favorite}
                    onClick={() =>
                      change((d) => {
                        d.festivals.find((x) => x.id === f.id)!.favorite =
                          !f.favorite;
                      })
                    }
                  >
                    {f.favorite ? "★" : "☆"}
                  </button>
                </div>
                <h2>
                  <a href={`#/festivais/${f.id}`}>{f.name}</a>
                </h2>
                <p className="muted">{f.city}</p>
                <Tags tags={f.genres} />
                <div className="card-bottom">
                  <Badge tone={status?.tone || "unknown"}>
                    {status?.label || "Prazo não confirmado"}
                  </Badge>
                  {next && (
                    <span className="small muted">
                      {displayDate(next.date)}
                    </span>
                  )}
                </div>
                {eligibilityBadge(f.id)}
              </article>
            );
          })}
        </div>
      )}
      <div className="pagination">
        <span className="small muted">
          Página {page} de {totalPages} · {db.settings.pageSize} por página
        </span>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Anterior
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
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
export function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | [string, string])[];
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Todos</option>
        {options.map((o) => {
          const [v, t] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </select>
    </label>
  );
}
