import { useState } from "react";
import { useStore } from "../store";
import { type Entity, type Table } from "../types";
import { blankCall, blankEdition, blankSubmission } from "../utils/defaults";
import { duplicateEdition } from "../utils/duplicate";
import { eligibility } from "../utils/eligibility";
import { deadlineStatus, displayDate } from "../utils/deadlines";
import { displayLocations } from "../utils/normalization";
import {
  Badge,
  Empty,
  ExternalLink,
  Heading,
  SourceList,
  Tags,
} from "../components/Shared";
import { EntityForm } from "../components/EntityForm";
export function FestivalDetail({ id }: { id: string }) {
  const { db, change, setNotice } = useStore();
  const f = db.festivals.find((f) => f.id === id);
  const [edit, setEdit] = useState<{ table: Table; entity: Entity } | null>(
    null,
  );
  const [filmId, setFilmId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  if (!f)
    return (
      <Empty
        title="Festival não encontrado."
        action={<a href="#/festivais">Voltar ao acervo</a>}
      />
    );
  const editions = db.editions
    .filter((e) => e.festivalId === id)
    .sort((a, b) => b.year - a.year);
  const edition = editions.find((e) => e.id === selectedYear) || editions[0];
  const calls = db.calls.filter((c) => c.editionId === edition?.id);
  const film = db.films.find((f) => f.id === filmId);
  async function duplicate() {
    if (!edition) return;
    if (!Number.isInteger(newYear) || newYear < 1900 || newYear > 2200) {
      setNotice("Informe um ano válido.");
      return;
    }
    const next = duplicateEdition(edition, db.calls, newYear);
    await change((d) => {
      d.editions.push(next.edition);
      d.calls.push(...next.calls);
    });
    setSelectedYear(next.edition.id);
    setNotice(
      "Edição duplicada. Datas foram limpas; regras estão marcadas como não verificadas.",
    );
  }
  return (
    <>
      <a className="back-link" href="#/festivais">
        ← Todos os festivais
      </a>
      <Heading
        title={f.name}
        eyebrow={displayLocations(f).toUpperCase()}
        description={[
          f.frequency,
          f.traveling ? "itinerante" : "",
          f.onlineOnly ? "somente online" : "",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <button
              className="favorite large"
              aria-label="Alternar favorito"
              aria-pressed={f.favorite}
              onClick={() =>
                change((d) => {
                  d.festivals.find((x) => x.id === id)!.favorite = !f.favorite;
                })
              }
            >
              {f.favorite ? "★" : "☆"}
            </button>
            <button onClick={() => setEdit({ table: "festivals", entity: f })}>
              Editar festival
            </button>
          </>
        }
      />
      <div className="detail-top">
        <Tags
          tags={[
            ...f.workTypes,
            ...f.languages,
            ...f.approaches,
            ...f.contentGenres,
          ]}
        />
        <Badge tone={f.activity === "ativo" ? "positive" : "unknown"}>
          {f.activity}
        </Badge>
        <Badge tone={f.basePriority === "alta" ? "priority" : "muted"}>
          prioridade-base: {f.basePriority}
        </Badge>
        <Badge
          tone={f.relevance.status === "avaliada" ? "positive" : "unknown"}
        >
          relevância: {f.relevance.score ?? "pendente"}
        </Badge>
        <ExternalLink url={f.website}>Site oficial</ExternalLink>
        {f.instagram && (
          <ExternalLink url={f.instagram}>Instagram</ExternalLink>
        )}
      </div>
      <div className="detail-grid">
        <main className="detail-main">
          <section className="panel">
            <header className="section-heading">
              <div>
                <p className="eyebrow">HISTÓRICO / EDIÇÕES</p>
                <h2>Regras por edição.</h2>
              </div>
              <button
                onClick={() =>
                  setEdit({ table: "editions", entity: blankEdition(id) })
                }
              >
                + Nova edição
              </button>
            </header>
            <div className="edition-toolbar">
              <label className="sr-only" htmlFor="edition-select">
                Edição
              </label>
              <select
                id="edition-select"
                value={edition?.id || ""}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {editions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.year} {e.number ? ` / ${e.number}ª edição` : ""}
                  </option>
                ))}
                {!editions.length && <option>Sem edições</option>}
              </select>
              {edition && (
                <button
                  onClick={() =>
                    setEdit({ table: "editions", entity: edition })
                  }
                >
                  Editar edição
                </button>
              )}
            </div>
            {edition ? (
              <>
                <div className="edition-facts">
                  <div>
                    <span>Festival</span>
                    <strong>
                      {displayDate(edition.start)}
                      {edition.end ? ` → ${displayDate(edition.end)}` : ""}
                    </strong>
                  </div>
                  <div>
                    <span>Resultado</span>
                    <strong>{displayDate(edition.resultDate)}</strong>
                  </div>
                  <div>
                    <span>Verificação</span>
                    <Badge
                      tone={
                        edition.confidence === "confirmado"
                          ? "positive"
                          : "unknown"
                      }
                    >
                      {edition.confidence}
                    </Badge>
                  </div>
                </div>
                {edition.notes && (
                  <p className="preserve-whitespace">{edition.notes}</p>
                )}
                {edition.rulesUrl && (
                  <ExternalLink url={edition.rulesUrl}>
                    Regulamento da edição
                  </ExternalLink>
                )}
                <div className="duplicate-bar">
                  <label>
                    Ano da nova edição
                    <input
                      aria-label="Ano da nova edição"
                      type="number"
                      min="1900"
                      max="2200"
                      value={newYear}
                      onChange={(e) => setNewYear(Number(e.target.value))}
                    />
                  </label>
                  <button onClick={duplicate}>Duplicar edição anterior</button>
                  <span className="small muted">
                    Copia regras para revisão e preserva o histórico.
                  </span>
                </div>
              </>
            ) : (
              <p className="muted">
                Cadastre a primeira edição para organizar chamadas e inscrições.
              </p>
            )}
          </section>
          <section className="panel">
            <header className="section-heading">
              <div>
                <p className="eyebrow">SELEÇÃO / CATEGORIAS</p>
                <h2>Chamadas{edition ? ` · ${edition.year}` : ""}</h2>
              </div>
              {edition && (
                <button
                  onClick={() =>
                    setEdit({ table: "calls", entity: blankCall(edition.id) })
                  }
                >
                  + Nova chamada
                </button>
              )}
            </header>
            {db.films.length > 0 && (
              <label className="film-comparison">
                Comparar regras com seu filme
                <select
                  value={filmId}
                  onChange={(e) => setFilmId(e.target.value)}
                >
                  <option value="">Escolha um filme</option>
                  {db.films.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!calls.length && (
              <p className="muted">
                Nenhuma chamada cadastrada. Categorias diferentes devem ter
                regras próprias.
              </p>
            )}
            {calls.map((c) => {
              const ds = deadlineStatus(c, new Date(), db.settings.timezone);
              const result = film ? eligibility(film, c) : null;
              return (
                <article className="call-block" key={c.id}>
                  <div className="call-heading">
                    <div>
                      <h3>{c.name}</h3>
                      <span className="small muted">
                        {c.formats.join(" / ") || "Formatos não confirmados"}
                      </span>
                    </div>
                    <button
                      onClick={() => setEdit({ table: "calls", entity: c })}
                    >
                      Editar chamada
                    </button>
                  </div>
                  <div className="detail-top">
                    <Badge tone={ds.tone}>{ds.label}</Badge>
                    <Badge
                      tone={
                        c.confidence === "confirmado" ? "positive" : "unknown"
                      }
                    >
                      {c.confidence}
                    </Badge>
                  </div>
                  <Tags
                    tags={[
                      ...c.workTypes,
                      ...c.languages,
                      ...c.approaches,
                      ...c.contentGenres,
                      ...c.themes,
                    ]}
                  />
                  <dl className="rules-grid">
                    <div>
                      <dt>Duração</dt>
                      <dd>
                        {c.minSeconds === null
                          ? "mínimo não confirmado"
                          : `${Math.floor(c.minSeconds / 60)}min${c.minSeconds % 60 ? `${String(c.minSeconds % 60).padStart(2, "0")}s` : ""}`}
                        {" – "}
                        {c.maxSeconds === null
                          ? "máximo não confirmado"
                          : `${Math.floor(c.maxSeconds / 60)}min${c.maxSeconds % 60 ? `${String(c.maxSeconds % 60).padStart(2, "0")}s` : ""}`}
                        {c.maxSeconds !== null && !c.maxInclusive
                          ? " (máximo exclusivo)"
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Ano de produção</dt>
                      <dd>
                        {c.minYear ?? "?"}–{c.maxYear ?? "?"}
                      </dd>
                    </div>
                    <div>
                      <dt>Pessoa física</dt>
                      <dd>{c.pf}</dd>
                    </div>
                    <div>
                      <dt>Pessoa jurídica</dt>
                      <dd>{c.pj}</dd>
                    </div>
                    <div>
                      <dt>Estreia</dt>
                      <dd>
                        {c.premiereRequirement} · {c.premiere}
                        {c.premiereTerritory ? ` · ${c.premiereTerritory}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Online anterior</dt>
                      <dd>{c.online}</dd>
                    </div>
                    <div>
                      <dt>Território</dt>
                      <dd>
                        {[...c.countries, ...c.regions].join(", ") ||
                          (c.territoriesConfirmed
                            ? "Sem restrição"
                            : "Não confirmado")}
                      </dd>
                    </div>
                    <div>
                      <dt>Reinscrição</dt>
                      <dd>{c.resubmission}</dd>
                    </div>
                  </dl>
                  {c.deadlines.length > 0 && (
                    <div className="call-dates">
                      {c.deadlines.map((d, i) => (
                        <span key={i}>
                          {d.kind}: <strong>{displayDate(d.date)}</strong>
                          {d.time ? ` ${d.time}` : ""}{" "}
                          <small>
                            ({d.timezone})
                            {!d.confirmed ? " · não confirmado" : ""}
                          </small>
                        </span>
                      ))}
                    </div>
                  )}
                  {c.fees.length > 0 ? (
                    <p>
                      Taxas:{" "}
                      {c.fees.map((fee, i) => (
                        <span key={i}>
                          {i ? " / " : ""}
                          {fee.free === "sim"
                            ? "Gratuito"
                            : fee.amount === null
                              ? "Valor não confirmado"
                              : `${fee.currency} ${fee.amount}`}{" "}
                          {fee.deadlineKind}
                          {fee.discount ? ` · ${fee.discount}` : ""}
                          {fee.waiver ? ` · waiver: ${fee.waiver}` : ""}
                          {fee.notes ? ` · ${fee.notes}` : ""}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="muted">Taxa não confirmada.</p>
                  )}
                  {c.restrictions && (
                    <p className="preserve-whitespace">{c.restrictions}</p>
                  )}
                  {c.notes && (
                    <p className="small preserve-whitespace">{c.notes}</p>
                  )}
                  <div className="detail-top">
                    <ExternalLink url={c.rulesUrl}>Regulamento</ExternalLink>
                    {c.platform && (
                      <ExternalLink url={c.platform}>Inscrição</ExternalLink>
                    )}
                    {film && (
                      <button
                        onClick={() =>
                          setEdit({
                            table: "submissions",
                            entity: {
                              ...blankSubmission(),
                              filmId: film.id,
                              festivalId: id,
                              editionId: edition.id,
                              callId: c.id,
                              platform: c.platform,
                            },
                          })
                        }
                      >
                        Planejar inscrição
                      </button>
                    )}
                  </div>
                  {result && (
                    <details className="eligibility-box" open>
                      <summary>
                        <Badge
                          tone={
                            result.status ===
                            "compatível pelas regras verificadas"
                              ? "positive"
                              : result.status === "incompatível"
                                ? "warning"
                                : "unknown"
                          }
                        >
                          {result.status}
                        </Badge>{" "}
                        · {film!.title}
                      </summary>
                      <ul>
                        {result.rules.map((r) => (
                          <li key={r.rule}>
                            <span aria-label={r.state}>
                              {r.state === "ok"
                                ? "✓"
                                : r.state === "conflict"
                                  ? "!"
                                  : "?"}
                            </span>
                            <div>
                              <strong>{r.rule}</strong>
                              <p>{r.detail}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="small muted">
                        Comparação assistida. A decisão de elegibilidade
                        pertence à organização do festival.
                      </p>
                    </details>
                  )}
                  <details>
                    <summary>Fontes da chamada</summary>
                    <SourceList sources={c.sources} />
                  </details>
                  {c.legacy && (
                    <details className="legacy">
                      <summary>Texto original do backup</summary>
                      <pre>{JSON.stringify(c.legacy, null, 2)}</pre>
                    </details>
                  )}
                </article>
              );
            })}
          </section>
        </main>
        <aside className="detail-aside">
          <section className="panel">
            <p className="eyebrow">IDENTIDADE</p>
            <h3>Sobre o festival</h3>
            <p>{f.description || "Descrição não cadastrada."}</p>
            {f.aliases.length > 0 && (
              <p className="small">
                <strong>Outros nomes:</strong> {f.aliases.join(" · ")}
              </p>
            )}
            {f.organizer && (
              <p>
                <strong>Organização:</strong> {f.organizer}
              </p>
            )}
            {f.contact && (
              <p>
                <strong>Contato:</strong> {f.contact}
              </p>
            )}
            <Tags tags={f.tags} />
            <h3>Localidades</h3>
            {f.locations.length ? (
              <ul>
                {f.locations.map((location) => (
                  <li key={location.id}>
                    {[
                      location.city,
                      location.subdivisionCode || location.subdivisionName,
                      location.countryName,
                    ]
                      .filter(Boolean)
                      .join(", ")}{" "}
                    · {location.role} ·{" "}
                    {location.confirmed ? "confirmada" : "pendente"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Localidade ainda não estruturada.</p>
            )}
          </section>
          <section className="panel">
            <p className="eyebrow">RELEVÂNCIA / EVIDÊNCIA</p>
            <h3>
              {f.relevance.score === null
                ? "Avaliação pendente"
                : `${f.relevance.score}/100 · ${f.relevance.band}`}
            </h3>
            <p>
              {f.relevance.rationale ||
                "Ainda não há justificativa documentada para a relevância."}
            </p>
            <p className="small muted">
              Impacto: {f.relevance.impact} · confiança:{" "}
              {f.relevance.confidence}
              {f.relevance.assessedAt
                ? ` · avaliada em ${displayDate(f.relevance.assessedAt)}`
                : ""}
            </p>
            {f.relevance.status !== "pendente" && (
              <dl className="rules-grid">
                {Object.entries(f.relevance.dimensions).map(
                  ([key, dimension]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {dimension.score ?? "?"} ·{" "}
                        {dimension.evidence || "sem evidência descrita"}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            )}
            <p className="small muted">
              A relevância pública não altera sua prioridade pessoal para cada
              filme.
            </p>
          </section>
          <section className="panel">
            <p className="eyebrow">PESSOAL / PRIVADO</p>
            <h3>Suas notas</h3>
            <p className="preserve-whitespace">
              {f.personalNotes ||
                "Nenhuma nota. Use “Editar festival” para registrar sua estratégia."}
            </p>
          </section>
          <section className="panel">
            <p className="eyebrow">REFERÊNCIAS</p>
            <h3>Fontes de identidade</h3>
            <SourceList sources={f.sources} />
          </section>
          {edition && (
            <section className="panel">
              <h3>Fontes da edição</h3>
              <SourceList sources={edition.sources} />
            </section>
          )}
          {f.legacy && (
            <details className="legacy panel">
              <summary>Informações legadas do festival</summary>
              <pre>{JSON.stringify(f.legacy, null, 2)}</pre>
            </details>
          )}
        </aside>
      </div>
      {edit && (
        <EntityForm
          key={edit.entity.id}
          {...edit}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
