import { useState } from "react";
import { useStore } from "../store";
import { blankFilm } from "../utils/defaults";
import { norm } from "../migrations/legacy";
import {
  Badge,
  Empty,
  ExternalLink,
  Heading,
  Stats,
  Tags,
} from "../components/Shared";
import { EntityForm } from "../components/EntityForm";
import { type Film } from "../types";
const durationLabel = (film: Film) => {
  if (film.durationSeconds !== null) {
    const minutes = Math.floor(film.durationSeconds / 60);
    const seconds = film.durationSeconds % 60;
    return `${minutes}min${seconds ? `${String(seconds).padStart(2, "0")}s` : ""}`;
  }
  return film.minutes === null
    ? "DURAÇÃO NÃO INFORMADA"
    : `${film.minutes} MIN`;
};
export function Films() {
  const { db } = useStore();
  const [edit, setEdit] = useState<Film | null>(null);
  const [query, setQuery] = useState("");
  const films = db.films.filter((f) =>
    norm(
      [
        f.title,
        f.internationalTitle,
        f.director,
        ...f.languages,
        ...f.approaches,
        ...f.contentGenres,
        ...f.themes,
        f.notes,
      ].join(" "),
    ).includes(norm(query)),
  );
  return (
    <>
      <Heading
        title="Filmes"
        eyebrow="OBRAS / FICHAS E MATERIAIS"
        description="Sua filmografia e o caminho de cada obra."
        actions={
          <button className="primary" onClick={() => setEdit(blankFilm())}>
            + Novo filme
          </button>
        }
      />
      <label className="search-field">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label="Buscar filmes"
          placeholder="Buscar título, direção ou notas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {films.length ? (
        <div className="film-list">
          {films.map((f) => {
            const ss = db.submissions.filter((s) => s.filmId === f.id);
            return (
              <article className="film-list-row" key={f.id}>
                <div className="film-monogram" aria-hidden="true">
                  {f.title[0]}
                </div>
                <div>
                  <p className="eyebrow">
                    {f.year ?? "ANO NÃO INFORMADO"} /{" "}
                    {f.format || "FORMATO NÃO INFORMADO"} / {durationLabel(f)}
                  </p>
                  <h2>
                    <a href={`#/filmes/${f.id}`}>{f.title}</a>
                  </h2>
                  <p className="muted">{f.internationalTitle || f.director}</p>
                  <Tags
                    tags={[...f.languages, ...f.approaches, ...f.contentGenres]}
                  />
                </div>
                <div className="film-row-stats">
                  <strong>{ss.length}</strong>
                  <span>registros de circulação</span>
                  <button onClick={() => setEdit(f)}>Editar ficha</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            query
              ? "Nenhum filme encontrado."
              : "Seu primeiro filme começa aqui."
          }
          action={
            <button className="primary" onClick={() => setEdit(blankFilm())}>
              + Cadastrar filme
            </button>
          }
        >
          Cadastre a ficha técnica, os links de materiais e os dados de estreia
          para comparar com as chamadas.
        </Empty>
      )}
      {edit && (
        <EntityForm table="films" entity={edit} onClose={() => setEdit(null)} />
      )}
    </>
  );
}
export function FilmDetail({ id }: { id: string }) {
  const { db } = useStore();
  const f = db.films.find((f) => f.id === id);
  const [edit, setEdit] = useState(false);
  if (!f)
    return (
      <Empty
        title="Filme não encontrado."
        action={<a href="#/filmes">Voltar aos filmes</a>}
      />
    );
  const ss = db.submissions.filter((s) => s.filmId === id);
  return (
    <>
      <a className="back-link" href="#/filmes">
        ← Seus filmes
      </a>
      <Heading
        title={f.title}
        eyebrow={`${f.year ?? "ANO NÃO INFORMADO"} / ${f.format || "FORMATO NÃO INFORMADO"} / ${durationLabel(f)}`}
        description={f.internationalTitle}
        actions={<button onClick={() => setEdit(true)}>Editar ficha</button>}
      />
      <Tags
        tags={[
          ...f.languages,
          ...f.approaches,
          ...f.contentGenres,
          ...f.themes,
        ]}
      />
      <Stats
        items={[
          { label: "Registros de circulação", value: ss.length },
          {
            label: "Seleções",
            value: ss.filter((s) => s.resultStatus === "selecionado").length,
          },
          {
            label: "Recusas",
            value: ss.filter((s) => s.resultStatus === "não selecionado")
              .length,
          },
          {
            label: "Prêmios",
            value: ss.reduce(
              (total, s) => total + s.awards.length + (s.award ? 1 : 0),
              0,
            ),
          },
        ]}
      />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>O filme</h2>
            <p className="preserve-whitespace">
              {f.synopsis || "Sinopse não cadastrada."}
            </p>
            <dl className="rules-grid">
              {[
                ["Direção", f.director],
                ["Produção", f.producers],
                ["Produtora", f.company],
                ["País", f.country],
                ["Coprodução", f.coproduction.join(", ")],
                ["Idioma", f.language],
                ["Legendas", f.subtitles.join(", ")],
                ["CPB", f.cpb],
                ["Estreia mundial disponível", f.worldPremiereAvailable],
                ["Histórico online", f.onlineStatus],
                ["Primeira exibição", f.premiereDate],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v || "Não informado"}</dd>
                </div>
              ))}
            </dl>
          </section>
          {f.exhibitionHistory.length > 0 && (
            <section className="panel">
              <h2>Exibições públicas e restritas</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Evento</th>
                      <th>Local</th>
                      <th>Acesso / modalidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.exhibitionHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.date || "—"}</td>
                        <th scope="row">{item.event || "—"}</th>
                        <td>
                          {[item.city, item.region, item.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>
                        <td>
                          {item.access} · {item.modality}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section className="panel">
            <header className="section-heading">
              <h2>Histórico de circulação</h2>
              <a href="#/inscricoes">Gerenciar inscrições →</a>
            </header>
            {ss.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Festival</th>
                      <th>Edição</th>
                      <th>Estado</th>
                      <th>Prêmio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ss.map((s) => (
                      <tr key={s.id}>
                        <th scope="row">
                          <a href={`#/festivais/${s.festivalId}`}>
                            {
                              db.festivals.find((f) => f.id === s.festivalId)
                                ?.name
                            }
                          </a>
                        </th>
                        <td>
                          {db.editions.find((e) => e.id === s.editionId)?.year}
                        </td>
                        <td>
                          <Badge
                            tone={
                              s.resultStatus === "selecionado"
                                ? "positive"
                                : "muted"
                            }
                          >
                            {s.resultStatus}
                          </Badge>
                        </td>
                        <td>{s.award || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Nenhuma inscrição cadastrada.</p>
            )}
          </section>
        </div>
        <aside>
          <section className="panel">
            <p className="eyebrow">MATERIAIS / LINKS</p>
            <h2>Acesso rápido</h2>
            {f.links.length ? (
              f.links.map((l, i) => (
                <p key={i}>
                  <ExternalLink url={l.url}>{l.label || "Link"}</ExternalLink>{" "}
                  <Badge>{l.private ? "privado" : "público"}</Badge>
                </p>
              ))
            ) : (
              <p className="muted">Adicione seus links em “Editar ficha”.</p>
            )}
            {f.materials.length > 0 && (
              <div>
                <h3>Controle de materiais</h3>
                {f.materials.map((material) => (
                  <p key={material.id}>
                    {material.url ? (
                      <ExternalLink url={material.url}>
                        {material.type || "Material"}
                      </ExternalLink>
                    ) : (
                      <strong>{material.type || "Material"}</strong>
                    )}{" "}
                    <Badge
                      tone={
                        material.status === "pronto"
                          ? "positive"
                          : material.status === "faltante"
                            ? "warning"
                            : "unknown"
                      }
                    >
                      {material.status}
                    </Badge>
                    {material.version ? ` · ${material.version}` : ""}
                  </p>
                ))}
              </div>
            )}
            <p className="small muted">
              Links privados são guardados somente no navegador e no seu backup.
            </p>
          </section>
          <section className="panel">
            <h3>Notas</h3>
            <p className="preserve-whitespace">
              {f.notes || "Nenhuma nota pessoal."}
            </p>
          </section>
          {f.legacy && (
            <details className="panel legacy">
              <summary>Informações legadas</summary>
              <pre>{JSON.stringify(f.legacy, null, 2)}</pre>
            </details>
          )}
        </aside>
      </div>
      {edit && (
        <EntityForm table="films" entity={f} onClose={() => setEdit(false)} />
      )}
    </>
  );
}
