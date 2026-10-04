import { useMemo, useState } from "react";
import { type Submission } from "../types";
import { useStore } from "../store";
import { blankSubmission } from "../utils/defaults";
import { displayDate } from "../utils/deadlines";
import { csvText, downloadText } from "../utils/backup";
import { Badge, Empty, Heading, Stats } from "../components/Shared";
import { EntityForm } from "../components/EntityForm";
import { Filter } from "./Festivals";

export function Submissions() {
  const { db, change, setNotice } = useStore();
  const [edit, setEdit] = useState<Submission | null>(null);
  const [planningStatus, setPlanningStatus] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const [resultStatus, setResultStatus] = useState("");
  const [filmId, setFilmId] = useState("");
  const [festivalId, setFestivalId] = useState("");
  const [priority, setPriority] = useState("");
  const [responsible, setResponsible] = useState("");
  const [editionYear, setEditionYear] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkField, setBulkField] = useState("personalPriority");
  const [bulkValue, setBulkValue] = useState("alta");
  const [reviewingBulk, setReviewingBulk] = useState(false);
  const editionById = useMemo(
    () => new Map(db.editions.map((edition) => [edition.id, edition])),
    [db.editions],
  );
  const filtered = useMemo(
    () =>
      db.submissions
        .filter(
          (submission) =>
            (!planningStatus || submission.planningStatus === planningStatus) &&
            (!sendStatus || submission.sendStatus === sendStatus) &&
            (!resultStatus || submission.resultStatus === resultStatus) &&
            (!filmId || submission.filmId === filmId) &&
            (!festivalId || submission.festivalId === festivalId) &&
            (!priority || submission.personalPriority === priority) &&
            (!responsible || submission.responsible === responsible) &&
            (!editionYear ||
              String(editionById.get(submission.editionId)?.year || "") ===
                editionYear) &&
            (!pendingOnly ||
              submission.tasks.some((task) => !task.done) ||
              submission.checklist.some((item) => item.required && !item.done)),
        )
        .sort((a, b) =>
          (b.internalDeadline || b.deadline || b.date || "").localeCompare(
            a.internalDeadline || a.deadline || a.date || "",
          ),
        ),
    [
      db.submissions,
      editionById,
      editionYear,
      festivalId,
      filmId,
      pendingOnly,
      planningStatus,
      priority,
      responsible,
      resultStatus,
      sendStatus,
    ],
  );
  const paidBRL = filtered.reduce(
    (total, item) => total + (item.paidBRL || 0),
    0,
  );
  const pendingTasks = filtered.reduce(
    (total, item) => total + item.tasks.filter((task) => !task.done).length,
    0,
  );
  function exportCSV() {
    const rows = filtered.map((submission) => [
      db.films.find((film) => film.id === submission.filmId)?.title,
      db.festivals.find((festival) => festival.id === submission.festivalId)
        ?.name,
      db.editions.find((edition) => edition.id === submission.editionId)?.year,
      db.calls.find((call) => call.id === submission.callId)?.name,
      submission.planningStatus,
      submission.sendStatus,
      submission.resultStatus,
      submission.personalPriority,
      submission.responsible,
      submission.date,
      submission.deadline,
      submission.internalDeadline,
      submission.nextAction,
      submission.originalFee,
      submission.currency,
      submission.paidBRL,
      submission.result,
      submission.resultDate,
      submission.award,
    ]);
    downloadText(
      `Circuito_inscricoes_${new Date().toISOString().slice(0, 10)}.csv`,
      csvText([
        [
          "Filme",
          "Festival",
          "Edição",
          "Chamada",
          "Planejamento",
          "Envio",
          "Resultado",
          "Prioridade",
          "Responsável",
          "Data de envio",
          "Prazo externo",
          "Prazo interno",
          "Próxima ação",
          "Taxa original",
          "Moeda",
          "Gasto BRL",
          "Resultado oficial",
          "Data do resultado",
          "Prêmio",
        ],
        ...rows,
      ]),
      "text/csv;charset=utf-8",
    );
  }
  function bulkOptions() {
    if (bulkField === "planningStatus")
      return [
        "pesquisando",
        "priorizado",
        "aguardando abertura",
        "preparando",
        "fora do plano",
      ];
    if (bulkField === "sendStatus")
      return ["não enviado", "enviado", "aguardando decisão", "retirado"];
    if (bulkField === "resultStatus")
      return [
        "pendente",
        "selecionado",
        "não selecionado",
        "lista de espera",
        "outro",
      ];
    return ["alta", "média", "baixa", "fora do plano", "sem prioridade"];
  }
  async function applyBulk() {
    await change((data) => {
      for (const submission of data.submissions) {
        if (!selectedIds.includes(submission.id)) continue;
        if (bulkField === "planningStatus")
          submission.planningStatus = bulkValue as Submission["planningStatus"];
        else if (bulkField === "sendStatus")
          submission.sendStatus = bulkValue as Submission["sendStatus"];
        else if (bulkField === "resultStatus")
          submission.resultStatus = bulkValue as Submission["resultStatus"];
        else
          submission.personalPriority =
            bulkValue as Submission["personalPriority"];
      }
    });
    setReviewingBulk(false);
    setSelectedIds([]);
    setNotice("Alteração em lote aplicada às inscrições revisadas.");
  }
  return (
    <>
      <Heading
        title="Inscrições"
        eyebrow="PLANEJAMENTO / ENVIO / RESULTADO"
        description="Estados separados evitam confundir intenção, envio e decisão do festival."
        actions={
          <>
            <button disabled={!filtered.length} onClick={exportCSV}>
              Exportar recorte CSV
            </button>
            <button
              className="primary"
              disabled={!db.films.length || !db.calls.length}
              onClick={() => setEdit(blankSubmission())}
            >
              + Nova inscrição
            </button>
          </>
        }
      />
      <Stats
        items={[
          { label: "No recorte", value: filtered.length },
          {
            label: "Enviadas",
            value: filtered.filter((item) => item.sendStatus !== "não enviado")
              .length,
          },
          { label: "Tarefas pendentes", value: pendingTasks },
          {
            label: "Gasto real",
            value: paidBRL.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
          },
        ]}
      />
      <div className="filter-panel compact">
        <div className="filter-grid">
          <Filter
            label="Planejamento"
            value={planningStatus}
            onChange={setPlanningStatus}
            options={[
              "pesquisando",
              "priorizado",
              "aguardando abertura",
              "preparando",
              "fora do plano",
            ]}
          />
          <Filter
            label="Situação do envio"
            value={sendStatus}
            onChange={setSendStatus}
            options={[
              "não enviado",
              "enviado",
              "aguardando decisão",
              "retirado",
            ]}
          />
          <Filter
            label="Resultado"
            value={resultStatus}
            onChange={setResultStatus}
            options={[
              "pendente",
              "selecionado",
              "não selecionado",
              "lista de espera",
              "outro",
            ]}
          />
          <Filter
            label="Filme"
            value={filmId}
            onChange={setFilmId}
            options={db.films.map((film) => [film.id, film.title])}
          />
          <Filter
            label="Festival"
            value={festivalId}
            onChange={setFestivalId}
            options={[...db.festivals]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((festival) => [festival.id, festival.name])}
          />
          <Filter
            label="Ano / edição"
            value={editionYear}
            onChange={setEditionYear}
            options={[
              ...new Set(db.editions.map((edition) => String(edition.year))),
            ].sort()}
          />
          <Filter
            label="Prioridade"
            value={priority}
            onChange={setPriority}
            options={[
              "alta",
              "média",
              "baixa",
              "fora do plano",
              "sem prioridade",
            ]}
          />
          <Filter
            label="Responsável"
            value={responsible}
            onChange={setResponsible}
            options={[
              ...new Set(
                db.submissions
                  .map((submission) => submission.responsible)
                  .filter(Boolean),
              ),
            ].sort()}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(event) => setPendingOnly(event.target.checked)}
          />
          Somente com checklist ou tarefa pendente
        </label>
      </div>
      {selectedIds.length > 0 && (
        <section className="panel" aria-label="Ações em lote">
          <header className="section-heading">
            <div>
              <p className="eyebrow">AÇÃO EM LOTE / COM REVISÃO</p>
              <h2>{selectedIds.length} inscrições selecionadas</h2>
            </div>
            <button onClick={() => setSelectedIds([])}>Limpar seleção</button>
          </header>
          <div className="filter-grid">
            <Filter
              label="Campo"
              value={bulkField}
              onChange={(value) => {
                setBulkField(value);
                setBulkValue(
                  value === "personalPriority"
                    ? "alta"
                    : value === "planningStatus"
                      ? "pesquisando"
                      : value === "sendStatus"
                        ? "não enviado"
                        : "pendente",
                );
                setReviewingBulk(false);
              }}
              options={[
                ["personalPriority", "Prioridade"],
                ["planningStatus", "Planejamento"],
                ["sendStatus", "Situação do envio"],
                ["resultStatus", "Resultado"],
              ]}
            />
            <Filter
              label="Novo valor"
              value={bulkValue}
              onChange={(value) => {
                setBulkValue(value);
                setReviewingBulk(false);
              }}
              options={bulkOptions()}
            />
          </div>
          {!reviewingBulk ? (
            <button className="primary" onClick={() => setReviewingBulk(true)}>
              Revisar alteração
            </button>
          ) : (
            <div className="notice-inline">
              <strong>Confirme antes de alterar.</strong>
              <p>
                O campo “{bulkField}” será definido como “{bulkValue}” em{" "}
                {selectedIds.length} inscrições:
              </p>
              <ul>
                {db.submissions
                  .filter((submission) => selectedIds.includes(submission.id))
                  .map((submission) => (
                    <li key={submission.id}>
                      {db.films.find((film) => film.id === submission.filmId)
                        ?.title || "Filme"}{" "}
                      ·{" "}
                      {db.festivals.find(
                        (festival) => festival.id === submission.festivalId,
                      )?.name || "Festival"}
                    </li>
                  ))}
              </ul>
              <div className="actions">
                <button onClick={() => setReviewingBulk(false)}>Voltar</button>
                <button className="primary" onClick={() => void applyBulk()}>
                  Aplicar alteração em lote
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      {filtered.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as inscrições do recorte"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((submission) =>
                        selectedIds.includes(submission.id),
                      )
                    }
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked
                          ? filtered.map((submission) => submission.id)
                          : [],
                      )
                    }
                  />
                </th>
                <th>Filme / festival</th>
                <th>Chamada</th>
                <th>Planejamento</th>
                <th>Envio</th>
                <th>Resultado</th>
                <th>Próxima ação / prazo</th>
                <th>Gasto real</th>
                <th>
                  <span className="sr-only">Editar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((submission) => (
                <tr key={submission.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar inscrição ${submission.id}`}
                      checked={selectedIds.includes(submission.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, submission.id])]
                            : current.filter((id) => id !== submission.id),
                        )
                      }
                    />
                  </td>
                  <th scope="row">
                    <a href={`#/filmes/${submission.filmId}`}>
                      {
                        db.films.find((film) => film.id === submission.filmId)
                          ?.title
                      }
                    </a>
                    <small>
                      <a href={`#/festivais/${submission.festivalId}`}>
                        {
                          db.festivals.find(
                            (festival) => festival.id === submission.festivalId,
                          )?.name
                        }
                      </a>{" "}
                      ·{" "}
                      {
                        db.editions.find(
                          (edition) => edition.id === submission.editionId,
                        )?.year
                      }
                    </small>
                  </th>
                  <td>
                    {
                      db.calls.find((call) => call.id === submission.callId)
                        ?.name
                    }
                  </td>
                  <td>
                    <Badge
                      tone={
                        submission.personalPriority === "alta"
                          ? "priority"
                          : "muted"
                      }
                    >
                      {submission.planningStatus}
                    </Badge>
                    <small>{submission.personalPriority}</small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        submission.sendStatus === "enviado" ||
                        submission.sendStatus === "aguardando decisão"
                          ? "submitted"
                          : submission.sendStatus === "retirado"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {submission.sendStatus}
                    </Badge>
                    <small>
                      {submission.date
                        ? displayDate(submission.date)
                        : "Sem data de envio"}
                    </small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        submission.resultStatus === "selecionado"
                          ? "positive"
                          : submission.resultStatus === "não selecionado"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {submission.resultStatus}
                    </Badge>
                    <small>
                      {submission.result || submission.award || "—"}
                    </small>
                  </td>
                  <td>
                    {submission.nextAction || "—"}
                    <small>
                      {submission.internalDeadline
                        ? displayDate(submission.internalDeadline)
                        : submission.deadline
                          ? `Prazo externo: ${displayDate(submission.deadline)}`
                          : "Sem prazo"}
                    </small>
                  </td>
                  <td>
                    {submission.paidBRL === null
                      ? "Não informado"
                      : submission.paidBRL.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                    {submission.originalFee !== null && (
                      <small>
                        Original: {submission.currency}{" "}
                        {submission.originalFee.toFixed(2)}
                      </small>
                    )}
                  </td>
                  <td>
                    <button onClick={() => setEdit(submission)}>Editar</button>
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
