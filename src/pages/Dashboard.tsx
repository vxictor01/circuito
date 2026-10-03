import { useState, useEffect } from "react";
import { useStore } from "../store";
import {
  deadlineStatus,
  displayDate,
  nextDeadline,
  daysBetween,
  todayISO,
} from "../utils/deadlines";
import { needsUpdate } from "../utils/search";
import { Badge, Empty, Heading, Stats } from "../components/Shared";
export function Dashboard() {
  const { db } = useStore();
  const [windowDays, setWindowDays] = useState(30);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const planned = db.submissions.filter((s) =>
    ["pesquisando", "planejado", "aguardando abertura", "aberto"].includes(
      s.status,
    ),
  );
  const sent = db.submissions.filter((s) =>
    [
      "inscrito",
      "aguardando resultado",
      "selecionado",
      "não selecionado",
      "semifinalista",
      "finalista",
      "premiado",
    ].includes(s.status),
  );
  const waiting = db.submissions.filter((s) =>
    ["inscrito", "aguardando resultado"].includes(s.status),
  );
  const deadlines = db.calls
    .map((c) => {
      const e = db.editions.find((e) => e.id === c.editionId);
      const festival = db.festivals.find((f) => f.id === e?.festivalId);
      const deadline = nextDeadline(c, now, db.settings.timezone);
      return {
        c,
        e,
        festival,
        deadline,
        status: deadlineStatus(
          { ...c, deadlines: deadline ? [deadline] : [] },
          now,
          db.settings.timezone,
        ),
      };
    })
    .filter(
      (x) =>
        x.festival &&
        x.deadline &&
        daysBetween(todayISO(x.deadline.timezone, now), x.deadline.date) >= 0 &&
        daysBetween(todayISO(x.deadline.timezone, now), x.deadline.date) <=
          windowDays &&
        x.c.confidence !== "edição anterior",
    )
    .sort((a, b) => a.deadline!.date.localeCompare(b.deadline!.date));
  const stale = db.festivals.filter((f) =>
    needsUpdate(f, db.settings.staleDays),
  );
  return (
    <>
      <Heading
        title="O próximo movimento."
        eyebrow="CIRCUITO / VISÃO GERAL"
        description="Pesquise possibilidades. Organize envios. Acompanhe seus filmes."
        actions={
          <a className="button" href="#/dados">
            Exportar backup ↗
          </a>
        }
      />
      <Stats
        items={[
          {
            label: "Acervo de festivais",
            value: db.festivals.length,
            href: "#/festivais",
            detail: `${db.festivals.filter((f) => f.favorite).length} favoritos`,
          },
          {
            label: "Inscrições planejadas",
            value: planned.length,
            href: "#/inscricoes",
          },
          {
            label: "Inscrições realizadas",
            value: sent.length,
            href: "#/inscricoes",
          },
          {
            label: "Aguardando resultado",
            value: waiting.length,
            href: "#/inscricoes",
          },
        ]}
      />
      <div className="dashboard-grid">
        <section className="panel deadlines-panel">
          <header className="section-heading">
            <div>
              <p className="eyebrow">AÇÃO / INSCRIÇÕES</p>
              <h2>Próximos prazos</h2>
            </div>
            <div className="segmented">
              {[7, 30, 60].map((d) => (
                <button
                  key={d}
                  aria-pressed={d === windowDays}
                  onClick={() => setWindowDays(d)}
                >
                  {d} dias
                </button>
              ))}
            </div>
          </header>
          {deadlines.length ? (
            <div className="deadline-list">
              {deadlines
                .slice(0, 12)
                .map(({ c, e, festival, status, deadline }) => (
                  <a
                    href={`#/festivais/${festival!.id}`}
                    key={c.id}
                    className="deadline-row"
                  >
                    <time dateTime={deadline!.date}>
                      <strong>{deadline!.date.slice(8)}</strong>
                      <span>
                        {new Intl.DateTimeFormat("pt-BR", {
                          month: "short",
                          timeZone: "UTC",
                        }).format(new Date(deadline!.date + "T12:00:00Z"))}
                      </span>
                    </time>
                    <div>
                      <h3>{festival!.name}</h3>
                      <p>
                        {e!.year} · {c.name} · {deadline!.kind}
                      </p>
                      <Badge tone={status.tone}>
                        {
                          deadlineStatus(
                            { ...c, deadlines: [deadline!] },
                            now,
                            db.settings.timezone,
                          ).label
                        }
                      </Badge>
                    </div>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
            </div>
          ) : (
            <div className="quiet-empty">
              <h3>Nenhum prazo confirmado neste intervalo.</h3>
              <p>
                O catálogo tem fontes e histórico. Confirme as datas da chamada
                antes de planejar um envio.
              </p>
              <a href="#/festivais">Explorar festivais →</a>
            </div>
          )}
          {deadlines.length > 12 && (
            <a className="section-link" href="#/calendario">
              Ver todos os {deadlines.length} prazos →
            </a>
          )}
        </section>
        <aside className="dashboard-side">
          <section className="panel">
            <p className="eyebrow">PESQUISA / QUALIDADE</p>
            <h2>Manter o acervo vivo.</h2>
            <p className="large-number">{stale.length}</p>
            <p className="muted">
              festivais com fontes antigas ou sem verificação recente.
            </p>
            <a href="#/festivais">Revisar o acervo →</a>
            <div className="notice-inline">
              As regras mudam a cada edição. “Não confirmado” preserva uma
              dúvida, não significa “não”.
            </div>
          </section>
          <section className="panel">
            <p className="eyebrow">SEUS DADOS</p>
            <h3>Este espaço é seu.</h3>
            <p className="muted">
              Filmes, notas e inscrições ficam neste navegador. Faça backup para
              levar tudo com você.
            </p>
            <a href="#/dados">Dados e backup →</a>
          </section>
        </aside>
      </div>
      <section className="panel films-summary">
        <header className="section-heading">
          <div>
            <p className="eyebrow">OBRAS / CIRCULAÇÃO</p>
            <h2>Seus filmes</h2>
          </div>
          <a href="#/filmes">Abrir filmografia →</a>
        </header>
        {db.films.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Filme</th>
                  <th>Envios</th>
                  <th>Seleções</th>
                  <th>Recusas</th>
                  <th>Pendências</th>
                </tr>
              </thead>
              <tbody>
                {db.films.map((f) => {
                  const ss = db.submissions.filter((s) => s.filmId === f.id);
                  return (
                    <tr key={f.id}>
                      <th scope="row">
                        <a href={`#/filmes/${f.id}`}>{f.title}</a>
                      </th>
                      <td>
                        {
                          ss.filter(
                            (s) =>
                              ![
                                "planejado",
                                "pesquisando",
                                "aguardando abertura",
                                "aberto",
                                "inelegível",
                                "retirado",
                              ].includes(s.status),
                          ).length
                        }
                      </td>
                      <td>
                        {
                          ss.filter((s) =>
                            [
                              "selecionado",
                              "finalista",
                              "semifinalista",
                              "premiado",
                            ].includes(s.status),
                          ).length
                        }
                      </td>
                      <td>
                        {
                          ss.filter((s) => s.status === "não selecionado")
                            .length
                        }
                      </td>
                      <td>
                        {
                          ss.filter((s) =>
                            [
                              "planejado",
                              "aguardando abertura",
                              "inscrito",
                              "aguardando resultado",
                            ].includes(s.status),
                          ).length
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="quiet-empty">
            <h3>Comece pelo seu primeiro filme.</h3>
            <p>
              Guarde a ficha, os materiais e o histórico de circulação em um só
              lugar.
            </p>
            <a className="button" href="#/filmes">
              Cadastrar filme →
            </a>
          </div>
        )}
      </section>
    </>
  );
}
