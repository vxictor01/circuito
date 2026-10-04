import type {
  Database,
  EvidenceState,
  Legacy,
  Source,
  SubmissionStatus,
} from "../types";
import {
  blankRelevance,
  blankSeasonalEstimate,
  emptyDatabase,
} from "../utils/defaults";
import {
  legacyLocations,
  splitLegacyTaxonomy,
  workTypesFromFormats,
} from "../utils/normalization";

const evidenceState = (confidence: string): EvidenceState =>
  confidence === "confirmado"
    ? "confirmado na edição atual"
    : confidence === "edição anterior"
      ? "confirmado em edição anterior"
      : "pendente";

function sourceDefaults(
  source: Partial<Source>,
  id: string,
  editionLabel = "",
): Source {
  let title = "Fonte sem título informado";
  try {
    title = source.url ? new URL(source.url).hostname : title;
  } catch {
    // A validação de URL segura permanece na camada de apresentação.
  }
  return {
    id: source.id || id,
    url: source.url || "",
    title: source.title || title,
    type: source.type || "não verificado",
    checkedAt: source.checkedAt || "",
    accessedAt: source.accessedAt || source.checkedAt || "",
    confidence: source.confidence || "não verificado",
    evidenceState:
      source.evidenceState ||
      evidenceState(source.confidence || "não verificado"),
    editionLabel: source.editionLabel || editionLabel,
    section: source.section || "",
    note: source.note || "",
    fields: Array.isArray(source.fields) ? source.fields : [],
  };
}

const seasonality = (
  dates: { date: string; year: number }[],
  label: string,
) => {
  const valid = dates.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
  const years = [...new Set(valid.map((item) => item.year))].sort();
  const months = [
    ...new Set(valid.map((item) => Number(item.date.slice(5, 7)))),
  ].sort((a, b) => a - b);
  return {
    months,
    evidenceYears: years,
    confidence:
      years.length >= 3
        ? ("média" as const)
        : years.length
          ? ("baixa" as const)
          : ("desconhecida" as const),
    note: years.length
      ? `${label} derivada de ${years.length} edição(ões) histórica(s); não equivale a data atual confirmada.`
      : "Sem histórico estruturado suficiente.",
  };
};

function submissionStates(status: SubmissionStatus) {
  const planning = [
    "pesquisando",
    "planejado",
    "aguardando abertura",
    "aberto",
  ].includes(status);
  const selected = [
    "selecionado",
    "semifinalista",
    "finalista",
    "premiado",
  ].includes(status);
  return {
    planningStatus:
      status === "pesquisando"
        ? ("pesquisando" as const)
        : status === "aguardando abertura"
          ? ("aguardando abertura" as const)
          : status === "inelegível"
            ? ("fora do plano" as const)
            : planning
              ? ("priorizado" as const)
              : ("preparando" as const),
    sendStatus:
      status === "retirado"
        ? ("retirado" as const)
        : planning
          ? ("não enviado" as const)
          : ["inscrito", "aguardando resultado"].includes(status)
            ? ("aguardando decisão" as const)
            : ("enviado" as const),
    resultStatus:
      status === "não selecionado"
        ? ("não selecionado" as const)
        : selected
          ? ("selecionado" as const)
          : ("pendente" as const),
  };
}

export function migrateV3ToV4(input: unknown): Database {
  const raw = structuredClone(input) as Database & Legacy;
  const defaults = emptyDatabase();
  raw.schemaVersion = 4;
  raw.settings = {
    ...defaults.settings,
    ...(raw.settings || {}),
    festivalColumns:
      raw.settings?.festivalColumns || defaults.settings.festivalColumns,
    savedFestivalViews: raw.settings?.savedFestivalViews || [],
  };
  raw.archive = {
    ...defaults.archive,
    ...(raw.archive || {}),
    excludedFestivals: raw.archive?.excludedFestivals || [],
    importReports: raw.archive?.importReports || [],
    editHistory: raw.archive?.editHistory || [],
    catalogUpdates: raw.archive?.catalogUpdates || [],
  };

  raw.editions = raw.editions.map((edition) => ({
    ...edition,
    sources: (edition.sources || []).map((source, index) =>
      sourceDefaults(
        source,
        `${edition.id}-source-${index + 1}`,
        String(edition.year),
      ),
    ),
  }));

  raw.calls = raw.calls.map((call) => {
    const taxonomy = splitLegacyTaxonomy(call.genres || []);
    const edition = raw.editions.find((item) => item.id === call.editionId);
    return {
      ...call,
      workTypes: call.workTypes || workTypesFromFormats(call.formats || []),
      languages: call.languages || taxonomy.languages,
      approaches: call.approaches || taxonomy.approaches,
      contentGenres: call.contentGenres || taxonomy.contentGenres,
      themes: call.themes || taxonomy.themes,
      audiences: call.audiences || taxonomy.audiences,
      participationConditions:
        call.participationConditions || taxonomy.participationConditions,
      submissionMode: call.submissionMode || "não confirmado",
      selectionType: call.selectionType || "não confirmado",
      minSeconds:
        call.minSeconds ??
        (call.minMinutes === null ? null : Math.round(call.minMinutes * 60)),
      maxSeconds:
        call.maxSeconds ??
        (call.maxMinutes === null ? null : Math.round(call.maxMinutes * 60)),
      minInclusive: call.minInclusive ?? true,
      maxInclusive: call.maxInclusive ?? true,
      creditsIncluded: call.creditsIncluded ?? null,
      premiereRequirement:
        call.premiereRequirement ||
        (call.premiere === "preferência"
          ? "preferencial"
          : call.premiere === "nenhuma" && call.confidence === "confirmado"
            ? "sem exigência confirmada"
            : call.premiere !== "não confirmado" &&
                call.confidence === "confirmado"
              ? "obrigatória"
              : "desconhecida"),
      premiereTerritory: call.premiereTerritory || "",
      premiereConditions: call.premiereConditions || "",
      onlineConditions: call.onlineConditions || "",
      deadlines: (call.deadlines || []).map((deadline, index) => ({
        ...deadline,
        originalLabel: deadline.originalLabel || deadline.kind,
        sourceId: deadline.sourceId || "",
        supersedes: deadline.supersedes || "",
        id:
          (deadline as unknown as { id?: string }).id ||
          `${call.id}-deadline-${index + 1}`,
      })),
      fees: (call.fees || []).map((fee) => ({
        ...fee,
        appliesTo: fee.appliesTo || [],
        platformAmount: fee.platformAmount ?? null,
        sourceId: fee.sourceId || "",
      })),
      sources: (call.sources || []).map((source, index) =>
        sourceDefaults(
          source,
          `${call.id}-source-${index + 1}`,
          edition ? String(edition.year) : "",
        ),
      ),
    };
  });

  raw.festivals = raw.festivals.map((festival) => {
    const sources = (festival.sources || []).map((source, index) =>
      sourceDefaults(source, `${festival.id}-source-${index + 1}`),
    );
    const taxonomy = splitLegacyTaxonomy(festival.genres || []);
    const editions = raw.editions.filter(
      (edition) => edition.festivalId === festival.id,
    );
    const calls = raw.calls.filter((call) =>
      editions.some((edition) => edition.id === call.editionId),
    );
    const sourceIds = sources.map((source) => source.id);
    const coverageStatus = calls.some(
      (call) => call.confidence === "confirmado",
    )
      ? ("confirmado na edição atual" as const)
      : calls.some((call) => call.confidence === "edição anterior")
        ? ("confirmado em edição anterior" as const)
        : ("pendente" as const);
    const researchCoverage =
      festival.researchCoverage ||
      Object.fromEntries(
        [
          "localização",
          "atividade",
          "categorias",
          "duração",
          "elegibilidade territorial",
          "produção/conclusão",
          "estreia",
          "exibição online",
          "pessoa autorizada a inscrever",
          "taxas",
          "abertura",
          "encerramento",
          "realização",
          "relevância",
        ].map((field) => [
          field,
          {
            status:
              field === "localização" &&
              sources.some((source) => source.fields.includes("city"))
                ? evidenceState(
                    sources.find((source) => source.fields.includes("city"))
                      ?.confidence || "não verificado",
                  )
                : field === "relevância"
                  ? "pendente"
                  : coverageStatus,
            note:
              field === "relevância"
                ? "Rubrica ainda não aplicada com evidências suficientes."
                : "Cobertura migrada; revisar a fonte e a edição antes de confirmar.",
            sourceIds,
          },
        ]),
      );
    const next = {
      ...festival,
      sources,
      workTypes: festival.workTypes || (["filme"] as const),
      languages: festival.languages || taxonomy.languages,
      approaches: festival.approaches || taxonomy.approaches,
      contentGenres: festival.contentGenres || taxonomy.contentGenres,
      themes: festival.themes || taxonomy.themes,
      audiences: festival.audiences || taxonomy.audiences,
      participationConditions:
        festival.participationConditions || taxonomy.participationConditions,
      traveling:
        festival.traveling ??
        /itinerante|circuito/i.test(`${festival.city} ${festival.region}`),
      onlineOnly: festival.onlineOnly ?? false,
      basePriority: festival.basePriority || "sem prioridade",
      seasonality: festival.seasonality || {
        opening: seasonality(
          [
            ...editions.map((edition) => ({
              date: edition.opening,
              year: edition.year,
            })),
            ...calls.map((call) => ({
              date: call.opening,
              year:
                editions.find((edition) => edition.id === call.editionId)
                  ?.year || 0,
            })),
          ],
          "Abertura provável",
        ),
        event: seasonality(
          editions.map((edition) => ({
            date: edition.start,
            year: edition.year,
          })),
          "Realização habitual",
        ),
      },
      relevance: festival.relevance || blankRelevance(),
      researchCoverage,
    };
    return {
      ...next,
      locations:
        festival.locations?.length > 0
          ? festival.locations
          : legacyLocations(next as typeof festival),
    };
  });

  raw.films = raw.films.map((film) => {
    const taxonomy = splitLegacyTaxonomy(film.genres || []);
    return {
      ...film,
      durationSeconds:
        film.durationSeconds ??
        (film.minutes === null ? null : Math.round(film.minutes * 60)),
      workType: film.workType || "filme",
      languages: film.languages || taxonomy.languages,
      approaches: film.approaches || taxonomy.approaches,
      contentGenres: film.contentGenres || taxonomy.contentGenres,
      themes: film.themes || taxonomy.themes,
      audiences: film.audiences || taxonomy.audiences,
      participationConditions:
        film.participationConditions || taxonomy.participationConditions,
      onlineStatus: film.onlineStatus || "não informado",
      onlineHistory: film.onlineHistory || [],
      exhibitionHistory: film.exhibitionHistory || [],
      materials: film.materials || [],
    };
  });

  raw.submissions = raw.submissions.map((submission) => ({
    ...submission,
    ...submissionStates(submission.status),
    planningStatus:
      submission.planningStatus ||
      submissionStates(submission.status).planningStatus,
    sendStatus:
      submission.sendStatus || submissionStates(submission.status).sendStatus,
    resultStatus:
      submission.resultStatus ||
      submissionStates(submission.status).resultStatus,
    personalPriority: submission.personalPriority || "sem prioridade",
    responsible: submission.responsible || "",
    protocol: submission.protocol || submission.code || "",
    originalFee: submission.originalFee ?? submission.fee ?? null,
    paidBRL: submission.paidBRL ?? null,
    waiverUsed: submission.waiverUsed ?? false,
    expectedDecisionDate: submission.expectedDecisionDate || "",
    nextAction: submission.nextAction || "",
    internalDeadline: submission.internalDeadline || "",
    checklist: submission.checklist || [],
    tasks: submission.tasks || [],
    screenings: submission.screenings || [],
    awards: submission.awards || [],
  }));

  return raw;
}

export function inheritedSeasonality() {
  return { opening: blankSeasonalEstimate(), event: blankSeasonalEstimate() };
}
