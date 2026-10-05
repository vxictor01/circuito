import type {
  Approach,
  Audience,
  ContentGenre,
  Festival,
  Genre,
  Language,
  Location,
  ParticipationCondition,
  Theme,
  WorkType,
} from "../types";
import { norm } from "../migrations/legacy";

const COUNTRY_CODES: Record<string, string> = {
  brasil: "BR",
  espanha: "ES",
  "estados unidos": "US",
  portugal: "PT",
  mexico: "MX",
  franca: "FR",
  "reino unido": "GB",
  "paises baixos": "NL",
  alemanha: "DE",
  canada: "CA",
  suica: "CH",
  colombia: "CO",
  chile: "CL",
  tchequia: "CZ",
  belgica: "BE",
  argentina: "AR",
  servia: "RS",
  suecia: "SE",
  finlandia: "FI",
  peru: "PE",
  italia: "IT",
  dinamarca: "DK",
  cuba: "CU",
  austria: "AT",
  polonia: "PL",
  ucrania: "UA",
};

const BRAZIL_REGIONS: Record<string, string> = {
  AC: "Norte",
  AL: "Nordeste",
  AP: "Norte",
  AM: "Norte",
  BA: "Nordeste",
  CE: "Nordeste",
  DF: "Centro-Oeste",
  ES: "Sudeste",
  GO: "Centro-Oeste",
  MA: "Nordeste",
  MT: "Centro-Oeste",
  MS: "Centro-Oeste",
  MG: "Sudeste",
  PA: "Norte",
  PB: "Nordeste",
  PR: "Sul",
  PE: "Nordeste",
  PI: "Nordeste",
  RJ: "Sudeste",
  RN: "Nordeste",
  RS: "Sul",
  RO: "Norte",
  RR: "Norte",
  SC: "Sul",
  SP: "Sudeste",
  SE: "Nordeste",
  TO: "Norte",
};

export const countryCode = (country: string) =>
  COUNTRY_CODES[norm(country)] || "";
export const brazilRegion = (uf: string) =>
  BRAZIL_REGIONS[uf.toUpperCase()] || "";

const split = (value: string) =>
  value
    .split(/\s*(?:\/|;|\|)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

const LOCATION_OVERRIDES: Record<
  string,
  { city: string; subdivision: string; district?: string }[]
> = {
  "festival-062": [
    { city: "Santarém", subdivision: "PA", district: "Alter do Chão" },
  ],
  "festival-075": [
    {
      city: "Santana do Riacho",
      subdivision: "MG",
      district: "Lapinha da Serra",
    },
  ],
};

export function legacyLocations(
  festival: Pick<Festival, "id" | "country" | "region" | "city" | "sources">,
): Location[] {
  const override = LOCATION_OVERRIDES[festival.id];
  const countryName = festival.country.trim();
  const country = countryCode(countryName);
  const sourceIds = festival.sources
    .filter((source) =>
      source.fields.some((field) =>
        ["country", "region", "city"].includes(field),
      ),
    )
    .map((source) => source.id)
    .filter(Boolean);
  const confirmed = festival.sources.some(
    (source) =>
      source.fields.includes("city") &&
      source.confidence !== "não verificado" &&
      source.confidence !== "edição anterior",
  );
  const raw =
    override ||
    (() => {
      const cities = split(festival.city).filter(
        (city) => !/^(nacional|circuito|itinerante|online)$/i.test(city),
      );
      const subdivisions = split(festival.region).filter(
        (region) => !/^(nacional|internacional)$/i.test(region),
      );
      if (!cities.length) return [];
      return cities.map((city, index) => ({
        city,
        subdivision:
          subdivisions.length === cities.length
            ? subdivisions[index]
            : subdivisions[0] || "",
      }));
    })();
  return raw.map((item, index) => ({
    id: `${festival.id}-location-${index + 1}`,
    role: index === 0 ? "sede" : "exibição",
    countryCode: country,
    countryName,
    subdivisionCode:
      country === "BR" && /^[A-Z]{2}$/.test(item.subdivision)
        ? item.subdivision
        : "",
    subdivisionName: item.subdivision,
    city: item.city,
    municipalityCode: "",
    district: item.district || "",
    confirmed,
    sourceIds,
  }));
}

const LANGUAGE_SET = new Set<Language>([
  "documentário",
  "ficção",
  "animação",
  "experimental",
  "híbrido",
]);
const APPROACH_SET = new Set<Approach>(["ensaio"]);
const CONTENT_GENRE_SET = new Set<ContentGenre>(["fantástico", "horror"]);
const THEME_SET = new Set<Theme>([
  "LGBTQIA+",
  "cinema negro",
  "indígena",
  "socioambiental",
]);
const AUDIENCE_SET = new Set<Audience>(["infantil"]);
const CONDITION_SET = new Set<ParticipationCondition>(["universitário"]);

export function splitLegacyTaxonomy(values: Genre[]) {
  return {
    languages: values.filter((value): value is Language =>
      LANGUAGE_SET.has(value as Language),
    ),
    approaches: values.filter((value): value is Approach =>
      APPROACH_SET.has(value as Approach),
    ),
    contentGenres: values.filter((value) =>
      CONTENT_GENRE_SET.has(value as ContentGenre),
    ) as ContentGenre[],
    themes: values.filter((value) => THEME_SET.has(value as Theme)) as Theme[],
    audiences: values.filter((value) =>
      AUDIENCE_SET.has(value as Audience),
    ) as Audience[],
    participationConditions: values.filter((value) =>
      CONDITION_SET.has(value as ParticipationCondition),
    ) as ParticipationCondition[],
  };
}

export function workTypesFromFormats(formats: string[]): WorkType[] {
  return formats.includes("série") ? ["filme", "série/episódio"] : ["filme"];
}

export function displayLocations(
  festival: Pick<Festival, "locations" | "city" | "region" | "country">,
) {
  if (!festival.locations.length)
    return [festival.city, festival.region, festival.country]
      .filter(Boolean)
      .join(" · ");
  return festival.locations
    .map((location) =>
      [
        location.district,
        location.city,
        location.subdivisionCode || location.subdivisionName,
        location.countryName,
      ]
        .filter(Boolean)
        .join(" · "),
    )
    .join(" / ");
}
