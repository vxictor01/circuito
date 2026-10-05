import { useEffect, useRef, useState } from "react";
import {
  FORMATS,
  WORK_TYPES,
  LANGUAGES,
  APPROACHES,
  CONTENT_GENRES,
  THEMES,
  AUDIENCES,
  PARTICIPATION_CONDITIONS,
  PREMIERES,
  type Call,
  type Deadline,
  type Edition,
  type Entity,
  type Fee,
  type Film,
  type Festival,
  type Location,
  type Source,
  type Submission,
  type Table,
} from "../types";
import { useStore } from "../store";
import { uid } from "../utils/defaults";
import { countryCode } from "../utils/normalization";
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
const priorities = [
  "sem prioridade",
  "alta",
  "média",
  "baixa",
  "fora do plano",
];
function legacySubmissionStatus(submission: Submission) {
  if (submission.resultStatus === "selecionado") return "selecionado";
  if (submission.resultStatus === "não selecionado") return "não selecionado";
  if (submission.sendStatus === "retirado") return "retirado";
  if (submission.sendStatus === "aguardando decisão")
    return "aguardando resultado";
  if (submission.sendStatus === "enviado") return "inscrito";
  if (submission.planningStatus === "aguardando abertura")
    return "aguardando abertura";
  if (submission.planningStatus === "fora do plano") return "inelegível";
  if (submission.planningStatus === "pesquisando") return "pesquisando";
  return "planejado";
}
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
            key: "workTypes",
            label: "Tipos de obra",
            type: "multi",
            options: WORK_TYPES,
          },
          {
            key: "languages",
            label: "Linguagens",
            type: "multi",
            options: LANGUAGES,
          },
          {
            key: "approaches",
            label: "Abordagens",
            type: "multi",
            options: APPROACHES,
          },
          {
            key: "contentGenres",
            label: "Gêneros",
            type: "multi",
            options: CONTENT_GENRES,
          },
          {
            key: "themes",
            label: "Temas / recortes curatoriais",
            type: "multi",
            options: THEMES,
          },
          {
            key: "audiences",
            label: "Públicos",
            type: "multi",
            options: AUDIENCES,
          },
          {
            key: "participationConditions",
            label: "Condições de participação",
            type: "multi",
            options: PARTICIPATION_CONDITIONS,
          },
          { key: "tags", label: "Tags livres", type: "tags" },
          { key: "description", label: "Descrição", type: "textarea" },
          {
            key: "scale",
            label: "Abrangência legada (revisar)",
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
            key: "basePriority",
            label: "Prioridade-base sugerida",
            type: "select",
            options: priorities,
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
            label: "Formato por duração",
            type: "multi",
            options: FORMATS.filter((format) =>
              ["curta", "média", "longa"].includes(format),
            ),
          },
          {
            key: "workTypes",
            label: "Tipos de obra",
            type: "multi",
            options: WORK_TYPES,
          },
          {
            key: "languages",
            label: "Linguagens aceitas",
            type: "multi",
            options: LANGUAGES,
          },
          {
            key: "approaches",
            label: "Abordagens",
            type: "multi",
            options: APPROACHES,
          },
          {
            key: "contentGenres",
            label: "Gêneros",
            type: "multi",
            options: CONTENT_GENRES,
          },
          {
            key: "themes",
            label: "Temas / recortes",
            type: "multi",
            options: THEMES,
          },
          {
            key: "audiences",
            label: "Públicos",
            type: "multi",
            options: AUDIENCES,
          },
          {
            key: "participationConditions",
            label: "Condições de participação",
            type: "multi",
            options: PARTICIPATION_CONDITIONS,
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
          {
            key: "submissionMode",
            label: "Forma de ingresso",
            type: "select",
            options: [
              "não confirmado",
              "aberta",
              "convite",
              "indicação",
              "curadoria sem chamada",
            ],
          },
          {
            key: "selectionType",
            label: "Tipo de seleção",
            type: "select",
            options: [
              "não confirmado",
              "competitiva",
              "não competitiva",
              "mista",
            ],
          },
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
            label: "Nível de estreia",
            type: "select",
            options: PREMIERES,
          },
          {
            key: "premiereRequirement",
            label: "Natureza da exigência de estreia",
            type: "select",
            options: [
              "desconhecida",
              "obrigatória",
              "preferencial",
              "sem exigência confirmada",
            ],
          },
          { key: "premiereTerritory", label: "Território da estreia" },
          {
            key: "premiereConditions",
            label: "Condições da estreia",
            type: "textarea",
          },
          {
            key: "online",
            label: "Regra sobre histórico online",
            type: "select",
            options: online,
          },
          {
            key: "onlineConditions",
            label: "Condições sobre online / TV / VOD",
            type: "textarea",
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
            key: "durationSeconds",
            label: "Duração total (segundos, precisa)",
            type: "number",
            hint: "Use este campo para limites exatos; 20min30s = 1230.",
          },
          {
            key: "format",
            label: "Formato",
            type: "select",
            options: [
              "",
              ...FORMATS.filter((format) =>
                ["curta", "média", "longa"].includes(format),
              ),
            ],
          },
          {
            key: "workType",
            label: "Tipo de obra",
            type: "select",
            options: ["", ...WORK_TYPES],
          },
          {
            key: "languages",
            label: "Linguagens",
            type: "multi",
            options: LANGUAGES,
          },
          {
            key: "approaches",
            label: "Abordagens",
            type: "multi",
            options: APPROACHES,
          },
          {
            key: "contentGenres",
            label: "Gêneros",
            type: "multi",
            options: CONTENT_GENRES,
          },
          {
            key: "themes",
            label: "Temas / recortes",
            type: "multi",
            options: THEMES,
          },
          {
            key: "audiences",
            label: "Públicos",
            type: "multi",
            options: AUDIENCES,
          },
          {
            key: "participationConditions",
            label: "Condições de participação",
            type: "multi",
            options: PARTICIPATION_CONDITIONS,
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
            key: "onlineStatus",
            label: "Histórico de disponibilidade",
            type: "select",
            options: [
              "não informado",
              "nunca publicado",
              "screener privado",
              "publicação pública atual",
              "publicação pública anterior",
              "sessão online restrita/geobloqueada",
              "TV/VOD",
            ],
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
        title: "Planejamento",
        fields: [
          {
            key: "planningStatus",
            label: "Planejamento",
            type: "select",
            options: [
              "pesquisando",
              "priorizado",
              "aguardando abertura",
              "preparando",
              "fora do plano",
            ],
          },
          {
            key: "personalPriority",
            label: "Prioridade para este filme",
            type: "select",
            options: priorities,
          },
          { key: "responsible", label: "Responsável" },
          { key: "nextAction", label: "Próxima ação" },
          { key: "internalDeadline", label: "Prazo interno", type: "date" },
        ],
      },
      {
        title: "Envio e gasto",
        fields: [
          {
            key: "sendStatus",
            label: "Situação do envio",
            type: "select",
            options: [
              "não enviado",
              "enviado",
              "aguardando decisão",
              "retirado",
            ],
          },
          { key: "platform", label: "Plataforma" },
          { key: "date", label: "Data de inscrição", type: "date" },
          { key: "deadline", label: "Prazo usado", type: "date" },
          { key: "originalFee", label: "Taxa original", type: "number" },
          { key: "paidBRL", label: "Gasto real em BRL", type: "number" },
          {
            key: "currency",
            label: "Moeda",
            type: "select",
            options: ["BRL", "USD", "EUR", "GBP", "CAD", "MXN", "ARS", "CLP"],
          },
          { key: "protocol", label: "Protocolo (privado)" },
          { key: "waiverUsed", label: "Isenção utilizada", type: "checkbox" },
        ],
      },
      {
        title: "Decisão",
        fields: [
          {
            key: "resultStatus",
            label: "Resultado",
            type: "select",
            options: [
              "pendente",
              "selecionado",
              "não selecionado",
              "lista de espera",
              "outro",
            ],
          },
          { key: "result", label: "Resultado oficial / seção" },
          {
            key: "expectedDecisionDate",
            label: "Previsão da decisão",
            type: "date",
          },
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
  const original = useRef(JSON.stringify(entity));
  const dirty = JSON.stringify(draft) !== original.current;
  const originalRecord = entity as unknown as Record<string, unknown>;
  const changedDraftFields = [
    ...new Set([...Object.keys(originalRecord), ...Object.keys(draft)]),
  ].filter(
    (key) => JSON.stringify(originalRecord[key]) !== JSON.stringify(draft[key]),
  );
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function requestClose() {
    if (
      dirty &&
      !window.confirm("Há alterações não salvas. Deseja descartá-las?")
    )
      return;
    onClose();
  }
  const set = (key: string, value: unknown) =>
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (table === "calls" && ["minMinutes", "maxMinutes"].includes(key))
        next[key === "minMinutes" ? "minSeconds" : "maxSeconds"] =
          value === null ? null : Math.round(Number(value) * 60);
      if (
        table === "films" &&
        key === "minutes" &&
        next.durationSeconds === null
      )
        next.durationSeconds =
          value === null ? null : Math.round(Number(value) * 60);
      if (
        table === "festivals" &&
        ["country", "region", "city"].includes(key)
      ) {
        const festival = next as unknown as Festival;
        const locations = [...festival.locations];
        const primary: Location = locations[0] || {
          id: uid("location"),
          role: "sede",
          countryCode: "",
          countryName: String(next.country || ""),
          subdivisionCode: "",
          subdivisionName: String(next.region || ""),
          city: String(next.city || ""),
          municipalityCode: "",
          district: "",
          confirmed: false,
          sourceIds: [],
        };
        if (key === "country") {
          primary.countryName = String(value || "");
          primary.countryCode = countryCode(primary.countryName);
        }
        if (key === "region") {
          primary.subdivisionName = String(value || "");
          primary.subdivisionCode =
            primary.countryCode === "BR" && /^[A-Z]{2}$/.test(String(value))
              ? String(value)
              : "";
        }
        if (key === "city") primary.city = String(value || "");
        locations[0] = primary;
        next.locations = locations;
      }
      if (table === "submissions") {
        if (key === "protocol") next.code = value;
        if (key === "originalFee") next.fee = value;
        const submission = next as unknown as Submission;
        next.status = legacySubmissionStatus(submission);
      }
      return next;
    });
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
      if (table === "submissions") {
        const duplicate = db.submissions.find(
          (item) =>
            item.id !== entity.id &&
            item.filmId === submission.filmId &&
            item.festivalId === submission.festivalId &&
            item.editionId === submission.editionId &&
            item.callId === submission.callId,
        );
        if (
          duplicate &&
          !window.confirm(
            "Já existe uma inscrição para este filme, festival, edição e chamada. Deseja manter outro registro mesmo assim?",
          )
        ) {
          setSaving(false);
          return;
        }
      }
      await change((data) => {
        const records = data[table] as Entity[];
        const index = records.findIndex((x) => x.id === entity.id);
        if (index < 0) records.push(draft as unknown as Entity);
        else {
          const before = structuredClone(records[index]) as unknown as Record<
            string,
            unknown
          >;
          const changedFields = [
            ...new Set([...Object.keys(before), ...Object.keys(draft)]),
          ].filter(
            (key) => JSON.stringify(before[key]) !== JSON.stringify(draft[key]),
          );
          records[index] = draft as unknown as Entity;
          if (changedFields.length) {
            data.archive.editHistory ||= [];
            data.archive.editHistory.push({
              table,
              entityId: entity.id,
              changedAt: new Date().toISOString(),
              changedFields,
              before: before as unknown as Record<string, unknown>,
            });
            data.archive.editHistory = data.archive.editHistory.slice(-200);
          }
        }
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
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
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
            onClick={requestClose}
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
          {table === "festivals" && (
            <>
              <LocationEditor
                value={(draft as unknown as Festival).locations}
                set={(locations) =>
                  setDraft((current) => {
                    const primary = locations[0];
                    return {
                      ...current,
                      locations,
                      country: primary?.countryName || "",
                      region:
                        primary?.subdivisionCode ||
                        primary?.subdivisionName ||
                        "",
                      city: primary?.city || "",
                    };
                  })
                }
              />
              <SeasonalityEditor
                value={(draft as unknown as Festival).seasonality}
                set={(seasonality) => set("seasonality", seasonality)}
              />
              <RelevanceEditor
                value={(draft as unknown as Festival).relevance}
                set={(relevance) => set("relevance", relevance)}
              />
            </>
          )}
          {table === "calls" && (
            <>
              <DurationRuleEditor
                value={draft as unknown as Call}
                set={(key, value) => set(key, value)}
              />
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
            <>
              <FilmCirculationEditor
                value={draft as unknown as Film}
                set={(key, value) => set(key, value)}
              />
              <LinkEditor
                value={(draft as unknown as Film).links}
                set={(v) => set("links", v)}
              />
            </>
          )}
          {table === "submissions" && (
            <SubmissionTrackingEditor
              value={draft as unknown as Submission}
              set={(key, value) => set(key, value)}
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
        {dirty && (
          <details className="notice-inline">
            <summary>
              Revisar alterações antes de salvar ({changedDraftFields.length})
            </summary>
            <ul>
              {changedDraftFields.map((key) => (
                <li key={key}>{fieldLabel(table, key)}</li>
              ))}
            </ul>
          </details>
        )}
        <footer className="dialog-footer">
          <span className="small muted">
            {dirty
              ? "Alterações ainda não salvas."
              : "Dados guardados neste navegador."}
          </span>
          <button type="button" onClick={requestClose}>
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

function fieldLabel(table: Table, key: string) {
  return (
    defs[table].groups
      .flatMap((group) => group.fields)
      .find((field) => field.key === key)?.label ||
    (
      {
        locations: "Localidades normalizadas",
        seasonality: "Sazonalidade",
        relevance: "Avaliação de relevância",
        sources: "Fontes",
        deadlines: "Prazos",
        fees: "Taxas",
        materials: "Materiais",
        screeningHistory: "Histórico de exibições",
        onlineHistory: "Histórico online",
        checklist: "Checklist",
        tasks: "Tarefas",
        screenings: "Sessões",
        awards: "Prêmios",
      } as Record<string, string>
    )[key] ||
    key
  );
}

function LocationEditor({
  value,
  set,
}: {
  value: Location[];
  set: (value: Location[]) => void;
}) {
  const update = (index: number, key: keyof Location, nextValue: unknown) =>
    set(
      value.map((location, itemIndex) => {
        if (itemIndex !== index) return location;
        const next = { ...location, [key]: nextValue };
        if (key === "countryName")
          next.countryCode = countryCode(String(nextValue));
        return next;
      }),
    );
  return (
    <section className="form-group">
      <h3>Localidades normalizadas</h3>
      <p className="small muted">
        Um festival pode ter mais de uma cidade. A primeira localidade alimenta
        os campos legados usados por backups antigos.
      </p>
      {value.map((location, index) => (
        <div className="repeater" key={location.id}>
          <label>
            Papel
            <select
              value={location.role}
              onChange={(event) => update(index, "role", event.target.value)}
            >
              <option>sede</option>
              <option>exibição</option>
              <option>organização</option>
            </select>
          </label>
          <label>
            País
            <input
              value={location.countryName}
              onChange={(event) =>
                update(index, "countryName", event.target.value)
              }
            />
          </label>
          <label>
            Código do país
            <input
              maxLength={2}
              value={location.countryCode}
              onChange={(event) =>
                update(index, "countryCode", event.target.value.toUpperCase())
              }
            />
          </label>
          <label>
            Estado / subdivisão
            <input
              value={location.subdivisionName}
              onChange={(event) =>
                update(index, "subdivisionName", event.target.value)
              }
            />
          </label>
          <label>
            Código da subdivisão
            <input
              value={location.subdivisionCode}
              onChange={(event) =>
                update(
                  index,
                  "subdivisionCode",
                  event.target.value.toUpperCase(),
                )
              }
            />
          </label>
          <label>
            Cidade
            <input
              value={location.city}
              onChange={(event) => update(index, "city", event.target.value)}
            />
          </label>
          <label>
            Código do município (IBGE)
            <input
              value={location.municipalityCode}
              onChange={(event) =>
                update(index, "municipalityCode", event.target.value)
              }
            />
          </label>
          <label>
            Distrito / bairro
            <input
              value={location.district}
              onChange={(event) =>
                update(index, "district", event.target.value)
              }
            />
          </label>
          <label>
            IDs das fontes
            <input
              value={location.sourceIds.join(", ")}
              onChange={(event) =>
                update(
                  index,
                  "sourceIds",
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={location.confirmed}
              onChange={(event) =>
                update(index, "confirmed", event.target.checked)
              }
            />
            Localidade confirmada por fonte
          </label>
          <button
            type="button"
            onClick={() =>
              set(value.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            Remover localidade
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set([
            ...value,
            {
              id: uid("location"),
              role: value.length ? "exibição" : "sede",
              countryCode: "",
              countryName: "",
              subdivisionCode: "",
              subdivisionName: "",
              city: "",
              municipalityCode: "",
              district: "",
              confirmed: false,
              sourceIds: [],
            },
          ])
        }
      >
        + Adicionar localidade
      </button>
    </section>
  );
}

function SeasonalityEditor({
  value,
  set,
}: {
  value: Festival["seasonality"];
  set: (value: Festival["seasonality"]) => void;
}) {
  const update = (
    kind: keyof Festival["seasonality"],
    key: keyof Festival["seasonality"]["opening"],
    nextValue: unknown,
  ) => set({ ...value, [kind]: { ...value[kind], [key]: nextValue } });
  return (
    <section className="form-group">
      <h3>Sazonalidade histórica</h3>
      <p className="small muted">
        Previsões sazonais são independentes das datas confirmadas de cada
        edição.
      </p>
      {(["opening", "event"] as const).map((kind) => (
        <div className="repeater" key={kind}>
          <strong>
            {kind === "opening" ? "Abertura das inscrições" : "Evento"}
          </strong>
          <label>
            Meses (1–12)
            <input
              value={value[kind].months.join(", ")}
              onChange={(event) =>
                update(
                  kind,
                  "months",
                  event.target.value
                    .split(",")
                    .map(Number)
                    .filter(
                      (month) =>
                        Number.isInteger(month) && month >= 1 && month <= 12,
                    ),
                )
              }
            />
          </label>
          <label>
            Anos que sustentam a estimativa
            <input
              value={value[kind].evidenceYears.join(", ")}
              onChange={(event) =>
                update(
                  kind,
                  "evidenceYears",
                  event.target.value
                    .split(",")
                    .map(Number)
                    .filter((year) => Number.isInteger(year) && year >= 1900),
                )
              }
            />
          </label>
          <label>
            Confiança
            <select
              value={value[kind].confidence}
              onChange={(event) =>
                update(kind, "confidence", event.target.value)
              }
            >
              {["desconhecida", "baixa", "média", "alta"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field-wide">
            Fundamento
            <input
              value={value[kind].note}
              onChange={(event) => update(kind, "note", event.target.value)}
            />
          </label>
        </div>
      ))}
    </section>
  );
}

const relevanceDimensions: {
  key: keyof Festival["relevance"]["dimensions"];
  label: string;
  max: number;
}[] = [
  {
    key: "curatorialHistory",
    label: "Histórico e reconhecimento curatorial",
    max: 25,
  },
  {
    key: "programmingReach",
    label: "Alcance de programação e público",
    max: 20,
  },
  {
    key: "industryOpportunities",
    label: "Oportunidades de indústria e circulação",
    max: 20,
  },
  {
    key: "specializedImportance",
    label: "Importância para o recorte especializado",
    max: 20,
  },
  {
    key: "continuityTransparency",
    label: "Continuidade e transparência",
    max: 15,
  },
];

function RelevanceEditor({
  value,
  set,
}: {
  value: Festival["relevance"];
  set: (value: Festival["relevance"]) => void;
}) {
  const updateDimension = (
    key: keyof Festival["relevance"]["dimensions"],
    field: "score" | "evidence" | "sourceIds",
    nextValue: unknown,
  ) => {
    const dimensions = {
      ...value.dimensions,
      [key]: { ...value.dimensions[key], [field]: nextValue },
    };
    const scores = Object.values(dimensions).map(
      (dimension) => dimension.score,
    );
    const score = scores.every((item) => item !== null)
      ? scores.reduce<number>((total, item) => total + Number(item), 0)
      : null;
    set({ ...value, dimensions, score });
  };
  return (
    <section className="form-group">
      <h3>Relevância documentada</h3>
      <p className="small muted">
        Esta avaliação pública é separada da prioridade pessoal. Total
        calculado: {value.score === null ? "pendente" : `${value.score}/100`}.
      </p>
      <div className="form-grid">
        <label>
          Estado
          <select
            value={value.status}
            onChange={(event) =>
              set({
                ...value,
                status: event.target.value as Festival["relevance"]["status"],
              })
            }
          >
            <option>pendente</option>
            <option>provisória</option>
            <option>avaliada</option>
          </select>
        </label>
        <label>
          Faixa
          <select
            value={value.band}
            onChange={(event) =>
              set({
                ...value,
                band: event.target.value as Festival["relevance"]["band"],
              })
            }
          >
            {[
              "pendente",
              "menor alcance documentado",
              "intermediária",
              "alta",
              "muito alta",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Impacto
          <select
            value={value.impact}
            onChange={(event) =>
              set({
                ...value,
                impact: event.target.value as Festival["relevance"]["impact"],
              })
            }
          >
            {[
              "pendente",
              "comunitário",
              "regional/local",
              "especializado",
              "nacional",
              "internacional amplo",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Confiança
          <select
            value={value.confidence}
            onChange={(event) =>
              set({
                ...value,
                confidence: event.target
                  .value as Festival["relevance"]["confidence"],
              })
            }
          >
            {["pendente", "baixa", "média", "alta"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Limite inferior da incerteza
          <input
            type="number"
            min="0"
            max="100"
            value={value.uncertaintyMin ?? ""}
            onChange={(event) =>
              set({
                ...value,
                uncertaintyMin:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          Limite superior da incerteza
          <input
            type="number"
            min="0"
            max="100"
            value={value.uncertaintyMax ?? ""}
            onChange={(event) =>
              set({
                ...value,
                uncertaintyMax:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          Avaliada em
          <input
            type="date"
            value={value.assessedAt}
            onChange={(event) =>
              set({ ...value, assessedAt: event.target.value })
            }
          />
        </label>
        <label className="field-wide">
          Justificativa geral
          <textarea
            rows={3}
            value={value.rationale}
            onChange={(event) =>
              set({ ...value, rationale: event.target.value })
            }
          />
        </label>
      </div>
      {relevanceDimensions.map((dimension) => {
        const item = value.dimensions[dimension.key];
        return (
          <div className="repeater" key={dimension.key}>
            <strong>
              {dimension.label} (0–{dimension.max})
            </strong>
            <label>
              Pontos
              <input
                type="number"
                min="0"
                max={dimension.max}
                value={item.score ?? ""}
                onChange={(event) =>
                  updateDimension(
                    dimension.key,
                    "score",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              />
            </label>
            <label className="field-wide">
              Evidência
              <input
                value={item.evidence}
                onChange={(event) =>
                  updateDimension(dimension.key, "evidence", event.target.value)
                }
              />
            </label>
            <label className="field-wide">
              IDs das fontes
              <input
                value={item.sourceIds.join(", ")}
                onChange={(event) =>
                  updateDimension(
                    dimension.key,
                    "sourceIds",
                    event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
          </div>
        );
      })}
    </section>
  );
}

function DurationRuleEditor({
  value,
  set,
}: {
  value: Call;
  set: (key: keyof Call, value: unknown) => void;
}) {
  return (
    <section className="form-group">
      <h3>Precisão da duração</h3>
      <div className="form-grid">
        <label>
          Mínimo exato (segundos)
          <input
            type="number"
            min="0"
            value={value.minSeconds ?? ""}
            onChange={(event) =>
              set(
                "minSeconds",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
        </label>
        <label>
          Máximo exato (segundos)
          <input
            type="number"
            min="0"
            value={value.maxSeconds ?? ""}
            onChange={(event) =>
              set(
                "maxSeconds",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={value.minInclusive}
            onChange={(event) => set("minInclusive", event.target.checked)}
          />
          Limite mínimo inclusivo
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={value.maxInclusive}
            onChange={(event) => set("maxInclusive", event.target.checked)}
          />
          Limite máximo inclusivo
        </label>
        <label>
          Créditos entram na duração?
          <select
            value={
              value.creditsIncluded === null
                ? "desconhecido"
                : value.creditsIncluded
                  ? "sim"
                  : "não"
            }
            onChange={(event) =>
              set(
                "creditsIncluded",
                event.target.value === "desconhecido"
                  ? null
                  : event.target.value === "sim",
              )
            }
          >
            <option value="desconhecido">desconhecido</option>
            <option value="sim">sim</option>
            <option value="não">não</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function FilmCirculationEditor({
  value,
  set,
}: {
  value: Film;
  set: (key: keyof Film, value: unknown) => void;
}) {
  const updateOnline = (index: number, key: string, nextValue: unknown) =>
    set(
      "onlineHistory",
      value.onlineHistory.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: nextValue } : item,
      ),
    );
  const updateExhibition = (index: number, key: string, nextValue: unknown) =>
    set(
      "exhibitionHistory",
      value.exhibitionHistory.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: nextValue } : item,
      ),
    );
  const updateMaterial = (index: number, key: string, nextValue: unknown) =>
    set(
      "materials",
      value.materials.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: nextValue } : item,
      ),
    );
  return (
    <>
      <section className="form-group">
        <h3>Histórico online, TV e VOD</h3>
        {value.onlineHistory.map((item, index) => (
          <div className="repeater" key={`${index}-${item.start}`}>
            <label>
              Situação
              <input
                value={item.status}
                onChange={(event) =>
                  updateOnline(index, "status", event.target.value)
                }
              />
            </label>
            <label>
              Início
              <input
                type="date"
                value={item.start}
                onChange={(event) =>
                  updateOnline(index, "start", event.target.value)
                }
              />
            </label>
            <label>
              Fim
              <input
                type="date"
                value={item.end}
                onChange={(event) =>
                  updateOnline(index, "end", event.target.value)
                }
              />
            </label>
            <label>
              Territórios
              <input
                value={item.territories.join(", ")}
                onChange={(event) =>
                  updateOnline(
                    index,
                    "territories",
                    event.target.value
                      .split(",")
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
            <label className="field-wide">
              Observações
              <input
                value={item.notes}
                onChange={(event) =>
                  updateOnline(index, "notes", event.target.value)
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  "onlineHistory",
                  value.onlineHistory.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
            >
              Remover registro online
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("onlineHistory", [
              ...value.onlineHistory,
              { status: "", start: "", end: "", territories: [], notes: "" },
            ])
          }
        >
          + Adicionar histórico online
        </button>
      </section>
      <section className="form-group">
        <h3>Histórico de exibições</h3>
        {value.exhibitionHistory.map((item, index) => (
          <div className="repeater" key={item.id}>
            <label>
              Data
              <input
                type="date"
                value={item.date}
                onChange={(event) =>
                  updateExhibition(index, "date", event.target.value)
                }
              />
            </label>
            <label>
              Evento
              <input
                value={item.event}
                onChange={(event) =>
                  updateExhibition(index, "event", event.target.value)
                }
              />
            </label>
            <label>
              País
              <input
                value={item.country}
                onChange={(event) =>
                  updateExhibition(index, "country", event.target.value)
                }
              />
            </label>
            <label>
              Estado / região
              <input
                value={item.region}
                onChange={(event) =>
                  updateExhibition(index, "region", event.target.value)
                }
              />
            </label>
            <label>
              Cidade
              <input
                value={item.city}
                onChange={(event) =>
                  updateExhibition(index, "city", event.target.value)
                }
              />
            </label>
            <label>
              Acesso
              <select
                value={item.access}
                onChange={(event) =>
                  updateExhibition(index, "access", event.target.value)
                }
              >
                {["não informado", "público", "restrito", "privado"].map(
                  (entry) => (
                    <option key={entry}>{entry}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Modalidade
              <select
                value={item.modality}
                onChange={(event) =>
                  updateExhibition(index, "modality", event.target.value)
                }
              >
                {[
                  "não informado",
                  "presencial",
                  "online",
                  "híbrida",
                  "TV/VOD",
                ].map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={item.announced}
                onChange={(event) =>
                  updateExhibition(index, "announced", event.target.checked)
                }
              />
              Exibição anunciada publicamente
            </label>
            <label className="field-wide">
              Observações
              <input
                value={item.notes}
                onChange={(event) =>
                  updateExhibition(index, "notes", event.target.value)
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  "exhibitionHistory",
                  value.exhibitionHistory.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
            >
              Remover exibição
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("exhibitionHistory", [
              ...value.exhibitionHistory,
              {
                id: uid("exhibition"),
                date: "",
                event: "",
                country: "",
                region: "",
                city: "",
                access: "não informado",
                modality: "não informado",
                announced: false,
                notes: "",
              },
            ])
          }
        >
          + Adicionar exibição
        </button>
      </section>
      <section className="form-group">
        <h3>Materiais do filme</h3>
        {value.materials.map((item, index) => (
          <div className="repeater" key={item.id}>
            <label>
              Tipo
              <input
                value={item.type}
                onChange={(event) =>
                  updateMaterial(index, "type", event.target.value)
                }
              />
            </label>
            <label>
              Versão / idioma
              <input
                value={item.version}
                onChange={(event) =>
                  updateMaterial(index, "version", event.target.value)
                }
              />
            </label>
            <label>
              Situação
              <select
                value={item.status}
                onChange={(event) =>
                  updateMaterial(index, "status", event.target.value)
                }
              >
                <option>faltante</option>
                <option>revisar</option>
                <option>pronto</option>
              </select>
            </label>
            <label className="field-wide">
              URL
              <input
                value={item.url}
                onChange={(event) =>
                  updateMaterial(index, "url", event.target.value)
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={item.private}
                onChange={(event) =>
                  updateMaterial(index, "private", event.target.checked)
                }
              />
              Material privado
            </label>
            <label className="field-wide">
              Observações
              <input
                value={item.notes}
                onChange={(event) =>
                  updateMaterial(index, "notes", event.target.value)
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  "materials",
                  value.materials.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remover material
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("materials", [
              ...value.materials,
              {
                id: uid("material"),
                type: "",
                version: "",
                url: "",
                private: true,
                status: "faltante",
                notes: "",
              },
            ])
          }
        >
          + Adicionar material
        </button>
      </section>
    </>
  );
}

function SubmissionTrackingEditor({
  value,
  set,
}: {
  value: Submission;
  set: (key: keyof Submission, value: unknown) => void;
}) {
  const updateList = <
    K extends "checklist" | "tasks" | "screenings" | "awards",
  >(
    key: K,
    index: number,
    field: string,
    nextValue: unknown,
  ) =>
    set(
      key,
      value[key].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: nextValue } : item,
      ),
    );
  return (
    <>
      <section className="form-group">
        <h3>Checklist da inscrição</h3>
        {value.checklist.map((item, index) => (
          <div className="repeater" key={`${index}-${item.item}`}>
            <label className="field-wide">
              Item
              <input
                value={item.item}
                onChange={(event) =>
                  updateList("checklist", index, "item", event.target.value)
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={item.required}
                onChange={(event) =>
                  updateList(
                    "checklist",
                    index,
                    "required",
                    event.target.checked,
                  )
                }
              />
              Obrigatório
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(event) =>
                  updateList("checklist", index, "done", event.target.checked)
                }
              />
              Concluído
            </label>
            <label className="field-wide">
              Observações
              <input
                value={item.notes}
                onChange={(event) =>
                  updateList("checklist", index, "notes", event.target.value)
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  "checklist",
                  value.checklist.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remover item
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("checklist", [
              ...value.checklist,
              { item: "", required: true, done: false, notes: "" },
            ])
          }
        >
          + Adicionar item
        </button>
      </section>
      <section className="form-group">
        <h3>Tarefas e alertas</h3>
        {value.tasks.map((item, index) => (
          <div className="repeater" key={item.id}>
            <label className="field-wide">
              Tarefa
              <input
                value={item.title}
                onChange={(event) =>
                  updateList("tasks", index, "title", event.target.value)
                }
              />
            </label>
            <label>
              Prazo
              <input
                type="date"
                value={item.due}
                onChange={(event) =>
                  updateList("tasks", index, "due", event.target.value)
                }
              />
            </label>
            <label>
              Tipo
              <input
                value={item.kind}
                onChange={(event) =>
                  updateList("tasks", index, "kind", event.target.value)
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(event) =>
                  updateList("tasks", index, "done", event.target.checked)
                }
              />
              Concluída
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  "tasks",
                  value.tasks.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remover tarefa
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("tasks", [
              ...value.tasks,
              { id: uid("task"), title: "", due: "", done: false, kind: "" },
            ])
          }
        >
          + Adicionar tarefa
        </button>
      </section>
      <section className="form-group">
        <h3>Sessões e prêmios</h3>
        {value.screenings.map((item, index) => (
          <div className="repeater" key={item.id}>
            <strong>Sessão</strong>
            <label>
              Data
              <input
                type="date"
                value={item.date}
                onChange={(event) =>
                  updateList("screenings", index, "date", event.target.value)
                }
              />
            </label>
            <label>
              Local
              <input
                value={item.place}
                onChange={(event) =>
                  updateList("screenings", index, "place", event.target.value)
                }
              />
            </label>
            <label>
              Modalidade
              <input
                value={item.modality}
                onChange={(event) =>
                  updateList(
                    "screenings",
                    index,
                    "modality",
                    event.target.value,
                  )
                }
              />
            </label>
            <label className="field-wide">
              Observações
              <input
                value={item.notes}
                onChange={(event) =>
                  updateList("screenings", index, "notes", event.target.value)
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  "screenings",
                  value.screenings.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
            >
              Remover sessão
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("screenings", [
              ...value.screenings,
              {
                id: uid("screening"),
                date: "",
                place: "",
                modality: "",
                notes: "",
              },
            ])
          }
        >
          + Adicionar sessão
        </button>
        {value.awards.map((item, index) => (
          <div className="repeater" key={item.id}>
            <strong>Prêmio</strong>
            <label>
              Título
              <input
                value={item.title}
                onChange={(event) =>
                  updateList("awards", index, "title", event.target.value)
                }
              />
            </label>
            <label>
              Data
              <input
                type="date"
                value={item.date}
                onChange={(event) =>
                  updateList("awards", index, "date", event.target.value)
                }
              />
            </label>
            <label className="field-wide">
              Observações
              <input
                value={item.notes}
                onChange={(event) =>
                  updateList("awards", index, "notes", event.target.value)
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                set(
                  "awards",
                  value.awards.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remover prêmio
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("awards", [
              ...value.awards,
              { id: uid("award"), title: "", date: "", notes: "" },
            ])
          }
        >
          + Adicionar prêmio
        </button>
      </section>
    </>
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
          <label>
            Rótulo original
            <input
              value={d.originalLabel}
              onChange={(e) => update(i, "originalLabel", e.target.value)}
            />
          </label>
          <label>
            ID da fonte
            <input
              value={d.sourceId}
              onChange={(e) => update(i, "sourceId", e.target.value)}
            />
          </label>
          <label>
            Substitui o prazo
            <input
              value={d.supersedes}
              onChange={(e) => update(i, "supersedes", e.target.value)}
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
              originalLabel: "prazo final",
              sourceId: "",
              supersedes: "",
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
          <label>
            Aplica-se a
            <input
              value={d.appliesTo.join(", ")}
              onChange={(e) =>
                update(
                  i,
                  "appliesTo",
                  e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          <label>
            Taxa da plataforma
            <input
              type="number"
              min="0"
              step="0.01"
              value={d.platformAmount ?? ""}
              onChange={(e) =>
                update(
                  i,
                  "platformAmount",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </label>
          <label>
            ID da fonte
            <input
              value={d.sourceId}
              onChange={(e) => update(i, "sourceId", e.target.value)}
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
              appliesTo: [],
              platformAmount: null,
              sourceId: "",
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
            Título da fonte
            <input
              value={s.title}
              onChange={(e) => update(i, "title", e.target.value)}
            />
          </label>
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
            Acessado em
            <input
              type="date"
              value={s.accessedAt}
              onChange={(e) => update(i, "accessedAt", e.target.value)}
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
          <label>
            Estado da evidência
            <select
              value={s.evidenceState}
              onChange={(e) => update(i, "evidenceState", e.target.value)}
            >
              {[
                "pendente",
                "confirmado na edição atual",
                "confirmado em edição anterior",
                "estimativa histórica",
                "informação conflitante",
                "não localizado",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Edição / chamada
            <input
              value={s.editionLabel}
              onChange={(e) => update(i, "editionLabel", e.target.value)}
            />
          </label>
          <label>
            Seção / página
            <input
              value={s.section}
              onChange={(e) => update(i, "section", e.target.value)}
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
              id: uid("source"),
              url: "",
              title: "",
              type: "oficial",
              checkedAt: "",
              accessedAt: "",
              confidence: "não verificado",
              evidenceState: "pendente",
              editionLabel: "",
              section: "",
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
