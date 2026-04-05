import type {
  FactCoverageId,
  PresentationIntent,
} from "@/lib/presentation-types";

const STOP_WORDS = new Set([
  "для",
  "что",
  "чтобы",
  "если",
  "когда",
  "нужно",
  "надо",
  "сделать",
  "собрать",
  "подготовить",
  "показать",
  "презентацию",
  "презентация",
  "команда",
  "команды",
  "проект",
  "проекта",
  "важно",
  "период",
  "team",
  "show",
  "need",
  "with",
  "from",
  "about",
]);

const TOPIC_WRAPPERS = new Set([
  "сервис",
  "service",
  "команда",
  "team",
  "project",
  "проект",
  "presentation",
  "презентация",
  "презентацию",
  "status",
  "статус",
  "report",
  "отчёт",
  "обзор",
  "initiative",
  "инициатива",
]);

const DIRECTIVE_PREFIX = /^(?:пожалуйста\s+)?(?:собери|сделай|подготовь|покажи(?:те)?|покажем|показываем|нужно|нужен|нужна|нужны|надо|хочу|хотим|давай|сформируй(?:те)?|сформулируй(?:те)?|объясни|разложи|снять|собрать|представь(?:те)?|опиши(?:те)?|презентацию|презентация)\b[\s,:-]*/i;

const GENERIC_TOPIC_LABELS = new Set([
  "рабочая тема",
  "текущий период",
  "нужного адресата",
  "реального разговора",
  "разговор",
  "презентация",
  "проект",
  "команда",
]);

const AUDIENCE_HINTS = /(?:cto|ceo|cfo|cio|coo|vp|head(?: of)?|board|совет|директор|руководител[ьяюе]|менеджер|тимлид|lead|stakeholder|product|engineering|tech|техническ[а-я]*)/i;
const FACT_HINTS = /(?:\d+(?:[.,]\d+)?%?|q[1-4]\b|mvp|пилот|мигр|сниз|работа|работает|убрал|сократ|упёр|застрял|сигнал|факт|подтвержд|доказ|срок|найм|бюдж|ресурс|риск|блокер|охват|выборк|coverage|latency|time|speed|mini-chat|мини-чат|черновик|редактор|пересбор|слайд|тихий\s+старт)/i;
const RISK_HINTS = /(?:риск|риски|блокер|блокеры|упёр|застрял|не хватает|мешает|не подтвержд|не дожм|без ещё|без еще|срок|найм|бюджет|ресурс|приоритет|coverage|latency|speed)/i;
const ACTION_HINTS = /(?:соглас|решен|решить|утверд|подтверд|выделить|обоснов|следующ(?:ий|его)\s+шаг|следующ(?:ий|его)\s+этап|что\s+нужно|какое\s+решение|добить|закрыть)/i;
const EXPLAIN_HINTS = /(?:почему|объясн|разлож|понять|снять\s+вопрос|контекст|структур|breakdown|explain)/i;

export function normalizePrompt(rawPrompt: string) {
  return rawPrompt.replace(/\s+/g, " ").trim();
}

export function normalizeSentence(value: string) {
  const normalized = normalizePrompt(value);

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildPromptSignals(
  source: string,
  intent: PresentationIntent = inferPresentationIntent(source)
) {
  const normalized = normalizePrompt(source);
  const topicLabel = extractTopicLabel(normalized);
  const period = extractPeriod(normalized);
  const audience = extractAudience(normalized);
  const presentationIntent = intent;
  const desiredOutcome = extractDesiredOutcome(normalized, presentationIntent);
  const keyMessage = extractKeyMessage(normalized);
  const riskLine = extractRiskLine(normalized);
  const knownFacts = buildKnownFacts(normalized, riskLine);
  const factCoverage = assessFactCoverage(normalized, {
    knownFacts,
    riskLine,
  });
  const missingFacts = buildMissingFacts(normalized, {
    topicLabel,
    riskLine,
    factCoverage,
  });

  return {
    topicLabel,
    period,
    audience,
    presentationIntent,
    desiredOutcome,
    keyMessage,
    riskLine,
    factCoverage,
    knownFacts,
    missingFacts,
    confidence: calculateSignalConfidence({
      topicLabel,
      audience,
      desiredOutcome,
      keyMessage,
      riskLine,
      knownFacts,
      missingFacts,
      factCoverage,
    }),
  };
}

export function inferPresentationIntent(source: string): PresentationIntent {
  if (
    /принят|одобр|соглас|выбор|решени|approve|budget|resource|hire|decision/i.test(
      source
    )
  ) {
    return "decision";
  }

  if (
    /объясн|разлож|почему|понять|суть|структур|контекст|explain|breakdown/i.test(
      source
    )
  ) {
    return "explain";
  }

  return "update";
}

export function extractAudience(source: string) {
  if (/cto|техническ[а-я]*\s+директор/i.test(source)) {
    return "CTO";
  }

  if (/ceo|генеральн[а-я]*\s+директор/i.test(source)) {
    return "CEO";
  }

  if (/совет|board/i.test(source)) {
    return "Совет";
  }

  const audienceCandidates = [
    ...source.matchAll(
      /(?:^|\s)(?:для|руководителю|руководителя|аудитории)\s+([а-яёa-z0-9][^:.,;!?]{2,40})/gi
    ),
    ...source.matchAll(
      /(?:^|\s)(?:показываем|показать)\s+([а-яёa-z0-9][^:.,;!?]{2,40})/gi
    ),
    ...source.matchAll(
      /\b(?:cto|ceo|cfo|cio|coo|vp|head(?: of)?|board|совет)\b[^.,;!?]*/gi
    ),
  ];

  for (const match of audienceCandidates) {
    const raw = match[1] ?? match[0];
    const candidate = cleanAudienceCandidate(raw);

    if (candidate) {
      return candidate;
    }
  }

  if (/руководител|director|head of/i.test(source)) {
    return "Руководитель направления";
  }

  return null;
}

export function extractPeriod(source: string) {
  const match =
    source.match(/\bQ[1-4]\s*20\d{2}\b/i) ??
    source.match(/\b[1-4]\s*квартал(?:а)?\s*20\d{2}\b/i) ??
    source.match(/\bQ[1-4]\b/i);

  return match?.[0] ?? "текущий период";
}

export function extractTopicLabel(source: string) {
  const explicitServiceMatch = source.match(
    /\b(?:сервис|service|продукт|product)\s+([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9-]+)/i
  );

  if (explicitServiceMatch?.[1]) {
    return normalizeSentence(explicitServiceMatch[1]);
  }

  const explicitTeamMatch = source.match(
    /\b([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,2}\s+team)\b/i
  );

  if (explicitTeamMatch?.[1]) {
    return toTitleCase(explicitTeamMatch[1]);
  }

  const explicitPilotMatch = source.match(/(?:^|\s)пилот[а-я]*\s+([а-яёa-z0-9-]{2,30})/i);

  if (explicitPilotMatch?.[1]) {
    return normalizeSentence(`Пилот ${explicitPilotMatch[1]}`);
  }

  const explicitPilotOutcomeMatch = source.match(
    /(?:^|\s)итоги?\s+пилот[а-я]*\s+([а-яёa-z0-9-]{2,30})/i
  );

  if (explicitPilotOutcomeMatch?.[1]) {
    return normalizeSentence(`Пилот ${explicitPilotOutcomeMatch[1]}`);
  }

  const explicitResourceMatch = source.match(
    /(?:^|\s)запрос\s+на\s+ресурс\s+по\s+([^:.,;!?]{2,40})/i
  );

  if (explicitResourceMatch?.[1]) {
    return normalizeSentence(cleanTopicCandidate(explicitResourceMatch[1]));
  }

  const candidates = collectTopicCandidates(source)
    .map((candidate) => cleanTopicCandidate(candidate))
    .filter(Boolean)
    .filter(isConcreteTopicCandidate)
    .sort((left, right) => {
      const scoreDelta = scoreTopicCandidate(right) - scoreTopicCandidate(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.length - right.length;
    });

  for (const candidate of candidates) {
    if (!isAudienceLikeTopic(candidate)) {
      return normalizeSentence(candidate);
    }
  }

  const keywords = extractKeywords(source);

  if (keywords[0]) {
    return normalizeSentence(keywords.slice(0, 2).join(" "));
  }

  return "Рабочая тема";
}

export function extractShortFacts(source: string) {
  const fragments = collectFactClauses(source).slice(0, 4);

  if (fragments.length) {
    return fragments;
  }

  return [
    "Есть один рабочий сигнал.",
    "Есть один риск или ограничение.",
    "Следующий шаг можно назвать без долгого захода.",
  ];
}

export function assessFactCoverage(
  source: string,
  context: { knownFacts?: string[]; riskLine?: string | null } = {}
): FactCoverageId {
  const metricsCount =
    (source.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? []).length +
    (source.match(/\bQ[1-4]\b/gi) ?? []).length;

  if (metricsCount >= 2) {
    return "enough";
  }

  if (
    (FACT_HINTS.test(source) || Boolean(context.riskLine)) &&
    (context.knownFacts?.length ?? 0) >= 1
  ) {
    return "enough";
  }

  if (/пока без цифр|нет цифр|не хватает фактов|нужно добрать/i.test(source)) {
    return "partial";
  }

  if (source.length > 110 || collectFactClauses(source).length >= 2) {
    return "partial";
  }

  return "thin";
}

export function buildMissingFacts(
  source: string,
  context: { topicLabel?: string; riskLine?: string | null; factCoverage?: FactCoverageId } = {}
) {
  const riskSource = `${source} ${context.riskLine ?? ""}`;
  const items = [
    "[нужна цифра]",
    /latency|время|speed|срок|дата|deadline/i.test(riskSource)
      ? "[подтвердить срок]"
      : "[подтвердить срок]",
    /выборк|coverage|сценар|охват|покрыт/i.test(riskSource)
      ? "[уточнить охват]"
      : "[уточнить охват]",
  ];

  return items;
}

export function extractDesiredOutcome(
  source: string,
  intent: PresentationIntent
) {
  const topicLabel = extractTopicLabel(source);
  const explicitHireSlot = source.match(
    /(?:^|\s)согласовать\s+(?:ещ[её]\s+)?(?:следующ(?:ий|его)\s+)?слот\s+на\s+([а-яёa-z0-9-]+(?:\s+[а-яёa-z0-9-]+){0,2})/i
  );

  if (explicitHireSlot?.[1]) {
    return finishSentence(`Согласовать следующий слот на ${cleanOutcomeObject(explicitHireSlot[1])}`);
  }

  const explicitStageDecision = source.match(
    /(?:^|\s)(?:нужно\s+)?решить,\s*ид[её]м\s+ли\s+в\s+следующ(?:ий|его)\s+этап/i
  );

  if (explicitStageDecision) {
    return "Решить, идём ли в следующий этап.";
  }

  const explicitOutcomeClause = findOutcomeClause(source);

  if (explicitOutcomeClause) {
    const normalizedOutcome = normalizeOutcomeClause(explicitOutcomeClause, topicLabel);

    if (normalizedOutcome) {
      return normalizedOutcome;
    }
  }

  const inferredHireNeed = source.match(
    /(?:^|\s)без\s+ещ[её]\s+одного\s+([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}|[а-яё0-9-]+(?:\s+[а-яё0-9-]+){0,2})\s+[^.!?;,:]*не\s+(?:дожм[её]м|сможем|получится)/i
  );

  if (inferredHireNeed?.[1]) {
    return finishSentence(
      `Согласовать ещё один слот на ${cleanOutcomeObject(inferredHireNeed[1])}`
    );
  }

  if (/следующ(?:ий|его)\s+шаг|следующ(?:ий|его)\s+этап/i.test(source)) {
    return finishSentence(`Согласовать следующий шаг по ${topicLabel}`);
  }

  if (
    /утверд|соглас|подтверд|выделить|дать добро|бюджет|ресурс|найм|приоритет/i.test(
      source
    )
  ) {
    return "Согласовать ресурс или решение.";
  }

  if (/что\s+нужно\s+решить|какое\s+решение|решить/i.test(source)) {
    return "Принять решение.";
  }

  if (/снять вопросы|разобраться|понять|объяснить|разложить|почему нельзя/i.test(source)) {
    return "Снять вопросы по сути.";
  }

  if (/зафиксировать|показать|обновить|статус/i.test(source)) {
    return "Зафиксировать текущее состояние.";
  }

  if (intent === "decision") {
    return "Согласовать следующий шаг.";
  }

  if (intent === "explain") {
    return "Снять вопросы по сути.";
  }

  return null;
}

export function extractKeyMessage(source: string) {
  const normalized = normalizePrompt(source);

  if (!normalized) {
    return null;
  }

  const identityClause = splitClauses(normalized)
    .map((item) => cleanFactClause(item))
    .find(
      (item) =>
        item.length > 18 &&
        !DIRECTIVE_PREFIX.test(item) &&
        /\b(?:mvp|превращает|помогает|делает|даёт|дает|это)\b/i.test(item)
    );

  if (identityClause) {
    return clampText(identityClause, 100);
  }

  const strongestFact = collectFactClauses(normalized).find(
    (item) => !RISK_HINTS.test(item)
  );

  if (strongestFact) {
    return clampText(strongestFact, 100);
  }

  const clauses = collectKeyMessageClauses(normalized);

  if (clauses[0]) {
    return clampText(clauses[0], 100);
  }

  if (/главное|важно|ключев/i.test(normalized)) {
    const fragments = normalized.split(/[.!?]/).map(normalizeSentence);
    const direct = fragments.find((fragment) =>
      /главное|важно|ключев/i.test(fragment)
    );

    if (direct) {
      return clampText(stripDirectivePrefix(direct), 100);
    }
  }

  return null;
}

export function buildStartSummary(source: string) {
  const topic = extractTopicLabel(source).toLowerCase();
  const keyMessage = extractKeyMessage(source);

  if (keyMessage) {
    return clampText(keyMessage, 120);
  }

  return clampText(`Нужно собрать разговор про ${topic}.`, 120);
}

function extractKeywords(source: string) {
  return source
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 3);
}

function collectTopicCandidates(source: string) {
  const candidates = new Set<string>();
  const fragments = splitClauses(source);

  for (const fragment of fragments) {
    const candidate = cleanTopicCandidate(fragment);
    if (candidate) {
      candidates.add(candidate);
    }
  }

  for (const match of source.matchAll(/\b(?:про|о|об|обо)\s+([^.!?;]{3,60})/gi)) {
    const candidate = cleanTopicCandidate(match[1] ?? "");
    if (candidate) {
      candidates.add(candidate);
    }
  }

  for (const match of source.matchAll(/\b(?:по итогам|итоги?)\s+([^.!?;]{3,60})/gi)) {
    const candidate = cleanTopicCandidate(match[1] ?? "");
    if (candidate) {
      candidates.add(candidate);
    }
  }

  for (const match of source.matchAll(/\b([a-z][a-z0-9\s-]{2,30})\s+team\b/gi)) {
    const candidate = cleanTopicCandidate(match[1] ?? "");
    if (candidate) {
      candidates.add(candidate);
    }
  }

  for (const match of source.matchAll(/\bкоманд[аы]\s+([^.!?;]{2,40})/gi)) {
    const candidate = cleanTopicCandidate(match[1] ?? "");
    if (candidate) {
      candidates.add(candidate);
    }
  }

  return Array.from(candidates);
}

function collectFactClauses(source: string) {
  const clauses = splitFactFragments(source)
    .map((item) => cleanFactClause(item))
    .filter(
      (item) =>
        item.length > 10 &&
        isFactLikeClause(item) &&
        !/^(?:где\s+)?остаются\s+слабые\s+места\s+и\s+риски$/i.test(item)
    )
    .map((item) => ({
      value: item,
      score: scoreFactClause(item),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.value)
    .slice(0, 4);

  const riskLine = extractRiskLine(source);
  if (riskLine && !clauses.some((item) => item === riskLine)) {
    clauses.unshift(riskLine);
  }

  return Array.from(new Set(clauses)).slice(0, 4);
}

function collectKeyMessageClauses(source: string) {
  const scored = splitClauses(source)
    .map((item) => cleanFactClause(item))
    .filter(Boolean)
    .map((item) => ({
      value: item,
      score: scoreKeyMessageClause(item),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored.map((item) => item.value);
}

function stripDirectivePrefix(value: string) {
  return normalizePrompt(value).replace(DIRECTIVE_PREFIX, "").trim();
}

function buildKnownFacts(source: string, riskLine: string | null) {
  const facts = collectFactClauses(source);

  if (riskLine && !facts.includes(riskLine)) {
    facts.push(riskLine);
  }

  return Array.from(new Set(facts)).slice(0, 4);
}

function extractRiskLine(source: string) {
  const candidates = splitFactFragments(source)
    .map((item) => cleanFactClause(item))
    .filter(Boolean)
    .map((item) => ({
      value: item,
      score: scoreRiskClause(item),
    }))
    .filter((item) => item.score >= 3)
    .sort((left, right) => right.score - left.score);

  if (!candidates[0]) {
    return null;
  }

  if (/^(?:где\s+)?остаются\s+слабые\s+места\s+и\s+риски$/i.test(candidates[0].value)) {
    return null;
  }

  return clampText(candidates[0].value, 90);
}

function cleanTopicCandidate(value: string) {
  let candidate = normalizePrompt(value);

  if (!candidate) {
    return "";
  }

  let previous = "";

  while (candidate && candidate !== previous) {
    previous = candidate;
    candidate = candidate.replace(DIRECTIVE_PREFIX, "");
    candidate = candidate.replace(/^(?:про|о|об|обо|по)\s+/i, "");
    candidate = candidate.replace(
      /^(?:сервис|service|команда|team|project|проект|presentation|презентация|презентацию|status|статус|report|отч[её]т|обзор|initiative|инициатива|результаты?|summary|итоги?)\s+/i,
      ""
    );
    candidate = candidate.replace(
      /^(?:собери|сделай|подготовь|покажи(?:те)?|покажем|показываем|нужно|надо|хочу|хотим|давай|сформируй(?:те)?|сформулируй(?:те)?|объясни|разложи|снять|собрать|представь(?:те)?|опиши(?:те)?)\s+/i,
      ""
    );
    candidate = candidate.replace(/^(?:для|по|про|о|об|обо)\s+/i, "");
    candidate = candidate.trim();
  }

  candidate = candidate.replace(/[«»"']/g, "");
  candidate = candidate.replace(/[.?!;,:-]+$/g, "").trim();

  if (!candidate) {
    return "";
  }

  candidate = reduceTopicPhrase(candidate);

  if (!candidate || GENERIC_TOPIC_LABELS.has(candidate.toLowerCase())) {
    return "";
  }

  return candidate;
}

function reduceTopicPhrase(value: string) {
  let candidate = normalizePrompt(value);

  if (!candidate) {
    return "";
  }

  let previous = "";

  while (candidate && candidate !== previous) {
    previous = candidate;

    candidate = candidate.replace(DIRECTIVE_PREFIX, "");
    candidate = candidate.replace(/[«»"']/g, "");
    candidate = candidate.replace(/^(?:для|по|про|о|об|обо)\s+/i, "");

    for (const wrapper of TOPIC_WRAPPERS) {
      candidate = candidate.replace(
        new RegExp(`^${escapeRegExp(wrapper)}\\s+`, "i"),
        ""
      );
    }

    candidate = candidate.replace(
      /^(?:собери|сделай|подготовь|покажи(?:те)?|покажем|показываем|нужно|надо|хочу|хотим|давай|сформируй(?:те)?|сформулируй(?:те)?|объясни|разложи|снять|собрать|представь(?:те)?|опиши(?:те)?)\s+/i,
      ""
    );
    candidate = candidate.replace(
      /^(?:итоги?|summary|обзор|результаты?)\s+/i,
      ""
    );
    candidate = candidate.replace(/[.?!;,:-]+$/g, "").trim();
  }

  if (!candidate) {
    return "";
  }

  if (GENERIC_TOPIC_LABELS.has(candidate.toLowerCase())) {
    return "";
  }

  return candidate;
}

function cleanAudienceCandidate(value: string) {
  let candidate = normalizePrompt(value);

  if (!candidate) {
    return null;
  }

  candidate = candidate.replace(/[«»"']/g, "");
  candidate = candidate.split(/[:—-]/)[0] ?? candidate;
  candidate = candidate.replace(/\s+(?:для|по|про|о|об|обо)\s+.*$/i, "");
  candidate = candidate.replace(/[.?!;,:-]+$/g, "").trim();

  if (!candidate) {
    return null;
  }

  if (!AUDIENCE_HINTS.test(candidate)) {
    return null;
  }

  if (/реал[а-я]*\s+разговора|текущ[а-я]*\s+период|рабоч[а-я]*\s+тема|презентац/i.test(candidate)) {
    return null;
  }

  candidate = candidate.replace(/^продуктов(?:ого|ый)\s+руководител[ьяюе]/i, "Продуктовый руководитель");
  candidate = candidate.replace(/^техническ(?:ого|ий)\s+директор[а-я]*/i, "Технический директор");
  candidate = candidate.replace(/^руководител[ьяюе]/i, "Руководитель");

  return normalizeSentence(candidate);
}

function scoreTopicCandidate(value: string) {
  let score = 0;
  const normalized = value.toLowerCase();

  if (DIRECTIVE_PREFIX.test(value)) {
    return -5;
  }

  if (/[A-ZА-ЯЁ]{2,}/.test(value)) {
    score += 4;
  }

  if (/\b(?:team|vnyatno|mvp|pilot|пилот|статус|квартал|ресурс|мигр|интеграц|найм|бюджет|risk|риск)\b/i.test(
    value
  )) {
    score += 3;
  }

  if (ACTION_HINTS.test(value) || EXPLAIN_HINTS.test(value)) {
    score -= 4;
  }

  if (/^это\b/i.test(value)) {
    score -= 2;
  }

  if (/[0-9]/.test(value) || /\bq[1-4]\b/i.test(value)) {
    score += 2;
  }

  if (normalized.length >= 4 && normalized.length <= 28) {
    score += 2;
  } else if (normalized.length <= 45) {
    score += 1;
  }

  if (/^итоги?\b/i.test(value)) {
    score -= 1;
  }

  if (/^собери\b/i.test(value) || /^нужно\b/i.test(value) || /^показываем\b/i.test(value)) {
    score -= 3;
  }

  return score;
}

function cleanFactClause(value: string) {
  let candidate = normalizePrompt(value);

  if (!candidate) {
    return "";
  }

  candidate = candidate.replace(/[«»"']/g, "");

  let previous = "";
  while (candidate && candidate !== previous) {
    previous = candidate;
    candidate = candidate.replace(/^(?:и|но|а)\s+/i, "");
    candidate = candidate.replace(/^(?:после\s+показа|сейчас|вот|здесь)\s+/i, "");
    candidate = candidate.replace(/^(?:это|есть|уже|что)\s+/i, "");
    candidate = candidate.replace(DIRECTIVE_PREFIX, "");
    candidate = candidate.replace(/^(?:собрать|показать|решить|согласовать)\s+/i, "");
    candidate = candidate.trim();
  }

  candidate = candidate.replace(/[.?!;,:-]+$/g, "").trim();

  if (!candidate) {
    return "";
  }

  return normalizeSentence(candidate);
}

function isFactLikeClause(value: string) {
  return scoreFactClause(value) > 0;
}

function scoreKeyMessageClause(value: string) {
  let score = 0;

  if (DIRECTIVE_PREFIX.test(value)) {
    return -5;
  }

  if (/^это\b/i.test(value)) {
    score += 3;
  }

  if (FACT_HINTS.test(value)) {
    score += 3;
  }

  if (RISK_HINTS.test(value)) {
    score += 2;
  }

  if (ACTION_HINTS.test(value)) {
    score += 2;
  }

  if (EXPLAIN_HINTS.test(value)) {
    score += 1;
  }

  if (value.length > 25) {
    score += 1;
  }

  if (/\b(?:mvp|пилот|сервис|команда|статус|найм|бюджет|ресурс|мигр|провер|подтвержд)\b/i.test(
    value
  )) {
    score += 2;
  }

  return score;
}

function isConcreteTopicCandidate(value: string) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();

  if (GENERIC_TOPIC_LABELS.has(normalized)) {
    return false;
  }

  if (DIRECTIVE_PREFIX.test(value)) {
    return false;
  }

  if (
    /реал[а-я]*\s+разговора|текущ[а-я]*\s+период|нужного\s+адресата|руководител|директор|менеджер|тимлид|audienc|аудитор|cto|ceo|превращ|работа|снизил|мигрир|упёр|соглас|показ|нужно/i.test(
      value
    )
  ) {
    return false;
  }

  if (normalized.length < 3) {
    return false;
  }

  return /[a-zа-яё]/i.test(value);
}

function isAudienceLikeTopic(value: string) {
  return /\b(?:руководител|director|manager|тимлид|lead|audienc|аудитор|cto|ceo|board)\b/i.test(
    value
  );
}

function splitClauses(source: string) {
  return source
    .split(/[\n.!?;]+/)
    .map((item) => normalizePrompt(item))
    .filter(Boolean);
}

function splitFactFragments(source: string) {
  return source
    .split(/[\n.!?;:]+/)
    .flatMap((item) => item.split(/,(?=\s*[а-яёa-z0-9])/i))
    .map((item) => normalizePrompt(item))
    .filter(Boolean);
}

function scoreFactClause(value: string) {
  let score = 0;

  if (DIRECTIVE_PREFIX.test(value)) {
    score -= 6;
  }

  if (/^(?:нужен|нужна|нужны)?\s*запрос\s+на\s+ресурс/i.test(value)) {
    score -= 5;
  }

  if (/^(?:нужно\s+)?согласовать/i.test(value)) {
    score -= 5;
  }

  if (/\b\d+(?:[.,]\d+)?%?\b/.test(value)) {
    score += 4;
  }

  if (RISK_HINTS.test(value)) {
    score += 4;
  }

  if (/\b(?:mvp|пилот|сниз|мигр|убрал|сократ|даёт|дает|работает|реализован|похоже|повторяем|сигнал|факт|подтвержд|доказ)\b/i.test(value)) {
    score += 3;
  }

  if (/(?:mini-chat|мини-чат|черновик|редактор|пересбор|слайд|тихий\s+старт)/i.test(value)) {
    score += 3;
  }

  if (/\b(?:статус|презентац|обзор|запрос)\b/i.test(value) && !/\b\d+(?:[.,]\d+)?%?\b/.test(value)) {
    score -= 2;
  }

  if (/^(?:собери|собрать|нужно|показать|показываем|покажем)\b/i.test(value)) {
    score -= 3;
  }

  return score;
}

function scoreRiskClause(value: string) {
  let score = 0;

  if (!RISK_HINTS.test(value)) {
    return -2;
  }

  score += 4;

  if (/(?:не\s+подтвержден|не\s+дожм[её]м|упёрл|застрял|мешает|не\s+хватает|без\s+ещ[её]|слабые\s+места)/i.test(value)) {
    score += 3;
  }

  if (/(?:latency|coverage|найм|бюджет|ресурс|срок|qa|engineer)/i.test(value)) {
    score += 2;
  }

  if (DIRECTIVE_PREFIX.test(value)) {
    score -= 4;
  }

  if (/^(?:что|какой|где)\s+/i.test(value) && !/(?:упёр|застрял|не\s+подтвержд|не\s+дожм[её]м)/i.test(value)) {
    score -= 2;
  }

  return score;
}

function findOutcomeClause(source: string) {
  const clauses = splitClauses(source)
    .map((item) => normalizePrompt(item))
    .filter(Boolean);

  return (
    clauses.find((item) =>
      /(?:согласовать|утвердить|выделить|подтвердить|решить|ид[её]м\s+ли|следующ(?:ий|его)\s+шаг)/i.test(
        item
      )
    ) ?? null
  );
}

function normalizeOutcomeClause(value: string, topicLabel: string) {
  const candidate = cleanFactClause(value);

  if (!candidate) {
    return null;
  }

  if (/ид[её]м\s+ли\s+в\s+следующ(?:ий|его)\s+этап/i.test(candidate)) {
    return "Решить, идём ли в следующий этап.";
  }

  if (/слот\s+на\s+/i.test(candidate)) {
    return finishSentence(
      /^(?:следующ(?:ий|его)\s+слот\s+на\s+)/i.test(candidate)
        ? `Согласовать ${candidate.toLowerCase()}`
        : candidate.replace(/^Нужен\s+/i, "Согласовать ")
    );
  }

  if (/следующ(?:ий|его)\s+шаг/i.test(candidate)) {
    return finishSentence(`Согласовать следующий шаг по ${topicLabel}`);
  }

  if (/^(?:согласовать|утвердить|выделить|подтвердить|решить)\b/i.test(candidate)) {
    return finishSentence(candidate);
  }

  return null;
}

function cleanOutcomeObject(value: string) {
  return normalizePrompt(value)
    .replace(/[«»"']/g, "")
    .replace(/[.?!;,:-]+$/g, "")
    .trim();
}

function finishSentence(value: string) {
  const normalized = normalizePrompt(value).replace(/[.?!]+$/g, "");

  if (!normalized) {
    return "";
  }

  return `${normalized}.`;
}

function calculateSignalConfidence({
  topicLabel,
  audience,
  desiredOutcome,
  keyMessage,
  riskLine,
  knownFacts,
  missingFacts,
  factCoverage,
}: {
  topicLabel: string;
  audience: string | null;
  desiredOutcome: string | null;
  keyMessage: string | null;
  riskLine: string | null;
  knownFacts: string[];
  missingFacts: string[];
  factCoverage: FactCoverageId;
}) {
  let score = 0.08;

  if (isConcreteTopicCandidate(topicLabel)) {
    score += 0.18;
  }

  if (audience && AUDIENCE_HINTS.test(audience)) {
    score += 0.18;
  }

  if (desiredOutcome) {
    score += 0.2;
  }

  if (keyMessage) {
    score += 0.1;
  }

  if (riskLine) {
    score += 0.12;
  }

  if (knownFacts.some((fact) => isFactLikeClause(fact))) {
    score += Math.min(0.2, knownFacts.length * 0.06);
  }

  if (factCoverage === "enough") {
    score += 0.1;
  }

  if (missingFacts.length === 0) {
    score += 0.05;
  } else if (missingFacts.length === 1) {
    score += 0.03;
  }

  return Math.min(1, score);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
