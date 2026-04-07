import { buildWorkingDraftFromPrompt } from "@/lib/demo-generator";
import { DraftApiError, validateSlides } from "@/lib/draft-api";
import {
  buildPromptSignals,
  extractShortFacts,
  normalizePrompt,
} from "@/lib/prompt-analysis";
import { PRODUCT_DEMO_PROMPT } from "@/lib/presentation-options";
import type {
  ClarifyAnswers,
  ColorThemeId,
  DraftChatMessage,
  DraftSession,
  SlideTextEntry,
  TemplateId,
  WorkingDraft,
} from "@/lib/presentation-types";

export const DEMO_PRODUCT_PROMPT = PRODUCT_DEMO_PROMPT;

type SessionBuildOptions = {
  sourcePrompt: string;
  messages: DraftChatMessage[];
  slideTexts?: SlideTextEntry[];
  templateId?: TemplateId;
  colorThemeId?: ColorThemeId;
  audience?: string;
  presentationIntent?: WorkingDraft["presentationIntent"];
  desiredOutcome?: string;
  knownFacts?: string[];
  missingFacts?: string[];
  confidence?: number;
  uploadedContent?: string;
  uploadedFileName?: string;
  clarifyAnswers?: ClarifyAnswers;
};

type MissingFactKey =
  | "topic"
  | "audience"
  | "fact"
  | "next_step"
  | "timeline";

const MISSING_FACT_COPY: Record<MissingFactKey, string> = {
  topic: "Что именно здесь нужно показать.",
  audience: "Кому вы это показываете.",
  fact: "Какой факт или цифру важно вынести в начало.",
  next_step: "Какой следующий шаг должен прозвучать в конце.",
  timeline: "Какой срок или этап важен для этой истории.",
};

const READY_QUICK_REPLIES = [
  "Сделай акцент на главном выводе.",
  "Собери более короткий и жёсткий ход.",
  "В конце оставь один ясный следующий шаг.",
] as const;

const QUICK_REPLIES_BY_MISSING_FACT: Record<MissingFactKey, string[]> = {
  topic: [
    "Показываем, в чём суть решения.",
    "Нужно коротко назвать тему и зачем она важна.",
  ],
  audience: [
    "Аудитория: команда и руководитель, которым нужен ясный следующий шаг.",
    "Показываем это тем, кто принимает решение или собирает рабочую презентацию.",
  ],
  fact: [
    "Главный факт: путь до рабочего черновика становится короче.",
    "Нужно вынести в начало один конкретный сигнал или число.",
  ],
  next_step: [
    "Следующий шаг: согласовать одно решение без лишних вариантов.",
    "В финале нужен один рабочий шаг, а не список пожеланий.",
  ],
  timeline: [
    "Фокус на текущем этапе и ближайшем следующем ходе.",
    "Важно показать, что нужно сделать сейчас, а не когда-нибудь потом.",
  ],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueLines(lines: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = typeof line === "string" ? normalizePrompt(line) : "";
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeMessages(messages: unknown): DraftChatMessage[] {
  if (messages === undefined) {
    return [];
  }

  if (!Array.isArray(messages)) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "История draft-сессии должна быть массивом сообщений.",
      400,
    );
  }

  return messages.map((entry) => {
    if (!isObject(entry)) {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "В истории draft-сессии найдено сообщение неверного формата.",
        400,
      );
    }

    if (entry.role !== "user" && entry.role !== "assistant") {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "В истории draft-сессии найдена неизвестная роль.",
        400,
      );
    }

    if (typeof entry.text !== "string") {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "В истории draft-сессии найдено сообщение без текста.",
        400,
      );
    }

    const kind =
      entry.kind === "content" || entry.kind === "error"
        ? entry.kind
        : undefined;

    return {
      role: entry.role,
      text: normalizePrompt(entry.text),
      kind,
    };
  });
}

function normalizeSlideTexts(raw: unknown) {
  if (raw === undefined) {
    return [] satisfies SlideTextEntry[];
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return [] satisfies SlideTextEntry[];
  }

  return validateSlides(raw);
}

function normalizeStringList(raw: unknown, limit = 3) {
  if (!Array.isArray(raw)) {
    return [] as string[];
  }

  return uniqueLines(
    raw.filter((item): item is string => typeof item === "string"),
  ).slice(0, limit);
}

function hasSpecificTopic(sourcePrompt: string) {
  return buildPromptSignals(sourcePrompt).topicLabel !== "Рабочая тема";
}

function hasSpecificAudience(audience: string | null) {
  return typeof audience === "string" && normalizePrompt(audience).length > 0;
}

function hasSpecificOutcome(outcome: string | null) {
  const normalized = typeof outcome === "string" ? normalizePrompt(outcome) : "";

  if (!normalized) {
    return false;
  }

  return ![
    "Согласовать следующий шаг.",
    "Снять вопросы по сути.",
    "Зафиксировать текущее состояние.",
    "Согласовать ресурс или решение.",
    "Принять решение.",
  ].includes(normalized);
}

function inferMissingFactKeyFromText(text: string): MissingFactKey | null {
  const normalized = normalizePrompt(text);
  const matchedEntry = (Object.entries(MISSING_FACT_COPY) as Array<
    [MissingFactKey, string]
  >).find(([, label]) => label === normalized);

  if (matchedEntry) {
    return matchedEntry[0];
  }

  const lowered = normalized.toLowerCase();
  if (lowered.includes("кому")) {
    return "audience";
  }

  if (lowered.includes("факт") || lowered.includes("цифр")) {
    return "fact";
  }

  if (lowered.includes("следующ")) {
    return "next_step";
  }

  if (lowered.includes("срок") || lowered.includes("этап")) {
    return "timeline";
  }

  if (lowered.includes("показать") || lowered.includes("тема")) {
    return "topic";
  }

  return null;
}

function collectMissingFactKeys(
  sourcePrompt: string,
  missingFacts: string[] = [],
): MissingFactKey[] {
  const explicitKeys = uniqueLines(
    missingFacts
      .map((fact) => inferMissingFactKeyFromText(fact))
      .filter((key): key is MissingFactKey => key !== null),
  ) as MissingFactKey[];

  if (explicitKeys.length > 0) {
    return explicitKeys.slice(0, 3);
  }

  const signals = buildPromptSignals(sourcePrompt);
  const items: MissingFactKey[] = [];

  if (!hasSpecificTopic(sourcePrompt)) {
    items.push("topic");
  }

  if (!hasSpecificAudience(signals.audience)) {
    items.push("audience");
  }

  if (signals.knownFacts.length < 2) {
    items.push("fact");
  }

  if (!hasSpecificOutcome(signals.desiredOutcome)) {
    items.push("next_step");
  }

  if (signals.period === "текущий период") {
    items.push("timeline");
  }

  return items.slice(0, 3);
}

export function buildClarifyMissingFacts(sourcePrompt: string) {
  return collectMissingFactKeys(sourcePrompt).map((key) => MISSING_FACT_COPY[key]);
}

export function getDraftReadiness(sourcePrompt: string) {
  const signals = buildPromptSignals(sourcePrompt);

  return (
    hasSpecificTopic(sourcePrompt) &&
    hasSpecificAudience(signals.audience) &&
    signals.knownFacts.length >= 1
  );
}

export function buildQuickRepliesFromMissingFacts(
  sourcePrompt: string,
  missingFacts: string[],
  readyToGenerate: boolean,
) {
  if (readyToGenerate) {
    return [...READY_QUICK_REPLIES];
  }

  const replies = collectMissingFactKeys(sourcePrompt, missingFacts).flatMap(
    (key) => QUICK_REPLIES_BY_MISSING_FACT[key],
  );

  const normalized = uniqueLines(replies);
  if (normalized.length >= 2) {
    return normalized.slice(0, 4);
  }

  return uniqueLines([
    ...normalized,
    `Фокус: ${buildPromptSignals(sourcePrompt).topicLabel}.`,
    "Покажи главное без лишних деталей.",
    "Можно сразу собирать первый черновик.",
  ]).slice(0, 4);
}

function buildSummary(sourcePrompt: string) {
  const signals = buildPromptSignals(sourcePrompt);

  return uniqueLines([
    hasSpecificTopic(sourcePrompt) ? `Тема: ${signals.topicLabel}.` : null,
    hasSpecificAudience(signals.audience) ? `Кому: ${signals.audience}.` : null,
    signals.knownFacts[0] ? `Опора: ${signals.knownFacts[0]}.` : null,
    hasSpecificOutcome(signals.desiredOutcome)
      ? `Финал: ${signals.desiredOutcome}.`
      : null,
  ]).join(" ");
}

export function buildClarifyAssistantText(session: DraftSession) {
  if (session.readyToGenerate) {
    return [session.summary, "Можно собирать черновик уже сейчас."]
      .filter(Boolean)
      .join("\n");
  }

  const gaps = session.missingFacts.length
    ? `Можно собирать черновик уже сейчас, но точнее будет, если коротко уточнить: ${session.missingFacts.join("; ")}.`
    : "Можно собирать черновик уже сейчас. Если хотите, можно коротко усилить контекст.";

  return [session.summary, gaps].filter(Boolean).join("\n");
}

export function buildDraftSession({
  sourcePrompt,
  messages,
  slideTexts = [],
  templateId,
  colorThemeId,
  audience,
  presentationIntent,
  desiredOutcome,
  knownFacts: workingFacts,
  missingFacts: workingMissingFacts,
  confidence,
  uploadedContent,
  uploadedFileName,
  clarifyAnswers,
}: SessionBuildOptions): DraftSession {
  const normalizedPrompt = normalizePrompt(sourcePrompt);
  const signals = buildPromptSignals(normalizedPrompt);
  const derivedMissingFacts = buildClarifyMissingFacts(normalizedPrompt);
  const missingFacts =
    workingMissingFacts && workingMissingFacts.length > 0
      ? workingMissingFacts.slice(0, 3)
      : derivedMissingFacts;
  const readyToGenerate =
    getDraftReadiness(normalizedPrompt) || missingFacts.length === 0;
  const knownFacts =
    workingFacts && workingFacts.length > 0
      ? workingFacts.slice(0, 3)
      : signals.knownFacts.length > 0
        ? signals.knownFacts.slice(0, 3)
        : extractShortFacts(normalizedPrompt).slice(0, 3);
  const workingDraft = buildWorkingDraftFromPrompt(normalizedPrompt, {
    audience: audience ?? signals.audience ?? "Рабочая аудитория",
    presentationIntent: presentationIntent ?? signals.presentationIntent,
    desiredOutcome:
      desiredOutcome ??
      signals.desiredOutcome ??
      "Выделить главное и назвать следующий шаг.",
    knownFacts,
    missingFacts,
    confidence: confidence ?? signals.confidence,
    templateId,
    colorThemeId,
  });

  return {
    workingDraft,
    slideTexts,
    messages,
    quickReplies: buildQuickRepliesFromMissingFacts(
      normalizedPrompt,
      missingFacts,
      readyToGenerate,
    ),
    readyToGenerate,
    missingFacts,
    summary: buildSummary(normalizedPrompt),
    ...(uploadedContent !== undefined ? { uploadedContent } : {}),
    ...(uploadedFileName !== undefined ? { uploadedFileName } : {}),
    ...(clarifyAnswers !== undefined ? { clarifyAnswers } : {}),
  };
}

function deriveKnownFactsFromSlides(
  slideTexts: SlideTextEntry[],
  fallbackFacts: string[],
) {
  const bullets: string[] = [];
  if (slideTexts[0]) bullets.push(...slideTexts[0].bullets);
  const mid = Math.min(3, slideTexts.length - 1);
  if (mid > 0 && slideTexts[mid]) bullets.push(...slideTexts[mid].bullets);
  const last = slideTexts.at(-1);
  if (last && slideTexts.length > 1) bullets.push(...last.bullets.slice(0, 1));

  return uniqueLines([
    ...bullets,
    ...fallbackFacts,
  ]).slice(0, 3);
}

function deriveDesiredOutcomeFromSlides(
  slideTexts: SlideTextEntry[],
  fallbackOutcome: string,
) {
  const lastSlide = slideTexts.at(-1);

  return normalizePrompt(
    lastSlide?.bullets[0] ?? lastSlide?.subtitle ?? lastSlide?.title ?? fallbackOutcome,
  );
}

function deriveAudienceFromSlides(
  slideTexts: SlideTextEntry[],
  fallbackAudience: string,
) {
  const personaSlide = slideTexts.find(s =>
    s.layoutType === "personas" ||
    /для кого|аудитория|роли/i.test(s.railTitle)
  );

  const roleLabels = uniqueLines(
    (personaSlide?.bullets ?? []).map((bullet) => {
      const [role] = bullet.split(/[-—]/);
      return role ?? "";
    }),
  ).slice(0, 3);

  return normalizePrompt(
    roleLabels.length > 0
      ? roleLabels.join(", ")
      : slideTexts[0]?.subtitle ?? personaSlide?.subtitle ?? fallbackAudience,
  );
}

function deriveMissingFactsFromSlides(
  slideTexts: SlideTextEntry[],
  fallbackMissingFacts: string[],
) {
  if (slideTexts.length > 0) {
    return [] as string[];
  }

  return fallbackMissingFacts;
}

function buildSummaryFromSlides(
  slideTexts: SlideTextEntry[],
  workingDraft: WorkingDraft,
  fallbackSummary: string,
) {
  const leadSlide = slideTexts[0];
  const parts = uniqueLines([
    leadSlide?.title ? `Тема: ${leadSlide.title}.` : null,
    workingDraft.audience ? `Кому: ${workingDraft.audience}.` : null,
    workingDraft.knownFacts[0] ? `Опора: ${workingDraft.knownFacts[0]}.` : null,
    workingDraft.desiredOutcome ? `Финал: ${workingDraft.desiredOutcome}.` : null,
  ]);

  return parts.join(" ") || fallbackSummary;
}

export function syncSessionWithSlideTexts(
  session: DraftSession,
  nextSlideTexts: SlideTextEntry[] = session.slideTexts,
): DraftSession {
  if (nextSlideTexts.length === 0) {
    return {
      ...session,
      slideTexts: nextSlideTexts,
    };
  }

  const knownFacts = deriveKnownFactsFromSlides(
    nextSlideTexts,
    session.workingDraft.knownFacts,
  );
  const audience = deriveAudienceFromSlides(
    nextSlideTexts,
    session.workingDraft.audience,
  );
  const desiredOutcome = deriveDesiredOutcomeFromSlides(
    nextSlideTexts,
    session.workingDraft.desiredOutcome,
  );
  const missingFacts = deriveMissingFactsFromSlides(
    nextSlideTexts,
    session.missingFacts,
  );
  const readyToGenerate = nextSlideTexts.length > 0 || session.readyToGenerate;
  const workingDraft = {
    ...session.workingDraft,
    audience,
    knownFacts,
    desiredOutcome,
    missingFacts,
  };

  return {
    ...session,
    slideTexts: nextSlideTexts,
    workingDraft,
    missingFacts,
    readyToGenerate,
    quickReplies: buildQuickRepliesFromMissingFacts(
      session.workingDraft.sourcePrompt,
      missingFacts,
      readyToGenerate,
    ),
    summary: buildSummaryFromSlides(nextSlideTexts, workingDraft, session.summary),
  };
}

export function createClarifySession(prompt: string): DraftSession {
  const normalizedPrompt = normalizePrompt(prompt);
  const baseMessages: DraftChatMessage[] = [{ role: "user", text: normalizedPrompt }];
  const baseSession = buildDraftSession({
    sourcePrompt: normalizedPrompt,
    messages: baseMessages,
  });

  return {
    ...baseSession,
    messages: [
      ...baseMessages,
      { role: "assistant", text: buildClarifyAssistantText(baseSession) },
    ],
  };
}

export function appendClarifyToSession(
  session: DraftSession,
  userMessage: string,
): DraftSession {
  const normalizedMessage = normalizePrompt(userMessage);
  const mergedPrompt = normalizePrompt(
    `${session.workingDraft.sourcePrompt}\n${normalizedMessage}`,
  );
  const nextMessages: DraftChatMessage[] = [
    ...session.messages,
    { role: "user", text: normalizedMessage },
  ];
  const nextSession = buildDraftSession({
    sourcePrompt: mergedPrompt,
    messages: nextMessages,
    slideTexts: session.slideTexts,
    templateId: session.workingDraft.templateId,
    colorThemeId: session.workingDraft.colorThemeId,
    audience: session.workingDraft.audience,
    presentationIntent: session.workingDraft.presentationIntent,
    uploadedContent: session.uploadedContent,
    uploadedFileName: session.uploadedFileName,
    clarifyAnswers: session.clarifyAnswers,
  });

  return {
    ...nextSession,
    messages: [
      ...nextMessages,
      { role: "assistant", text: buildClarifyAssistantText(nextSession) },
    ],
  };
}

export function withSessionSlides(
  session: DraftSession,
  slideTexts: SlideTextEntry[],
  assistantMessage: string,
): DraftSession {
  return syncSessionWithSlideTexts(
    buildDraftSession({
      sourcePrompt: session.workingDraft.sourcePrompt,
      messages: [
        ...session.messages,
        { role: "assistant", text: normalizePrompt(assistantMessage) },
      ],
      slideTexts,
      templateId: session.workingDraft.templateId,
      colorThemeId: session.workingDraft.colorThemeId,
      audience: session.workingDraft.audience,
      presentationIntent: session.workingDraft.presentationIntent,
      uploadedContent: session.uploadedContent,
      uploadedFileName: session.uploadedFileName,
      clarifyAnswers: session.clarifyAnswers,
    }),
  );
}

export function withSessionRevision(
  session: DraftSession,
  userMessage: string,
  slideTexts: SlideTextEntry[],
  assistantMessage: string,
): DraftSession {
  const normalizedMessage = normalizePrompt(userMessage);

  return syncSessionWithSlideTexts(
    buildDraftSession({
      sourcePrompt: session.workingDraft.sourcePrompt,
      messages: [
        ...session.messages,
        { role: "user", text: normalizedMessage },
        { role: "assistant", text: normalizePrompt(assistantMessage) },
      ],
      slideTexts,
      templateId: session.workingDraft.templateId,
      colorThemeId: session.workingDraft.colorThemeId,
      audience: session.workingDraft.audience,
      presentationIntent: session.workingDraft.presentationIntent,
      uploadedContent: session.uploadedContent,
      uploadedFileName: session.uploadedFileName,
      clarifyAnswers: session.clarifyAnswers,
    }),
  );
}

export function normalizeDraftSession(raw: unknown): DraftSession {
  if (!isObject(raw)) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нужна draft-сессия для продолжения работы.",
      400,
    );
  }

  if (!isObject(raw.workingDraft) || typeof raw.workingDraft.sourcePrompt !== "string") {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "В draft-сессии потерян рабочий запрос.",
      400,
    );
  }

  const sourcePrompt = normalizePrompt(raw.workingDraft.sourcePrompt);
  if (!sourcePrompt) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "В draft-сессии нет рабочего запроса.",
      400,
    );
  }

  const templateId =
    raw.workingDraft.templateId === "strict" ||
    raw.workingDraft.templateId === "cards" ||
    raw.workingDraft.templateId === "briefing" ||
    raw.workingDraft.templateId === "modern" ||
    raw.workingDraft.templateId === "corporate"
      ? raw.workingDraft.templateId
      : undefined;
  const colorThemeId =
    raw.workingDraft.colorThemeId === "slate" ||
    raw.workingDraft.colorThemeId === "indigo" ||
    raw.workingDraft.colorThemeId === "teal" ||
    raw.workingDraft.colorThemeId === "sand" ||
    raw.workingDraft.colorThemeId === "rose" ||
    raw.workingDraft.colorThemeId === "emerald" ||
    raw.workingDraft.colorThemeId === "violet" ||
    raw.workingDraft.colorThemeId === "zinc"
      ? raw.workingDraft.colorThemeId
      : undefined;
  const audience =
    typeof raw.workingDraft.audience === "string" &&
    normalizePrompt(raw.workingDraft.audience).length > 0
      ? normalizePrompt(raw.workingDraft.audience)
      : undefined;
  const presentationIntent =
    raw.workingDraft.presentationIntent === "update" ||
    raw.workingDraft.presentationIntent === "explain" ||
    raw.workingDraft.presentationIntent === "decision"
      ? raw.workingDraft.presentationIntent
      : undefined;
  const desiredOutcome =
    typeof raw.workingDraft.desiredOutcome === "string" &&
    normalizePrompt(raw.workingDraft.desiredOutcome).length > 0
      ? normalizePrompt(raw.workingDraft.desiredOutcome)
      : undefined;
  const knownFacts = normalizeStringList(raw.workingDraft.knownFacts);
  const missingFacts = normalizeStringList(
    Array.isArray(raw.missingFacts) && raw.missingFacts.length > 0
      ? raw.missingFacts
      : raw.workingDraft.missingFacts,
  );
  const confidence =
    typeof raw.workingDraft.confidence === "number" &&
    Number.isFinite(raw.workingDraft.confidence)
      ? Math.max(0, Math.min(1, raw.workingDraft.confidence))
      : undefined;

  const uploadedContent =
    typeof raw.uploadedContent === "string" && raw.uploadedContent.trim().length > 0
      ? raw.uploadedContent
      : undefined;
  const uploadedFileName =
    typeof raw.uploadedFileName === "string" && raw.uploadedFileName.trim().length > 0
      ? raw.uploadedFileName
      : undefined;

  const clarifyAnswers: ClarifyAnswers | undefined = isObject(raw.clarifyAnswers)
    ? {
        audience:
          typeof raw.clarifyAnswers.audience === "string"
            ? raw.clarifyAnswers.audience
            : undefined,
        length:
          raw.clarifyAnswers.length === "short" ||
          raw.clarifyAnswers.length === "medium" ||
          raw.clarifyAnswers.length === "long"
            ? raw.clarifyAnswers.length
            : undefined,
        style:
          typeof raw.clarifyAnswers.style === "string"
            ? raw.clarifyAnswers.style
            : undefined,
        data:
          typeof raw.clarifyAnswers.data === "string"
            ? raw.clarifyAnswers.data
            : undefined,
        outcome:
          typeof raw.clarifyAnswers.outcome === "string"
            ? raw.clarifyAnswers.outcome
            : undefined,
      }
    : undefined;

  return syncSessionWithSlideTexts(
    buildDraftSession({
      sourcePrompt,
      messages: normalizeMessages(raw.messages),
      slideTexts: normalizeSlideTexts(raw.slideTexts),
      templateId,
      colorThemeId,
      audience,
      presentationIntent,
      desiredOutcome,
      knownFacts,
      missingFacts,
      confidence,
      uploadedContent,
      uploadedFileName,
      clarifyAnswers,
    }),
  );
}
