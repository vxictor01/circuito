import { type ReactNode } from "react";
import { safeURL } from "../utils/links";
export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
const genreTone: Record<string, string> = {
  documentário: "doc",
  experimental: "experimental",
  "LGBTQIA+": "queer",
  "cinema negro": "black",
  socioambiental: "environment",
  universitário: "student",
  ficção: "fiction",
  indígena: "environment",
  ensaio: "experimental",
  híbrido: "experimental",
  fantástico: "fantasy",
  horror: "fantasy",
};
export function Tags({ tags }: { tags: string[] }) {
  return (
    <span className="tags">
      {tags.map((t) => (
        <Badge key={t} tone={genreTone[t] || "muted"}>
          {t}
        </Badge>
      ))}
    </span>
  );
}
export function ExternalLink({
  url,
  children,
}: {
  url: string;
  children?: ReactNode;
}) {
  const safe = safeURL(url);
  return safe ? (
    <a href={safe} target="_blank" rel="noopener noreferrer">
      {children || "Abrir fonte"} <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <span className="muted">{children || "Sem link confirmado"}</span>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true">
        ↗
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">
          {eyebrow || "CIRCUITO / PESQUISA E CIRCULAÇÃO"}
        </p>
        <h1>{title}</h1>
        {description && <p className="subtitle">{description}</p>}
      </div>
      <div className="actions">{actions}</div>
    </header>
  );
}
export function Stats({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    href?: string;
    detail?: string;
  }[];
}) {
  return (
    <div className="stats">
      {items.map((i) => {
        const content = (
          <>
            <span className="stat-label">{i.label}</span>
            <strong>{i.value}</strong>
            {i.detail && <span className="small muted">{i.detail}</span>}
          </>
        );
        return i.href ? (
          <a className="stat" href={i.href} key={i.label}>
            {content}
          </a>
        ) : (
          <div className="stat" key={i.label}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
const sourceFieldLabels: Record<string, string> = {
  name: "nome",
  country: "país",
  city: "cidade",
  region: "estado / região",
  profile: "perfil",
  organizer: "organização",
  year: "ano da edição",
  number: "número da edição",
  start: "início do festival",
  end: "fim do festival",
  opening: "abertura",
  closing: "encerramento",
  resultDate: "resultado",
  deadlines: "prazos",
  fees: "taxas",
  formats: "formatos",
  genres: "linguagens",
  genresConfirmed: "confirmação das linguagens",
  minMinutes: "duração mínima",
  maxMinutes: "duração máxima",
  minYear: "ano mínimo de produção",
  maxYear: "ano máximo de produção",
  pf: "pessoa física",
  pj: "pessoa jurídica",
  premiere: "estreia",
  online: "exibição online",
  countries: "países elegíveis",
  regions: "regiões elegíveis",
  territoriesConfirmed: "confirmação territorial",
  restrictions: "restrições",
  resubmission: "reinscrição",
  platform: "plataforma de inscrição",
  rulesUrl: "regulamento",
  website: "site",
  instagram: "Instagram",
};
export function SourceList({
  sources,
}: {
  sources: {
    url: string;
    title?: string;
    type: string;
    checkedAt: string;
    accessedAt?: string;
    confidence: string;
    evidenceState?: string;
    editionLabel?: string;
    section?: string;
    note: string;
    fields: string[];
  }[];
}) {
  return (
    <div className="sources">
      {sources.length ? (
        sources.map((s, i) => (
          <div key={i}>
            <ExternalLink url={s.url}>{s.title || s.type}</ExternalLink>
            <Badge
              tone={s.confidence === "confirmado" ? "positive" : "unknown"}
            >
              {s.confidence}
            </Badge>
            <span className="small muted">
              {s.checkedAt
                ? `Conferido em ${s.checkedAt.split("-").reverse().join("/")}`
                : "Sem data de verificação"}
            </span>
            {s.evidenceState && <Badge>{s.evidenceState}</Badge>}
            {(s.editionLabel || s.section) && (
              <span className="small muted">
                {[s.editionLabel, s.section].filter(Boolean).join(" · ")}
              </span>
            )}
            {s.note && <p>{s.note}</p>}
            {s.fields?.length > 0 && (
              <span className="small">
                Campos:{" "}
                {s.fields
                  .map((field) => sourceFieldLabels[field] || field)
                  .join(", ")}
              </span>
            )}
          </div>
        ))
      ) : (
        <p className="muted">Nenhuma fonte cadastrada.</p>
      )}
    </div>
  );
}
