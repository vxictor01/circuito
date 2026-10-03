import { useState } from "react";
import { SUBMISSION_STATUSES, type Submission } from "../types";
import { useStore } from "../store";
import { blankSubmission } from "../utils/defaults";
import { displayDate } from "../utils/deadlines";
import { Badge, Empty, Heading } from "../components/Shared";
import { EntityForm } from "../components/EntityForm";
import { Filter } from "./Festivals";
export function Submissions() {
  const { db } = useStore();
  const [edit, setEdit] = useState<Submission | null>(null);
  const [status, setStatus] = useState("");
  const [filmId, setFilmId] = useState("");
  const [festivalId, setFestivalId] = useState("");
  const filtered = db.submissions
    .filter(
      (s) =>
        (!status || s.status === status) &&
        (!filmId || s.filmId === filmId) &&
        (!festivalId || s.festivalId === festivalId),
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <>
      <Heading
        title="Inscrições"
        eyebrow="ENVIO / ACOMPANHAMENTO"
        description="Da primeira pesquisa ao resultado final."
        actions={
          <button
            className="primary"
            disabled={!db.films.length || !db.calls.length}
            onClick={() => setEdit(blankSubmission())}
          >
            + Nova inscrição
          </button>
        }
      />
      <div className="filter-panel compact">
        <div className="filter-grid">
          <Filter
            label="Estado"
            value={status}
            onChange={setStatus}
            options={SUBMISSION_STATUSES}
          />
          <Filter
            label="Filme"
            value={filmId}
            onChange={setFilmId}
            options={db.films.map((f) => [f.id, f.title])}
          />
          <Filter
            label="Festival"
            value={festivalId}
            onChange={setFestivalId}
            options={[...db.festivals]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((f) => [f.id, f.name])}
          />
        </div>
      </div>
      {filtered.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Filme / festival</th>
                <th>Chamada</th>
                <th>Estado</th>
                <th>Envio / prazo</th>
                <th>Taxa</th>
                <th>Resultado</th>
                <th>
                  <span className="sr-only">Editar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <th scope="row">
                    <a href={`#/filmes/${s.filmId}`}>
                      {db.films.find((f) => f.id === s.filmId)?.title}
                    </a>
                    <small>
                      <a href={`#/festivais/${s.festivalId}`}>
                        {db.festivals.find((f) => f.id === s.festivalId)?.name}
                      </a>{" "}
                      · {db.editions.find((e) => e.id === s.editionId)?.year}
                    </small>
                  </th>
                  <td>{db.calls.find((c) => c.id === s.callId)?.name}</td>
                  <td>
                    <Badge
                      tone={
                        s.status === "premiado"
                          ? "award"
                          : [
                                "selecionado",
                                "finalista",
                                "semifinalista",
                              ].includes(s.status)
                            ? "positive"
                            : ["inscrito", "aguardando resultado"].includes(
                                  s.status,
                                )
                              ? "submitted"
                              : s.status === "inelegível"
                                ? "warning"
                                : "muted"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td>
                    {displayDate(s.date)}
                    <small>
                      {s.deadline ? `Prazo: ${displayDate(s.deadline)}` : ""}
                    </small>
                  </td>
                  <td>
                    {s.fee === null
                      ? "Não informado"
                      : `${s.currency} ${s.fee.toFixed(2)}`}
                  </td>
                  <td>{s.result || s.award || "—"}</td>
                  <td>
                    <button onClick={() => setEdit(s)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Nenhuma inscrição neste recorte."
          action={
            db.films.length ? (
              <a className="button" href="#/festivais">
                Pesquisar festivais →
              </a>
            ) : (
              <a className="button primary" href="#/filmes">
                Cadastrar primeiro filme →
              </a>
            )
          }
        >
          Cadastre um filme e escolha uma chamada para começar seu planejamento.
        </Empty>
      )}
      {edit && (
        <EntityForm
          table="submissions"
          entity={edit}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
