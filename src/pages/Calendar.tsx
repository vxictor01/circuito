import { useMemo, useState } from "react";
import { useStore } from "../store";
import { calendarEvents } from "../utils/calendar";
import { displayDate, todayISO } from "../utils/deadlines";
import { Badge, Heading } from "../components/Shared";
import { Filter } from "./Festivals";
export function Calendar() {
  const { db } = useStore();
  const today = todayISO(db.settings.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState("month");
  const [kind, setKind] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const events = useMemo(() => calendarEvents(db), [db]);
  const visible = events.filter(
    (e) =>
      e.date.startsWith(month) &&
      (!kind || e.kind === kind) &&
      (!onlyConfirmed || e.confirmed),
  );
  const [firstYear, firstMonth] = month.split("-").map(Number);
  const days = new Date(Date.UTC(firstYear, firstMonth, 0)).getUTCDate();
  const offset =
    (new Date(Date.UTC(firstYear, firstMonth - 1, 1)).getUTCDay() + 6) % 7;
  const weeks = Array.from({ length: Math.ceil((offset + days) / 7) }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => w * 7 + d - offset + 1),
  );
  function move(delta: number) {
    const dt = new Date(Date.UTC(firstYear, firstMonth - 1 + delta, 1));
    setMonth(dt.toISOString().slice(0, 7));
  }
  return (
    <>
      <Heading
        title="Calendário"
        eyebrow="TEMPO / ABERTURAS E PRAZOS"
        description="Veja inscrições, resultados e datas de exibição."
      />
      <div className="calendar-toolbar">
        <div className="actions">
          <button aria-label="Mês anterior" onClick={() => move(-1)}>
            ←
          </button>
          <label>
            <span className="sr-only">Mês</span>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <button aria-label="Próximo mês" onClick={() => move(1)}>
            →
          </button>
          <button onClick={() => setMonth(today.slice(0, 7))}>Hoje</button>
        </div>
        <div className="segmented">
          <button
            aria-pressed={view === "month"}
            onClick={() => setView("month")}
          >
            Mês
          </button>
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Lista
          </button>
        </div>
      </div>
      <div className="calendar-controls">
        <Filter
          label="Tipo de evento"
          value={kind}
          onChange={setKind}
          options={["abertura", "deadline", "resultado", "festival"]}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={onlyConfirmed}
            onChange={(e) => setOnlyConfirmed(e.target.checked)}
          />
          Somente datas confirmadas
        </label>
        <span className="small muted">{visible.length} eventos no mês</span>
      </div>
      {view === "month" ? (
        <div className="table-scroll">
          <div
            className="calendar-grid"
            role="table"
            aria-label="Calendário mensal"
          >
            <div className="calendar-week" role="row">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <div key={d} role="columnheader">
                  {d}
                </div>
              ))}
            </div>
            <div className="calendar-days" role="rowgroup">
              {weeks.map((week, w) => (
                <div className="calendar-row" role="row" key={w}>
                  {week.map((day, d) => {
                    if (day < 1 || day > days)
                      return (
                        <div
                          role="cell"
                          className="calendar-day blank"
                          key={d}
                        />
                      );
                    const i = day - 1;
                    const date = month + "-" + String(i + 1).padStart(2, "0");
                    const list = visible.filter((e) => e.date === date);
                    return (
                      <div
                        className={`calendar-day ${date === today ? "today" : ""}`}
                        key={date}
                        role="cell"
                        aria-label={displayDate(date)}
                      >
                        <time dateTime={date}>{i + 1}</time>
                        {list.slice(0, 4).map((e) => (
                          <a
                            className={`calendar-event ${e.kind} ${e.confirmed ? "" : "unconfirmed"}`}
                            href={`#/festivais/${e.festivalId}`}
                            key={e.id}
                            title={`${e.kind}: ${e.title} · ${e.detail}${!e.confirmed ? " · não confirmado" : ""}`}
                          >
                            <span>
                              {e.kind}
                              {!e.confirmed ? " ?" : ""}
                            </span>
                            {e.title}
                          </a>
                        ))}
                        {list.length > 4 && (
                          <button
                            className="text-button"
                            onClick={() => setView("list")}
                          >
                            + {list.length - 4} eventos
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          {visible.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Festival / categoria</th>
                    <th>Verificação</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.id}>
                      <td>{displayDate(e.date)}</td>
                      <td>
                        <Badge
                          tone={
                            e.kind === "deadline"
                              ? "warning"
                              : e.kind === "resultado"
                                ? "submitted"
                                : "doc"
                          }
                        >
                          {e.kind}
                        </Badge>
                      </td>
                      <th scope="row">
                        <a href={`#/festivais/${e.festivalId}`}>{e.title}</a>
                        <small>{e.detail}</small>
                      </th>
                      <td>
                        <Badge tone={e.confirmed ? "positive" : "unknown"}>
                          {e.confirmed
                            ? "confirmado"
                            : "não confirmado / histórico"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              Nenhum evento neste mês com os filtros escolhidos.
            </p>
          )}
        </div>
      )}
      <p className="small muted calendar-legend">
        “?” indica uma data histórica ou não confirmada. O calendário não
        substitui o regulamento.
      </p>
    </>
  );
}
