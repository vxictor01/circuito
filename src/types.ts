export const SCHEMA_VERSION = 3 as const;
export const FORMATS = ['curta','média','longa','série','experimental','outro'] as const;
export const GENRES = ['documentário','ficção','animação','experimental','híbrido','ensaio','fantástico','horror','infantil','LGBTQIA+','cinema negro','indígena','socioambiental','universitário','outros'] as const;
export const SUBMISSION_STATUSES = ['pesquisando','planejado','aguardando abertura','aberto','inscrito','aguardando resultado','selecionado','não selecionado','semifinalista','finalista','premiado','inelegível','retirado'] as const;
export const PREMIERES = ['nenhuma','mundial','internacional','continental','nacional','estadual','municipal','preferência','não confirmado'] as const;
export type Format = typeof FORMATS[number];
export type Genre = typeof GENRES[number];
export type Answer = 'sim' | 'não' | 'não confirmado' | 'não se aplica';
export type Confidence = 'confirmado' | 'parcial' | 'edição anterior' | 'não verificado';
export type Premiere = typeof PREMIERES[number];
export type Online = 'permitido' | 'proibido' | 'restrito' | 'não confirmado';
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];
export type Entity = Festival | Edition | Call | Film | Submission;
export type Table = 'festivals' | 'editions' | 'calls' | 'films' | 'submissions';
export interface Source { url: string; type: 'oficial' | 'plataforma de inscrição' | 'fonte secundária' | 'estimativa' | 'não verificado'; checkedAt: string; confidence: Confidence; note: string; fields: string[] }
export interface Legacy { [key: string]: unknown }
export interface Festival {
  id: string; name: string; internationalName: string; acronym: string; aliases: string[];
  country: string; region: string; city: string; website: string; instagram: string; contact: string;
  organizer: string; platforms: string[]; description: string; genres: Genre[]; tags: string[];
  scale: string; frequency: string; activity: 'ativo' | 'atividade não confirmada' | 'inativo';
  favorite: boolean; priority: 'alta' | 'média' | 'baixa' | 'sem prioridade'; personalNotes: string;
  sources: Source[]; legacy?: Legacy;
}
export interface Edition {
  id: string; festivalId: string; year: number; number: string; start: string; end: string;
  opening: string; closing: string; resultDate: string; status: 'planejada' | 'realizada' | 'não confirmado';
  rulesUrl: string; checkedAt: string; confidence: Confidence; notes: string; sources: Source[]; legacy?: Legacy;
}
export interface Deadline { kind: 'opening' | 'early' | 'regular' | 'late' | 'extended' | 'final'; date: string; time: string; timezone: string; confirmed: boolean }
export interface Fee { amount: number | null; currency: string; free: Answer; deadlineKind: string; discount: string; waiver: string; notes: string }
export interface Call {
  id: string; editionId: string; name: string; formats: Format[]; genres: Genre[]; genresConfirmed: boolean;
  minMinutes: number | null; maxMinutes: number | null; minYear: number | null; maxYear: number | null;
  pf: Answer; pj: Answer; premiere: Premiere; online: Online; countries: string[]; regions: string[];
  territoriesConfirmed: boolean; restrictions: string; resubmission: Answer; platform: string;
  opening: string; deadlines: Deadline[]; fees: Fee[]; rulesUrl: string; checkedAt: string;
  confidence: Confidence; notes: string; sources: Source[]; legacy?: Legacy;
}
export interface Film {
  id: string; title: string; internationalTitle: string; year: number | null; minutes: number | null;
  format: Format | ''; genres: Genre[]; country: string; region: string; city: string; coproduction: string[];
  language: string; subtitles: string[]; director: string; producers: string; company: string;
  completionDate: string; premiereDate: string; premiereCountry: string; premiereRegion: string; premiereCity: string;
  worldPremiereAvailable: Answer; online: Online; cpb: string; synopsis: string;
  links: { label: string; url: string; private: boolean }[]; notes: string; legacy?: Legacy;
}
export interface Submission {
  id: string; filmId: string; festivalId: string; editionId: string; callId: string;
  platform: string; date: string; deadline: string; fee: number | null; currency: string; code: string;
  status: SubmissionStatus; result: string; resultDate: string; award: string; notes: string; legacy?: Legacy;
}
export interface Settings { name: string; timezone: string; staleDays: number; festivalView: 'table' | 'cards'; lastBackup: string; catalogVersion: string; pageSize: number }
export interface ImportReport {
  total: number; imported: number; merged: number; convertedFields: string[]; ambiguous: string[];
  preserved: string[]; errors: string[]; removed: { id: string; name: string; reason: string }[];
}
export interface Database {
  schemaVersion: typeof SCHEMA_VERSION; festivals: Festival[]; editions: Edition[]; calls: Call[];
  films: Film[]; submissions: Submission[]; settings: Settings;
  archive: { excludedFestivals: Legacy[]; importReports: ImportReport[]; legacyRoot?: Legacy };
}
export interface Backup extends Database { app: 'Circuito'; exportedAt: string }
