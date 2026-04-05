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
  const directMatch =
    source.match(
      /(?:показать|показываем|для|руководителю|руководителя|аудитория)\s+([а-яёa-z0-9\s-]{3,40})/i
    ) ?? null;

  if (/cto|техническ[а-я]*\s+директор/i.test(source)) {
    return "CTO";
  }

  if (/ceo|генеральн[а-я]*\s+директор/i.test(source)) {
    return "CEO";
  }

  if (/совет|board/i.test(source)) {
    return "Совет";
  }

  if (directMatch?.[1]) {
    const candidate = normalizeSentence(directMatch[1]);

    if (candidate.length <= 40) {
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
  const englishTeamMatch = source.match(/([a-z][a-z0-9\s-]{2,30})\s+team/i);

  if (englishTeamMatch?.[1]) {
    return toTitleCase(englishTeamMatch[1]);
  }

  const russianTeamMatch = source.match(
    /команд[аы]\s+([а-яёa-z0-9\s-]{2,28})/i
  );

  if (russianTeamMatch?.[1]) {
    return normalizeSentence(russianTeamMatch[1]);
  }

  const keywords = extractKeywords(source);

  if (keywords[0]) {
    return normalizeSentence(keywords.slice(0, 2).join(" "));
  }

  return "Рабочая тема";
}

export function extractShortFacts(source: string) {
  const fragments = source
    .split(/[.!?;]+/)
    .map((item) => normalizeSentence(item))
    .filter((item) => item.length > 18)
    .slice(0, 4);

  if (fragments.length) {
    return fragments;
  }

  return [
    "Есть движение по главной теме.",
    "Один риск уже можно назвать отдельно.",
    "Следующий шаг можно обсуждать без долгого захода.",
  ];
}

export function assessFactCoverage(source: string): FactCoverageId {
  const metricsCount =
    (source.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? []).length +
    (source.match(/\bQ[1-4]\b/gi) ?? []).length;

  if (metricsCount >= 2) {
    return "enough";
  }

  if (
    /есть данные|есть цифры|точно есть|метрики|факты|подтверждено|работает/i.test(
      source
    )
  ) {
    return "enough";
  }

  if (/пока без цифр|нет цифр|не хватает фактов|нужно добрать/i.test(source)) {
    return "partial";
  }

  if (source.length > 110 || extractShortFacts(source).length >= 2) {
    return "partial";
  }

  return "thin";
}

export function buildMissingFacts(source: string) {
  const items = [
    /точност|accuracy/i.test(source)
      ? "Уточнить опорный факт по точности."
      : "Уточнить 1 опорный факт.",
    /latency|время|speed|срок/i.test(source)
      ? "Подтвердить срок эффекта."
      : "Подтвердить срок следующего шага.",
    /выборк|coverage|сценар|охват/i.test(source)
      ? "Проверить охват и выборку."
      : "Проверить, что осталось вне охвата.",
  ];

  return items;
}

export function extractDesiredOutcome(
  source: string,
  intent: PresentationIntent
) {
  if (
    /утверд|соглас|подтверд|выделить|дать добро|бюджет|ресурс|найм|приоритет/i.test(
      source
    )
  ) {
    return "Согласовать следующий шаг.";
  }

  if (/снять вопросы|разобраться|понять|объяснить|разложить/i.test(source)) {
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

  if (/главное|важно|ключев/i.test(normalized)) {
    const fragments = normalized.split(/[.!?]/).map(normalizeSentence);
    const direct = fragments.find((fragment) =>
      /главное|важно|ключев/i.test(fragment)
    );

    if (direct) {
      return clampText(direct, 100);
    }
  }

  const facts = extractShortFacts(normalized);
  const firstFact = facts[0];

  if (!firstFact || firstFact.startsWith("Есть движение")) {
    return null;
  }

  return clampText(firstFact, 100);
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

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
