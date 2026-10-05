import type { Call, Film } from "../types";

export interface RuleResult {
  rule: string;
  state: "ok" | "conflict" | "unknown";
  detail: string;
  sourceIds: string[];
}

const sourcesFor = (call: Call, fields: string[]) =>
  call.sources.filter(
    (source) =>
      source.evidenceState === "confirmado na edição atual" &&
      fields.some((field) => source.fields.includes(field)),
  );

const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}min${String(seconds % 60).padStart(2, "0")}s`;

export function eligibility(film: Film, call: Call) {
  const rules: RuleResult[] = [];
  const add = (
    rule: string,
    state: RuleResult["state"],
    detail: string,
    fields: string[] = [],
  ) =>
    rules.push({
      rule,
      state,
      detail,
      sourceIds: sourcesFor(call, fields).map((source) => source.id),
    });
  const verified = (fields: string[]) =>
    call.confidence === "confirmado" || sourcesFor(call, fields).length > 0;

  add(
    "Edição e fontes",
    call.confidence === "confirmado" ||
      call.sources.some(
        (source) => source.evidenceState === "confirmado na edição atual",
      )
      ? "ok"
      : "unknown",
    call.confidence === "confirmado"
      ? "Regras verificadas para esta chamada e edição."
      : "A chamada contém regras antigas, parciais ou ainda não verificadas.",
  );

  const formatVerified = verified(["formats"]);
  add(
    "Formato por duração",
    !film.format || !call.formats.length || !formatVerified
      ? "unknown"
      : call.formats.includes(film.format)
        ? "ok"
        : "conflict",
    `${film.format || "Filme sem formato"} · chamada: ${call.formats.join(", ") || "não confirmado"}`,
    ["formats"],
  );

  const filmSeconds =
    film.durationSeconds ??
    (film.minutes === null ? null : Math.round(film.minutes * 60));
  const minSeconds =
    call.minSeconds ??
    (call.minMinutes === null ? null : Math.round(call.minMinutes * 60));
  const maxSeconds =
    call.maxSeconds ??
    (call.maxMinutes === null ? null : Math.round(call.maxMinutes * 60));
  if (
    filmSeconds === null ||
    maxSeconds === null ||
    !verified(["duration", "minMinutes", "maxMinutes"])
  )
    add(
      "Duração precisa",
      "unknown",
      "Falta a duração em segundos do filme ou um limite verificado da chamada.",
      ["duration", "minMinutes", "maxMinutes"],
    );
  else {
    const minOk =
      minSeconds === null ||
      (call.minInclusive
        ? filmSeconds >= minSeconds
        : filmSeconds > minSeconds);
    const maxOk = call.maxInclusive
      ? filmSeconds <= maxSeconds
      : filmSeconds < maxSeconds;
    add(
      "Duração precisa",
      minOk && maxOk ? "ok" : "conflict",
      `${duration(filmSeconds)} · limite ${minSeconds === null ? "sem mínimo" : duration(minSeconds)}–${duration(maxSeconds)}${call.maxInclusive ? " inclusive" : " exclusivo"}${call.creditsIncluded === null ? " · créditos não esclarecidos" : call.creditsIncluded ? " · créditos incluídos" : " · créditos excluídos"}`,
      ["duration", "minMinutes", "maxMinutes"],
    );
  }

  const filmYear = film.completionDate
    ? Number(film.completionDate.slice(0, 4))
    : film.year;
  if (
    filmYear === null ||
    call.minYear === null ||
    call.maxYear === null ||
    !verified(["minYear", "maxYear", "productionYear"])
  )
    add(
      "Produção/conclusão",
      "unknown",
      "A data do filme ou a faixa de produção da chamada precisa ser confirmada.",
      ["minYear", "maxYear", "productionYear"],
    );
  else
    add(
      "Produção/conclusão",
      filmYear >= call.minYear && filmYear <= call.maxYear ? "ok" : "conflict",
      `${filmYear} · chamada: ${call.minYear}–${call.maxYear}`,
      ["minYear", "maxYear", "productionYear"],
    );

  const filmLanguages = film.languages.length ? film.languages : film.genres;
  const callLanguages = call.languages.length ? call.languages : call.genres;
  add(
    "Linguagem",
    !filmLanguages.length ||
      !callLanguages.length ||
      !call.genresConfirmed ||
      !verified(["languages", "genres"])
      ? "unknown"
      : filmLanguages.some((language) =>
            callLanguages.includes(language as never),
          )
        ? "ok"
        : "conflict",
    `Filme: ${filmLanguages.join(", ") || "não informado"} · chamada: ${callLanguages.join(", ") || "não confirmado"}`,
    ["languages", "genres"],
  );

  const eligibleCountries = [film.country, ...film.coproduction].filter(
    Boolean,
  );
  if (
    !call.territoriesConfirmed ||
    !film.country ||
    !verified(["countries", "regions", "territoriesConfirmed"])
  )
    add(
      "Território elegível",
      "unknown",
      "A origem/coprodução do filme ou a territorialidade da chamada não está confirmada.",
      ["countries", "regions", "territoriesConfirmed"],
    );
  else {
    const countryOk =
      !call.countries.length ||
      call.countries.some((country) =>
        eligibleCountries.some(
          (candidate) => country.toLowerCase() === candidate.toLowerCase(),
        ),
      );
    const regionOk =
      !call.regions.length ||
      (!!film.region && call.regions.includes(film.region));
    add(
      "Território elegível",
      call.regions.length && !film.region
        ? "unknown"
        : countryOk && regionOk
          ? "ok"
          : "conflict",
      `${film.country}${film.region ? ` / ${film.region}` : ""} · chamada: ${[...call.countries, ...call.regions].join(", ") || "sem restrição confirmada"}`,
      ["countries", "regions", "territoriesConfirmed"],
    );
  }

  const premiereVerified = verified(["premiere"]);
  const premiereRequirement =
    call.premiereRequirement !== "desconhecida"
      ? call.premiereRequirement
      : call.confidence === "confirmado" && call.premiere === "nenhuma"
        ? "sem exigência confirmada"
        : call.confidence === "confirmado" && call.premiere === "preferência"
          ? "preferencial"
          : call.confidence === "confirmado" &&
              call.premiere !== "não confirmado"
            ? "obrigatória"
            : "desconhecida";
  const heldExhibitions = film.exhibitionHistory.filter(
    (exhibition) => !exhibition.announced,
  );
  if (premiereRequirement === "desconhecida" || !premiereVerified)
    add(
      "Estreia",
      "unknown",
      "A exigência de estreia desta chamada não está verificada.",
      ["premiere"],
    );
  else if (
    premiereRequirement === "sem exigência confirmada" ||
    premiereRequirement === "preferencial"
  )
    add(
      "Estreia",
      "ok",
      premiereRequirement === "preferencial"
        ? "A estreia é preferência curatorial, não obrigação objetiva."
        : "A chamada confirma ausência de exigência de estreia.",
      ["premiere"],
    );
  else if (call.premiere === "mundial")
    add(
      "Estreia",
      heldExhibitions.length > 0 || film.worldPremiereAvailable === "não"
        ? "conflict"
        : film.worldPremiereAvailable === "sim"
          ? "ok"
          : "unknown",
      heldExhibitions.length
        ? `Há ${heldExhibitions.length} exibição(ões) realizada(s) no histórico do filme.`
        : "Exige estreia mundial; confira também exibições anunciadas e compromissos assumidos.",
      ["premiere"],
    );
  else {
    const territory = call.premiereTerritory.trim();
    const used = territory
      ? heldExhibitions.some((exhibition) =>
          [exhibition.country, exhibition.region, exhibition.city]
            .map((value) => value.toLowerCase())
            .includes(territory.toLowerCase()),
        )
      : false;
    add(
      "Estreia",
      used ? "conflict" : "unknown",
      territory
        ? `${call.premiere} em ${territory}; ausência no histórico não basta para confirmar disponibilidade.`
        : `${call.premiere}; o território e o histórico precisam de revisão.`,
      ["premiere"],
    );
  }

  const onlineVerified = verified(["online"]);
  const publicOnline = [
    "publicação pública atual",
    "publicação pública anterior",
    "TV/VOD",
  ].includes(film.onlineStatus);
  if (call.online === "não confirmado" || !onlineVerified)
    add(
      "Histórico online",
      "unknown",
      "A regra da chamada sobre internet/TV/VOD não está confirmada.",
      ["online"],
    );
  else if (call.online === "permitido")
    add(
      "Histórico online",
      "ok",
      "A chamada permite o histórico online informado; confira condições territoriais.",
      ["online"],
    );
  else if (call.online === "proibido")
    add(
      "Histórico online",
      film.onlineStatus === "não informado"
        ? "unknown"
        : publicOnline
          ? "conflict"
          : "ok",
      `Filme: ${film.onlineStatus}. Chamada: publicação online proibida.`,
      ["online"],
    );
  else
    add(
      "Histórico online",
      "unknown",
      `A chamada impõe restrições: ${call.onlineConditions || "condições não detalhadas"}.`,
      ["online"],
    );

  if (call.restrictions)
    add("Outras restrições", "unknown", call.restrictions, ["restrictions"]);

  const status = rules.some((rule) => rule.state === "conflict")
    ? "incompatível"
    : rules.some((rule) => rule.state === "unknown")
      ? "depende de confirmação"
      : "compatível pelas regras verificadas";
  return { status, rules };
}
