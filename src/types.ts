export const SCHEMA_VERSION = 4 as const;
export const FORMATS = [
  "curta",
  "média",
  "longa",
  "série",
  "experimental",
  "outro",
] as const;
export const WORK_TYPES = [
  "filme",
  "série/episódio",
  "videoclipe",
  "instalação",
  "outro",
] as const;
export const LANGUAGES = [
  "documentário",
  "ficção",
  "animação",
  "experimental",
  "híbrido",
] as const;
export const APPROACHES = ["ensaio"] as const;
export const CONTENT_GENRES = [
  "fantástico",
  "horror",
  "comédia",
  "drama",
] as const;
export const THEMES = [
  "LGBTQIA+",
  "cinema negro",
  "indígena",
  "socioambiental",
  "direitos humanos",
  "música",
  "arquitetura",
] as const;
export const AUDIENCES = ["infantil", "juvenil", "geral"] as const;
export const PARTICIPATION_CONDITIONS = [
  "universitário",
  "escolar",
  "primeira obra",
  "direção estreante",
] as const;
export const GENRES = [
  "documentário",
  "ficção",
  "animação",
  "experimental",
  "híbrido",
  "ensaio",
  "fantástico",
  "horror",
  "infantil",
  "LGBTQIA+",
  "cinema negro",
  "indígena",
  "socioambiental",
  "universitário",
  "outros",
] as const;
export const SUBMISSION_STATUSES = [
  "pesquisando",
  "planejado",
  "aguardando abertura",
  "aberto",
  "inscrito",
  "aguardando resultado",
  "selecionado",
  "não selecionado",
  "semifinalista",
  "finalista",
  "premiado",
  "inelegível",
  "retirado",
] as const;
export const PREMIERES = [
  "nenhuma",
  "mundial",
  "internacional",
  "continental",
  "nacional",
  "estadual",
  "municipal",
  "preferência",
  "não confirmado",
] as const;
export type Format = (typeof FORMATS)[number];
export type WorkType = (typeof WORK_TYPES)[number];
export type Language = (typeof LANGUAGES)[number];
export type Approach = (typeof APPROACHES)[number];
export type ContentGenre = (typeof CONTENT_GENRES)[number];
export type Theme = (typeof THEMES)[number];
export type Audience = (typeof AUDIENCES)[number];
export type ParticipationCondition = (typeof PARTICIPATION_CONDITIONS)[number];
export type Genre = (typeof GENRES)[number];
export type Answer = "sim" | "não" | "não confirmado" | "não se aplica";
export type Confidence =
  "confirmado" | "parcial" | "edição anterior" | "não verificado";
export type Premiere = (typeof PREMIERES)[number];
export type Online = "permitido" | "proibido" | "restrito" | "não confirmado";
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type Priority =
  "alta" | "média" | "baixa" | "fora do plano" | "sem prioridade";
export type EvidenceState =
  | "confirmado na edição atual"
  | "confirmado em edição anterior"
  | "estimativa histórica"
  | "informação conflitante"
  | "não localizado"
  | "pendente";
export type Entity = Festival | Edition | Call | Film | Submission;
export type Table =
  "festivals" | "editions" | "calls" | "films" | "submissions";
export interface Source {
  id: string;
  url: string;
  title: string;
  type:
    | "oficial"
    | "plataforma de inscrição"
    | "fonte secundária"
    | "estimativa"
    | "não verificado";
  checkedAt: string;
  accessedAt: string;
  confidence: Confidence;
  evidenceState: EvidenceState;
  editionLabel: string;
  section: string;
  note: string;
  fields: string[];
}
export interface Location {
  id: string;
  role: "sede" | "exibição" | "organização";
  countryCode: string;
  countryName: string;
  subdivisionCode: string;
  subdivisionName: string;
  city: string;
  municipalityCode: string;
  district: string;
  confirmed: boolean;
  sourceIds: string[];
}
export interface SeasonalEstimate {
  months: number[];
  evidenceYears: number[];
  confidence: "alta" | "média" | "baixa" | "desconhecida";
  note: string;
}
export interface ResearchCoverage {
  status: EvidenceState;
  note: string;
  sourceIds: string[];
}
export interface RelevanceDimension {
  score: number | null;
  evidence: string;
  sourceIds: string[];
}
export interface RelevanceAssessment {
  status: "avaliada" | "provisória" | "pendente";
  score: number | null;
  uncertaintyMin: number | null;
  uncertaintyMax: number | null;
  band:
    | "muito alta"
    | "alta"
    | "intermediária"
    | "menor alcance documentado"
    | "pendente";
  impact:
    | "internacional amplo"
    | "nacional"
    | "especializado"
    | "regional/local"
    | "comunitário"
    | "pendente";
  confidence: "alta" | "média" | "baixa" | "pendente";
  assessedAt: string;
  rationale: string;
  dimensions: {
    curatorialHistory: RelevanceDimension;
    programmingReach: RelevanceDimension;
    industryOpportunities: RelevanceDimension;
    specializedImportance: RelevanceDimension;
    continuityTransparency: RelevanceDimension;
  };
}
export interface Legacy {
  [key: string]: unknown;
}
export interface Festival {
  id: string;
  name: string;
  internationalName: string;
  acronym: string;
  aliases: string[];
  country: string;
  region: string;
  city: string;
  locations: Location[];
  traveling: boolean;
  onlineOnly: boolean;
  website: string;
  instagram: string;
  contact: string;
  organizer: string;
  platforms: string[];
  description: string;
  genres: Genre[];
  workTypes: WorkType[];
  languages: Language[];
  approaches: Approach[];
  contentGenres: ContentGenre[];
  themes: Theme[];
  audiences: Audience[];
  participationConditions: ParticipationCondition[];
  tags: string[];
  scale: string;
  frequency: string;
  activity: "ativo" | "atividade não confirmada" | "inativo";
  favorite: boolean;
  priority: Priority;
  basePriority: Priority;
  seasonality: {
    opening: SeasonalEstimate;
    event: SeasonalEstimate;
  };
  relevance: RelevanceAssessment;
  researchCoverage: Record<string, ResearchCoverage>;
  personalNotes: string;
  sources: Source[];
  legacy?: Legacy;
}
export interface Edition {
  id: string;
  festivalId: string;
  year: number;
  number: string;
  start: string;
  end: string;
  opening: string;
  closing: string;
  resultDate: string;
  status: "planejada" | "realizada" | "não confirmado";
  rulesUrl: string;
  checkedAt: string;
  confidence: Confidence;
  notes: string;
  sources: Source[];
  legacy?: Legacy;
}
export interface Deadline {
  kind: "opening" | "early" | "regular" | "late" | "extended" | "final";
  date: string;
  time: string;
  timezone: string;
  confirmed: boolean;
  originalLabel: string;
  sourceId: string;
  supersedes: string;
}
export interface Fee {
  amount: number | null;
  currency: string;
  free: Answer;
  deadlineKind: string;
  discount: string;
  waiver: string;
  notes: string;
  appliesTo: string[];
  platformAmount: number | null;
  sourceId: string;
}
export interface Call {
  id: string;
  editionId: string;
  name: string;
  formats: Format[];
  genres: Genre[];
  workTypes: WorkType[];
  languages: Language[];
  approaches: Approach[];
  contentGenres: ContentGenre[];
  themes: Theme[];
  audiences: Audience[];
  participationConditions: ParticipationCondition[];
  submissionMode:
    | "aberta"
    | "convite"
    | "indicação"
    | "curadoria sem chamada"
    | "não confirmado";
  selectionType: "competitiva" | "não competitiva" | "mista" | "não confirmado";
  genresConfirmed: boolean;
  minMinutes: number | null;
  maxMinutes: number | null;
  minSeconds: number | null;
  maxSeconds: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
  creditsIncluded: boolean | null;
  minYear: number | null;
  maxYear: number | null;
  pf: Answer;
  pj: Answer;
  premiere: Premiere;
  premiereRequirement:
    | "obrigatória"
    | "preferencial"
    | "sem exigência confirmada"
    | "desconhecida";
  premiereTerritory: string;
  premiereConditions: string;
  online: Online;
  onlineConditions: string;
  countries: string[];
  regions: string[];
  territoriesConfirmed: boolean;
  restrictions: string;
  resubmission: Answer;
  platform: string;
  opening: string;
  deadlines: Deadline[];
  fees: Fee[];
  rulesUrl: string;
  checkedAt: string;
  confidence: Confidence;
  notes: string;
  sources: Source[];
  legacy?: Legacy;
}
export interface Film {
  id: string;
  title: string;
  internationalTitle: string;
  year: number | null;
  minutes: number | null;
  durationSeconds: number | null;
  format: Format | "";
  genres: Genre[];
  workType: WorkType | "";
  languages: Language[];
  approaches: Approach[];
  contentGenres: ContentGenre[];
  themes: Theme[];
  audiences: Audience[];
  participationConditions: ParticipationCondition[];
  country: string;
  region: string;
  city: string;
  coproduction: string[];
  language: string;
  subtitles: string[];
  director: string;
  producers: string;
  company: string;
  completionDate: string;
  premiereDate: string;
  premiereCountry: string;
  premiereRegion: string;
  premiereCity: string;
  worldPremiereAvailable: Answer;
  online: Online;
  onlineStatus:
    | "nunca publicado"
    | "screener privado"
    | "publicação pública atual"
    | "publicação pública anterior"
    | "sessão online restrita/geobloqueada"
    | "TV/VOD"
    | "não informado";
  onlineHistory: {
    status: string;
    start: string;
    end: string;
    territories: string[];
    notes: string;
  }[];
  exhibitionHistory: {
    id: string;
    date: string;
    event: string;
    country: string;
    region: string;
    city: string;
    access: "público" | "restrito" | "privado" | "não informado";
    modality: "presencial" | "online" | "híbrida" | "TV/VOD" | "não informado";
    announced: boolean;
    notes: string;
  }[];
  materials: {
    id: string;
    type: string;
    version: string;
    url: string;
    private: boolean;
    status: "pronto" | "revisar" | "faltante";
    notes: string;
  }[];
  cpb: string;
  synopsis: string;
  links: { label: string; url: string; private: boolean }[];
  notes: string;
  legacy?: Legacy;
}
export interface Submission {
  id: string;
  filmId: string;
  festivalId: string;
  editionId: string;
  callId: string;
  platform: string;
  date: string;
  deadline: string;
  fee: number | null;
  currency: string;
  code: string;
  status: SubmissionStatus;
  planningStatus:
    | "pesquisando"
    | "priorizado"
    | "aguardando abertura"
    | "preparando"
    | "fora do plano";
  sendStatus: "não enviado" | "enviado" | "aguardando decisão" | "retirado";
  resultStatus:
    | "pendente"
    | "selecionado"
    | "não selecionado"
    | "lista de espera"
    | "outro";
  personalPriority: Priority;
  responsible: string;
  protocol: string;
  originalFee: number | null;
  paidBRL: number | null;
  waiverUsed: boolean;
  expectedDecisionDate: string;
  nextAction: string;
  internalDeadline: string;
  checklist: {
    item: string;
    required: boolean;
    done: boolean;
    notes: string;
  }[];
  tasks: {
    id: string;
    title: string;
    due: string;
    done: boolean;
    kind: string;
  }[];
  screenings: {
    id: string;
    date: string;
    place: string;
    modality: string;
    notes: string;
  }[];
  awards: { id: string; title: string; date: string; notes: string }[];
  result: string;
  resultDate: string;
  award: string;
  notes: string;
  legacy?: Legacy;
}
export interface Settings {
  name: string;
  timezone: string;
  staleDays: number;
  festivalView: "table" | "cards";
  lastBackup: string;
  catalogVersion: string;
  pageSize: number;
  festivalColumns: string[];
  savedFestivalViews: {
    id: string;
    name: string;
    filters: Record<string, string | boolean>;
    sort: string;
    columns: string[];
  }[];
}
export interface ImportReport {
  total: number;
  imported: number;
  merged: number;
  convertedFields: string[];
  ambiguous: string[];
  preserved: string[];
  errors: string[];
  removed: { id: string; name: string; reason: string }[];
}
export interface Database {
  schemaVersion: typeof SCHEMA_VERSION;
  festivals: Festival[];
  editions: Edition[];
  calls: Call[];
  films: Film[];
  submissions: Submission[];
  settings: Settings;
  archive: {
    excludedFestivals: Legacy[];
    importReports: ImportReport[];
    legacyRoot?: Legacy;
    legacyHistory?: Legacy[];
    editHistory?: {
      table: Table;
      entityId: string;
      changedAt: string;
      changedFields: string[];
      before: Legacy;
    }[];
    catalogUpdates: {
      festivalId: string;
      detectedAt: string;
      fields: string[];
      entityType?: "festival" | "edition" | "call";
      entityId?: string;
      incoming?: Legacy;
      resolvedAt?: string;
    }[];
  };
}
export interface Backup extends Database {
  app: "Circuito";
  exportedAt: string;
}
