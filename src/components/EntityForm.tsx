import { useEffect, useRef, useState } from "react";
import {
  FORMATS,
  GENRES,
  PREMIERES,
  SUBMISSION_STATUSES,
  type Call,
  type Deadline,
  type Edition,
  type Entity,
  type Fee,
  type Film,
  type Source,
  type Submission,
  type Table,
} from "../types";
import { useStore } from "../store";
import { ExternalLink } from "./Shared";
type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "textarea"
    | "select"
    | "multi"
    | "tags"
    | "checkbox";
  options?: readonly string[];
  required?: boolean;
  hint?: string;
  min?: number;
};
const answers = ["sim", "não", "não confirmado", "não se aplica"];
const confidence = [
  "confirmado",
  "parcial",
  "edição anterior",
  "não verificado",
];
const online = ["permitido", "proibido", "restrito", "não confirmado"];
const defs: Record<
  Table,
  { title: string; groups: { title: string; fields: Field[] }[] }
> = {
  festivals: {
    title: "festival",
    groups: [
      {
        title: "Identidade",
        fields: [
          { key: "name", label: "Nome oficial", required: true },
          { key: "internationalName", label: "Nome internacional" },
          { key: "acronym", label: "Sigla" },
          { key: "aliases", label: "Outros nomes / aliases", type: "tags" },
          { key: "country", label: "País", required: true },
          { key: "region", label: "Estado / região" },
          { key: "city", label: "Cidade" },
          { key: "organizer", label: "Organização responsável" },
        ],
      },
      {
        title: "Links e contato",
        fields: [
          { key: "website", label: "Site oficial" },
          { key: "instagram", label: "Instagram" },
          { key: "contact", label: "Contato" },
          {
            key: "platforms",
            label: "Plataformas (uma por vírgula)",
            type: "tags",
          },
        ],
      },
      {
        title: "Perfil",
        fields: [
          {
            key: "genres",
            label: "Linguagens e perfis",
            type: "multi",
            options: GENRES,
          },
          { key: "tags", label: "Tags livres", type: "tags" },
          { key: "description", label: "Descrição", type: "textarea" },
          {
            key: "scale",
            label: "Porte aproximado",
            type: "select",
            options: [
              "não confirmado",
              "grande",
              "médio",
              "pequeno",
              "Grande",
              "Médio",
              "Pequeno",
            ],
          },
          {
            key: "frequency",
            label: "Frequência",
            type: "select",
            options: ["não confirmado", "anual", "bienal", "irregular"],
          },
          {
            key: "activity",
            label: "Atividade",
            type: "select",
            options: ["ativo", "atividade não confirmada", "inativo"],
          },
        ],
      },
      {
        title: "Sua organização",
        fields: [
          { key: "favorite", label: "Favorito", type: "checkbox" },
          {
            key: "priority",
            label: "Prioridade pessoal",
            type: "select",
            options: ["sem prioridade", "alta", "média", "baixa"],
          },
          { key: "personalNotes", label: "Notas pessoais", type: "textarea" },
        ],
      },
    ],
  },
  editions: {
    title: "edição",
    groups: [
      {
        title: "Edição e calendário",
        fields: [
          {
            key: "year",
            label: "Ano",
            type: "number",
            required: true,
            min: 1900,
          },
          { key: "number", label: "Número da edição" },
          { key: "start", label: "Início do festival", type: "date" },
          { key: "end", label: "Fim do festival", type: "date" },
          {
            key: "opening",
            label: "Abertura geral das inscrições",
            type: "date",
          },
          { key: "closing", label: "Encerramento geral", type: "date" },
          { key: "resultDate", label: "Divulgação do resultado", type: "date" },
          {
            key: "status",
            label: "Estado da edição",
            type: "select",
            options: ["planejada", "realizada", "não confirmado"],
          },
        ],
      },
      {
        title: "Verificação",
        fields: [
          { key: "rulesUrl", label: "Regulamento" },
          { key: "checkedAt", label: "Verificado em", type: "date" },
          {
            key: "confidence",
            label: "Confiança das informações",
            type: "select",
            options: confidence,
          },
          { key: "notes", label: "Observações", type: "textarea" },
        ],
      },
    ],
  },
  calls: {
    title: "chamada",
    groups: [
      {
        title: "Categoria e formatos",
        fields: [
          {
            key: "name",
            label: "Nome da chamada / competição",
            required: true,
          },
          {
            key: "formats",
            label: "Formatos aceitos",
            type: "multi",
            options: FORMATS,
          },
          {
            key: "genres",
            label: "Linguagens aceitas",
            type: "multi",
            options: GENRES,
          },
          {
            key: "genresConfirmed",
            label: "Lista de linguagens confirmada no regulamento",
            type: "checkbox",
          },
          { key: "minMinutes", label: "Duração mínima (min)", type: "number" },
          { key: "maxMinutes", label: "Duração máxima (min)", type: "number" },
          { key: "minYear", label: "Ano de produção mínimo", type: "number" },
          { key: "maxYear", label: "Ano de produção máximo", type: "number" },
        ],
      },
      {
        title: "Elegibilidade",
        fields: [
          {
            key: "pf",
            label: "Pessoa física",
            type: "select",
            options: answers,
          },
          {
            key: "pj",
            label: "Pessoa jurídica",
            type: "select",
            options: answers,
          },
          {
            key: "premiere",
            label: "Exigência de estreia",
            type: "select",
            options: PREMIERES,
          },
          {
            key: "online",
            label: "Disponibilidade online anterior",
            type: "select",
            options: online,
          },
          {
            key: "countries",
            label: "Países elegíveis",
            type: "tags",
            hint: "Vazio + territorialidade confirmada = sem restrição de país.",
          },
          {
            key: "regions",
            label: "Estados / regiões elegíveis",
            type: "tags",
          },
          {
            key: "territoriesConfirmed",
            label: "Territorialidade confirmada no regulamento",
            type: "checkbox",
          },
          {
            key: "resubmission",
            label: "Reinscrição de filme já inscrito",
            type: "select",
            options: answers,
          },
          {
            key: "restrictions",
            label: "Restrições e requisitos adicionais",
            type: "textarea",
          },
        ],
      },
      {
        title: "Inscrição e verificação",
        fields: [
          { key: "platform", label: "Plataforma / URL de inscrição" },
          { key: "opening", label: "Abertura da chamada", type: "date" },
          { key: "rulesUrl", label: "Regulamento oficial" },
          { key: "checkedAt", label: "Verificado em", type: "date" },
          {
            key: "confidence",
            label: "Confiança das regras",
            type: "select",
            options: confidence,
          },
          { key: "notes", label: "Observações", type: "textarea" },
        ],
      },
    ],
  },
  films: {
    title: "filme",
    groups: [
      {
        title: "Identidade e produção",
        fields: [
          { key: "title", label: "Título", required: true },
          { key: "internationalTitle", label: "Título internacional" },
          { key: "year", label: "Ano de produção", type: "number" },
          { key: "minutes", label: "Duração (minutos)", type: "number" },
          {
            key: "format",
            label: "Formato",
            type: "select",
            options: ["", ...FORMATS],
          },
          {
            key: "genres",
            label: "Linguagens e perfis",
            type: "multi",
            options: GENRES,
          },
          { key: "country", label: "País" },
          { key: "region", label: "Estado / região" },
          { key: "city", label: "Cidade" },
          { key: "coproduction", label: "Países de coprodução", type: "tags" },
          { key: "language", label: "Idioma original" },
          { key: "subtitles", label: "Idiomas de legendas", type: "tags" },
          { key: "director", label: "Direção" },
          { key: "producers", label: "Produção" },
          { key: "company", label: "Produtora" },
          { key: "completionDate", label: "Conclusão", type: "date" },
          { key: "cpb", label: "CPB" },
        ],
      },
      {
        title: "Estreia e circulação",
        fields: [
          {
            key: "worldPremiereAvailable",
            label: "Estreia mundial ainda disponível?",
            type: "select",
            options: answers,
          },
          {
            key: "premiereDate",
            label: "Primeira exibição pública",
            type: "date",
          },
          { key: "premiereCountry", label: "País da estreia" },
          { key: "premiereRegion", label: "Estado da estreia" },
          { key: "premiereCity", label: "Cidade da estreia" },
          {
            key: "online",
            label: "Disponibilidade pública online",
            type: "select",
            options: online,
          },
        ],
      },
      {
        title: "Textos",
        fields: [
          { key: "synopsis", label: "Sinopse", type: "textarea" },
          { key: "notes", label: "Notas pessoais", type: "textarea" },
        ],
      },
    ],
  },
  submissions: {
    title: "inscrição",
    groups: [
      {
        title: "Registro de envio",
        fields: [
          { key: "platform", label: "Plataforma" },
          { key: "date", label: "Data de inscrição", type: "date" },
          { key: "deadline", label: "Prazo usado", type: "date" },
          { key: "fee", label: "Taxa paga", type: "number" },
          {
            key: "currency",
            label: "Moeda",
            type: "select",
            options: ["BRL", "USD", "EUR", "GBP", "CAD", "MXN", "ARS", "CLP"],
          },
          { key: "code", label: "Código de inscrição (privado)" },
          {
            key: "status",
            label: "Estado",
            type: "select",
            options: SUBMISSION_STATUSES,
          },
          { key: "result", label: "Resultado / seção" },
          { key: "resultDate", label: "Data do resultado", type: "date" },
          { key: "award", label: "Prêmio" },
          { key: "notes", label: "Notas pessoais", type: "textarea" },
        ],
      },
    ],
  },
};
export function EntityForm({
  table,
  entity,
  onClose,
}: {
  table: Table;
  entity: Entity;
  onClose: () => void;
}) {
  const { db, change, setNotice } = useStore();
  const [draft, setDraft] = useState(
    () => structuredClone(entity) as unknown as Record<string, unknown>,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  const set = (key: string, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const options = (f: Field) => f.options || [];
  function input(f: Field) {
    const value = draft[f.key];
    const id = `field-${f.key}`;
    if (f.type === "multi")
      return (
        <fieldset className="multi field-wide">
          <legend>{f.label}</legend>
          {options(f).map((v) => (
            <label key={v}>
              <input
                type="checkbox"
                checked={(value as string[]).includes(v)}
                onChange={(e) =>
                  set(
                    f.key,
                    e.target.checked
                      ? [...(value as string[]), v]
                      : (value as string[]).filter((x) => x !== v),
                  )
                }
              />
              {v}
            </label>
          ))}
        </fieldset>
      );
    if (f.type === "checkbox")
      return (
        <label className="check field-wide" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => set(f.key, e.target.checked)}
          />
          {f.label}
        </label>
      );
    const props = { id, name: f.key, required: f.required };
    let node;
    if (f.type === "select")
      node = (
        <select
          {...props}
          value={String(value ?? "")}
          onChange={(e) => set(f.key, e.target.value)}
        >
          {[...new Set([...options(f), String(value ?? "")])].map((v) => (
            <option key={v} value={v}>
              {v || "Não informado"}
            </option>
          ))}
        </select>
      );
    else if (f.type === "textarea")
      node = (
        <textarea
          {...props}
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => set(f.key, e.target.value)}
        />
      );
    else if (f.type === "tags")
      node = (
        <input
          {...props}
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          onChange={(e) =>
            set(
              f.key,
              e.target.value.split(",").map((s) => s.trim()),
            )
          }
          onBlur={() => set(f.key, (draft[f.key] as string[]).filter(Boolean))}
        />
      );
    else
      node = (
        <input
          {...props}
          type={
            f.type === "number" ? "number" : f.type === "date" ? "date" : "text"
          }
          min={f.type === "number" ? (f.min ?? 0) : undefined}
          step={f.type === "number" ? "any" : undefined}
          value={value === null ? "" : String(value ?? "")}
          onChange={(e) =>
            set(
              f.key,
              f.type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      );
    return (
      <div className={f.type === "textarea" ? "field field-wide" : "field"}>
        <label htmlFor={id}>
          {f.label}
          {f.required ? " *" : ""}
        </label>
        {node}
        {f.hint && <small>{f.hint}</small>}
      </div>
    );
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await change((data) => {
        const records = data[table] as Entity[];
        const index = records.findIndex((x) => x.id === entity.id);
        if (index < 0) records.push(draft as unknown as Entity);
        else records[index] = draft as unknown as Entity;
      });
      setNotice("Salvo no seu navegador.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }
  const submission = draft as unknown as Submission;
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="edit-dialog"
      aria-labelledby="dialog-title"
    >
      <form onSubmit={save}>
        <header className="dialog-heading">
          <div>
            <p className="eyebrow">EDIÇÃO LOCAL</p>
            <h2 id="dialog-title">
              {db[table].some((x) => x.id === entity.id)
                ? "Editar"
                : table === "festivals" || table === "films"
                  ? "Novo"
                  : "Nova"}{" "}
              {defs[table].title}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar formulário"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="dialog-body">
          {table === "submissions" && (
            <section className="form-group">
              <h3>Filme, festival e chamada</h3>
              <div className="form-grid">
                <label>
                  Filme *
                  <select
                    required
                    value={submission.filmId}
                    onChange={(e) => set("filmId", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {db.films.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Festival *
                  <select
                    required
                    value={submission.festivalId}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        festivalId: e.target.value,
                        editionId: "",
                        callId: "",
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {[...db.festivals]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Edição *
                  <select
                    required
                    value={submission.editionId}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        editionId: e.target.value,
                        callId: "",
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {db.editions
                      .filter((e) => e.festivalId === submission.festivalId)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.year} {e.number ? ` / ${e.number}ª` : ""}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Chamada *
                  <select
                    required
                    value={submission.callId}
                    onChange={(e) => set("callId", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {db.calls
                      .filter((c) => c.editionId === submission.editionId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </section>
          )}
          {defs[table].groups.map((g) => (
            <section className="form-group" key={g.title}>
              <h3>{g.title}</h3>
              <div className="form-grid">
                {g.fields.map((f) => (
                  <div
                    className={
                      ["multi", "checkbox", "textarea"].includes(f.type || "")
                        ? "field-wide"
                        : ""
                    }
                    key={f.key}
                  >
                    {input(f)}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {table === "calls" && (
            <>
              <DeadlineEditor
                value={(draft as unknown as Call).deadlines}
                set={(v) => set("deadlines", v)}
              />
              <FeeEditor
                value={(draft as unknown as Call).fees}
                set={(v) => set("fees", v)}
              />
            </>
          )}
          {table === "films" && (
            <LinkEditor
              value={(draft as unknown as Film).links}
              set={(v) => set("links", v)}
            />
          )}
          {["festivals", "editions", "calls"].includes(table) && (
            <SourcesEditor
              value={draft.sources as Source[]}
              set={(v) => set("sources", v)}
            />
          )}
          {draft.legacy != null && (
            <details className="legacy">
              <summary>Informações originais preservadas</summary>
              <pre>{JSON.stringify(draft.legacy, null, 2)}</pre>
            </details>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="dialog-footer">
          <span className="small muted">Dados guardados neste navegador.</span>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
function DeadlineEditor({
  value,
  set,
}: {
  value: Deadline[];
  set: (v: Deadline[]) => void;
}) {
  const update = (i: number, key: string, val: unknown) =>
    set(value.map((d, j) => (i === j ? { ...d, [key]: val } : d)));
  return (
    <section className="form-group">
      <h3>Prazos por etapa</h3>
      <p className="small muted">
        Datas incertas não entram em “aberto agora”. Use o fuso informado pelo
        festival.
      </p>
      {value.map((d, i) => (
        <div className="repeater" key={i}>
          <label>
            Etapa
            <select
              value={d.kind}
              onChange={(e) => update(i, "kind", e.target.value)}
            >
              {["early", "regular", "late", "extended", "final"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input
              required
              type="date"
              value={d.date}
              onChange={(e) => update(i, "date", e.target.value)}
            />
          </label>
          <label>
            Hora limite
            <input
              type="time"
              value={d.time}
              onChange={(e) => update(i, "time", e.target.value)}
            />
          </label>
          <label>
            Fuso IANA
            <input
              required
              value={d.timezone}
              onChange={(e) => update(i, "timezone", e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={d.confirmed}
              onChange={(e) => update(i, "confirmed", e.target.checked)}
            />
            Confirmado
          </label>
          <button
            type="button"
            onClick={() => set(value.filter((_, j) => i !== j))}
          >
            Remover prazo
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set([
            ...value,
            {
              kind: "final",
              date: "",
              time: "",
              timezone: "America/Sao_Paulo",
              confirmed: false,
            },
          ])
        }
      >
        + Adicionar prazo
      </button>
    </section>
  );
}
function FeeEditor({ value, set }: { value: Fee[]; set: (v: Fee[]) => void }) {
  const update = (i: number, key: string, val: unknown) =>
    set(value.map((d, j) => (i === j ? { ...d, [key]: val } : d)));
  return (
    <section className="form-group">
      <h3>Taxas</h3>
      {value.map((d, i) => (
        <div className="repeater" key={i}>
          <label>
            Valor
            <input
              type="number"
              min="0"
              step="0.01"
              value={d.amount ?? ""}
              onChange={(e) =>
                update(
                  i,
                  "amount",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </label>
          <label>
            Moeda
            <input
              value={d.currency}
              onChange={(e) =>
                update(i, "currency", e.target.value.toUpperCase())
              }
            />
          </label>
          <label>
            Gratuito?
            <select
              value={d.free}
              onChange={(e) => update(i, "free", e.target.value)}
            >
              {answers.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Etapa
            <select
              value={d.deadlineKind}
              onChange={(e) => update(i, "deadlineKind", e.target.value)}
            >
              {["early", "regular", "late", "extended", "final"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Desconto
            <input
              value={d.discount}
              onChange={(e) => update(i, "discount", e.target.value)}
            />
          </label>
          <label>
            Waiver
            <input
              value={d.waiver}
              onChange={(e) => update(i, "waiver", e.target.value)}
            />
          </label>
          <label className="field-wide">
            Observações
            <input
              value={d.notes}
              onChange={(e) => update(i, "notes", e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => set(value.filter((_, j) => j !== i))}
          >
            Remover taxa
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set([
            ...value,
            {
              amount: null,
              currency: "BRL",
              free: "não confirmado",
              deadlineKind: "final",
              discount: "",
              waiver: "",
              notes: "",
            },
          ])
        }
      >
        + Adicionar taxa
      </button>
    </section>
  );
}
function SourcesEditor({
  value,
  set,
}: {
  value: Source[];
  set: (v: Source[]) => void;
}) {
  const update = (i: number, key: string, val: unknown) =>
    set(value.map((d, j) => (i === j ? { ...d, [key]: val } : d)));
  return (
    <section className="form-group">
      <h3>Fontes e rastreabilidade</h3>
      {value.map((s, i) => (
        <div className="repeater" key={i}>
          <label className="field-wide">
            URL
            <input
              value={s.url}
              onChange={(e) => update(i, "url", e.target.value)}
            />
          </label>
          <label>
            Tipo
            <select
              value={s.type}
              onChange={(e) => update(i, "type", e.target.value)}
            >
              {[
                "oficial",
                "plataforma de inscrição",
                "fonte secundária",
                "estimativa",
                "não verificado",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Verificado em
            <input
              type="date"
              value={s.checkedAt}
              onChange={(e) => update(i, "checkedAt", e.target.value)}
            />
          </label>
          <label>
            Confiança
            <select
              value={s.confidence}
              onChange={(e) => update(i, "confidence", e.target.value)}
            >
              {confidence.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Campos respaldados
            <input
              value={s.fields.join(", ")}
              onChange={(e) =>
                update(
                  i,
                  "fields",
                  e.target.value.split(",").map((x) => x.trim()),
                )
              }
            />
          </label>
          <label className="field-wide">
            Observações
            <input
              value={s.note}
              onChange={(e) => update(i, "note", e.target.value)}
            />
          </label>
          <ExternalLink url={s.url} />
          <button
            type="button"
            onClick={() => set(value.filter((_, j) => i !== j))}
          >
            Remover fonte
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set([
            ...value,
            {
              url: "",
              type: "oficial",
              checkedAt: "",
              confidence: "não verificado",
              note: "",
              fields: [],
            },
          ])
        }
      >
        + Adicionar fonte
      </button>
    </section>
  );
}
function LinkEditor({
  value,
  set,
}: {
  value: Film["links"];
  set: (v: Film["links"]) => void;
}) {
  return (
    <section className="form-group">
      <h3>Links do filme</h3>
      <p className="small muted">
        Todos os links permanecem no navegador, inclusive os públicos.
        Exportações incluem também links privados.
      </p>
      {value.map((l, i) => (
        <div className="repeater" key={i}>
          <label>
            Nome
            <input
              value={l.label}
              onChange={(e) =>
                set(
                  value.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="field-wide">
            URL
            <input
              value={l.url}
              onChange={(e) =>
                set(
                  value.map((x, j) =>
                    j === i ? { ...x, url: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={l.private}
              onChange={(e) =>
                set(
                  value.map((x, j) =>
                    j === i ? { ...x, private: e.target.checked } : x,
                  ),
                )
              }
            />
            Link privado
          </label>
          <button
            type="button"
            onClick={() => set(value.filter((_, j) => i !== j))}
          >
            Remover link
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set([...value, { label: "Screener", url: "", private: true }])
        }
      >
        + Adicionar link
      </button>
    </section>
  );
}
