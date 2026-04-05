import type {
  ClarificationInsights,
  ClarificationMessage,
  ClarificationSession,
  ClarificationSlot,
  FactCoverageId,
  PresentationIntent,
  SkeletonReadiness,
} from "@/lib/presentation-types";
import {
  assessFactCoverage,
  buildMissingFacts,
  buildPromptSignals,
  clampText,
  extractAudience,
  extractDesiredOutcome,
  extractKeyMessage,
  extractPeriod,
  extractTopicLabel,
  inferPresentationIntent,
  normalizePrompt,
  normalizeSentence,
} from "@/lib/prompt-analysis";

const MAX_ASSISTANT_TURNS = 5;
const LOCAL_GENERIC_TOPIC_LABELS = new Set([
  "рабочая тема",
  "текущий период",
  "нужного адресата",
  "реального разговора",
  "разговор",
  "презентация",
  "проект",
  "команда",
]);
const LOCAL_FACT_HINTS =
  /\b(?:\d+(?:[.,]\d+)?%?|q[1-4]\b|mvp|пилот|мигр|сниз|работ|упёр|застрял|сигнал|факт|подтвержд|доказ|срок|найм|бюдж|ресурс|риск|блокер|охват|выборк|coverage|latency|time|speed|mini-chat|мини-чат|черновик|редактор|пересбор|слайд|тихий)\b/i;
const LOCAL_RISK_HINTS =
  /\b(?:риск|риски|блокер|блокеры|упёр|застрял|не хватает|мешает|срок|найм|бюджет|ресурс|приоритет|coverage|latency|speed)\b/i;

export function beginClarification(prompt: string): ClarificationSession {
  const sourcePrompt = normalizePrompt(prompt);
  const insights = analyzePrompt(sourcePrompt);

  return appendAssistantTurn({
    transcript: [createMessage("user", sourcePrompt, 1)],
    assistantTurns: 0,
    confidence: 0,
    readyToBuild: false,
    pendingSlot: null,
    askedSlots: [],
    insights,
    skeletonReadiness: insights.skeletonReadiness,
  });
}

export function continueClarification(
  session: ClarificationSession,
  answer: string
): ClarificationSession {
  const normalizedAnswer = normalizeSentence(answer);
  const nextTranscript = [
    ...session.transcript,
    createMessage("user", normalizedAnswer, session.transcript.length + 1),
  ];
  const nextInsights = mergeAnswerIntoInsights(
    session.insights,
    normalizedAnswer,
    session.pendingSlot
  );

  return appendAssistantTurn({
    ...session,
    transcript: nextTranscript,
    insights: nextInsights,
    pendingSlot: null,
    skeletonReadiness: nextInsights.skeletonReadiness,
  });
}

function appendAssistantTurn(session: ClarificationSession): ClarificationSession {
  const skeletonReadiness = session.insights.skeletonReadiness;
  const confidence = skeletonReadiness.confidence;
  const forcedReady = session.assistantTurns >= MAX_ASSISTANT_TURNS - 1;
  let ready = forcedReady || isReadyToBuild(session.insights);
  let pendingSlot: ClarificationSlot | null = null;

  if (!ready) {
    pendingSlot = pickNextSlot(session.insights, session.askedSlots);

    if (!pendingSlot) {
      ready = true;
    }
  }

  if (ready) {
    const assistantText = buildReadyMessage(
      session.insights,
      session.assistantTurns === 0
    );

    return {
      ...session,
      transcript: [
        ...session.transcript,
        createMessage(
          "assistant",
          assistantText,
          session.transcript.length + 1
        ),
      ],
      assistantTurns: session.assistantTurns + 1,
      confidence,
      readyToBuild: true,
      pendingSlot: null,
      skeletonReadiness,
    };
  }

  const assistantText = buildQuestionMessage(
    session.insights,
    pendingSlot,
    session.assistantTurns === 0
  );

  return {
    ...session,
    transcript: [
      ...session.transcript,
      createMessage("assistant", assistantText, session.transcript.length + 1),
    ],
    assistantTurns: session.assistantTurns + 1,
    confidence,
    readyToBuild: false,
    pendingSlot,
    askedSlots: pendingSlot
      ? [...session.askedSlots, pendingSlot]
      : session.askedSlots,
    skeletonReadiness,
  };
}

function analyzePrompt(sourcePrompt: string): ClarificationInsights {
  const signals = buildPromptSignals(sourcePrompt);
  const skeletonReadiness = buildSkeletonReadiness({
    topicLabel: signals.topicLabel,
    audience: signals.audience,
    intent: signals.presentationIntent,
    desiredOutcome: signals.desiredOutcome,
    knownFacts: signals.knownFacts,
    missingFacts: signals.missingFacts,
    keyMessage: signals.keyMessage,
    riskLine: signals.riskLine,
  });

  return {
    topicLabel: signals.topicLabel,
    period: signals.period,
    audience: signals.audience,
    presentationIntent: signals.presentationIntent,
    desiredOutcome: signals.desiredOutcome,
    keyMessage: signals.keyMessage,
    factCoverage: signals.factCoverage,
    knownFacts: signals.knownFacts,
    missingFacts: signals.missingFacts,
    confidence: skeletonReadiness.confidence,
    skeletonReadiness,
  };
}

function mergeAnswerIntoInsights(
  insights: ClarificationInsights,
  answer: string,
  pendingSlot: ClarificationSlot | null
): ClarificationInsights {
  const answerSignals = buildPromptSignals(answer, insights.presentationIntent);
  const presentationIntent = mergePresentationIntent(
    insights.presentationIntent,
    answerSignals.presentationIntent,
    pendingSlot
  );
  const nextAudience = mergeText(
    insights.audience,
    answerSignals.audience,
    pendingSlot === "audience"
  );
  const nextDesiredOutcome = mergeText(
    insights.desiredOutcome,
    answerSignals.desiredOutcome,
    pendingSlot === "desiredOutcome"
  );
  const nextKeyMessage = insights.keyMessage ?? answerSignals.keyMessage;
  const mergedFacts = mergeFacts(
    insights.knownFacts,
    answerSignals.knownFacts,
    answerSignals.riskLine ? [answerSignals.riskLine] : []
  ).slice(0, 4);
  const nextFactCoverage = mergeFactCoverage(
    insights.factCoverage,
    answerSignals.factCoverage,
    mergedFacts
  );
  const nextMissingFacts = mergeMissingFacts(
    insights.missingFacts,
    answerSignals.missingFacts,
    mergedFacts,
    nextFactCoverage
  );
  const skeletonReadiness = buildSkeletonReadiness({
    topicLabel: insights.topicLabel,
    audience: nextAudience,
    intent: presentationIntent,
    desiredOutcome: nextDesiredOutcome,
    knownFacts: mergedFacts,
    missingFacts: nextMissingFacts,
    keyMessage: nextKeyMessage,
    riskLine: answerSignals.riskLine,
  });

  return {
    ...insights,
    audience: nextAudience,
    presentationIntent,
    desiredOutcome: nextDesiredOutcome,
    keyMessage: nextKeyMessage,
    factCoverage: nextFactCoverage,
    knownFacts: mergedFacts,
    missingFacts: nextMissingFacts,
    confidence: skeletonReadiness.confidence,
    skeletonReadiness,
  };
}

function buildSkeletonReadiness({
  topicLabel,
  audience,
  intent,
  desiredOutcome,
  knownFacts,
  missingFacts,
  keyMessage,
  riskLine,
}: Omit<SkeletonReadiness, "confidence"> & {
  topicLabel?: string;
  keyMessage?: string | null;
  riskLine?: string | null;
}): SkeletonReadiness {
  return {
    audience,
    intent,
    desiredOutcome,
    knownFacts,
    missingFacts,
    confidence: calculateSkeletonConfidence({
      topicLabel,
      audience,
      desiredOutcome,
      knownFacts,
      missingFacts,
      keyMessage,
      riskLine,
    }),
  };
}

function calculateSkeletonConfidence({
  topicLabel,
  audience,
  desiredOutcome,
  knownFacts,
  missingFacts,
  keyMessage,
  riskLine,
}: Pick<
  SkeletonReadiness,
  "audience" | "desiredOutcome" | "knownFacts" | "missingFacts"
> & {
  topicLabel?: string;
  keyMessage?: string | null;
  riskLine?: string | null;
}) {
  let score = 0.08;

  if (isMeaningfulTopicLabel(topicLabel)) {
    score += 0.18;
  }

  if (audience && isMeaningfulAudience(audience)) {
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

  if (knownFacts.some((fact) => isFactLike(fact))) {
    score += Math.min(0.2, knownFacts.length * 0.06);
  }

  if (knownFacts.length > 1) {
    score += 0.06;
  }

  if (missingFacts.length <= 1) {
    score += 0.03;
  } else if (missingFacts.length === 0) {
    score += 0.05;
  }

  return Math.min(1, score);
}

function isReadyToBuild(insights: ClarificationInsights) {
  const readiness = insights.skeletonReadiness;
  const concreteFacts = readiness.knownFacts.filter((fact) => isFactLike(fact));
  const riskAnchored = readiness.knownFacts.some((fact) => /\b(?:риск|блокер|упёр|застрял|не хватает|мешает|срок|найм|бюджет|ресурс|приоритет)\b/i.test(fact));

  if (!isMeaningfulTopicLabel(insights.topicLabel)) {
    return false;
  }

  if (
    readiness.confidence >= 0.78 &&
    Boolean(readiness.audience) &&
    Boolean(readiness.desiredOutcome) &&
    concreteFacts.length >= 1 &&
    (riskAnchored || concreteFacts.length >= 2)
  ) {
    return true;
  }

  if (
    readiness.confidence >= 0.7 &&
    Boolean(readiness.audience) &&
    concreteFacts.length >= 2
  ) {
    return true;
  }

  if (
    readiness.confidence >= 0.74 &&
    Boolean(readiness.desiredOutcome) &&
    concreteFacts.length >= 2 &&
    riskAnchored
  ) {
    return true;
  }

  return false;
}

function pickNextSlot(
  insights: ClarificationInsights,
  askedSlots: ClarificationSlot[]
): ClarificationSlot | null {
  const slotOrder: ClarificationSlot[] = [
    "audience",
    "desiredOutcome",
    "knownFacts",
  ];

  return (
    slotOrder.find((slot) => {
      if (askedSlots.includes(slot)) {
        return false;
      }

      if (slot === "audience") {
        return !insights.audience;
      }

      if (slot === "desiredOutcome") {
        return !insights.desiredOutcome;
      }

      return needsFactFollowUp(insights);
    }) ?? null
  );
}

function buildQuestionMessage(
  insights: ClarificationInsights,
  slot: ClarificationSlot | null,
  isFirstAssistantTurn: boolean
) {
  const lead = isFirstAssistantTurn ? buildConversationLead(insights) : "";
  const prefix = lead ? `${lead} ` : "";

  if (!slot) {
    return `${prefix}Этого уже хватает для черновика.`;
  }

  if (slot === "audience") {
    return `${prefix}Кому показываем?`;
  }

  if (slot === "desiredOutcome") {
    if (insights.presentationIntent === "decision") {
      return `${prefix}Что после показа нужно согласовать?`;
    }

    if (insights.presentationIntent === "explain") {
      return `${prefix}Что после показа должно стать понятнее?`;
    }

    return `${prefix}Что нужно получить после показа?`;
  }

  return `${prefix}Какие 1-2 факта уже можно назвать?`;
}

function buildReadyMessage(
  insights: ClarificationInsights,
  isFirstAssistantTurn: boolean
) {
  if (!isFirstAssistantTurn) {
    return "Этого уже хватает для черновика.";
  }

  const lead = buildConversationLead(insights);

  if (lead === "Понял.") {
    return "Этого уже хватает для черновика.";
  }

  return `${lead} Этого уже хватает для черновика.`;
}

function buildConversationLead(insights: ClarificationInsights) {
  const topic = insights.topicLabel;
  const topicLabel = isMeaningfulTopicLabel(topic) ? clampText(topic, 42) : null;
  const period =
    insights.period && insights.period !== "текущий период"
      ? clampText(insights.period, 24)
      : null;

  if (topicLabel && period) {
    return `Понял, это про ${topicLabel} за ${period}.`;
  }

  if (topicLabel) {
    return `Понял, это про ${topicLabel}.`;
  }

  if (period) {
    return `Понял, это про ${period}.`;
  }

  return "Понял.";
}

function mergePresentationIntent(
  currentIntent: PresentationIntent,
  nextIntent: PresentationIntent,
  pendingSlot: ClarificationSlot | null
) {
  if (pendingSlot === "desiredOutcome" && nextIntent !== "update") {
    return nextIntent;
  }

  if (currentIntent === "update" && nextIntent !== "update") {
    return nextIntent;
  }

  return currentIntent;
}

function mergeText(
  currentValue: string | null,
  nextValue: string | null,
  preferNext: boolean
) {
  if (preferNext) {
    return nextValue ?? currentValue;
  }

  return currentValue ?? nextValue;
}

function mergeFactCoverage(
  currentCoverage: FactCoverageId,
  nextCoverage: FactCoverageId,
  mergedFacts: string[]
) {
  if (currentCoverage === "enough" && mergedFacts.length >= 1) {
    return "enough";
  }

  if (nextCoverage === "enough" && mergedFacts.length >= 1) {
    return "enough";
  }

  if (mergedFacts.length >= 2) {
    return "partial";
  }

  return nextCoverage;
}

function mergeMissingFacts(
  currentMissingFacts: string[],
  nextMissingFacts: string[],
  mergedFacts: string[],
  factCoverage: FactCoverageId
) {
  if (factCoverage === "enough") {
    return [];
  }

  if (nextMissingFacts.length > 0) {
    return nextMissingFacts.slice(0, mergedFacts.length > 1 ? 2 : 3);
  }

  return currentMissingFacts.slice(0, mergedFacts.length > 1 ? 2 : 3);
}

function isMeaningfulTopicLabel(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = normalizePrompt(value).toLowerCase();

  if (!normalized || LOCAL_GENERIC_TOPIC_LABELS.has(normalized)) {
    return false;
  }

  if (/^(?:собери|нужно|надо|показать|показываем|реального разговора)/i.test(normalized)) {
    return false;
  }

  return normalized.length > 2;
}

function isMeaningfulAudience(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = normalizePrompt(value).toLowerCase();

  return Boolean(normalized) && !/реальн[а-я]*\s+разговор|текущ[а-я]*\s+период|рабоч[а-я]*\s+тема/i.test(normalized);
}

function mergeFacts(currentFacts: string[], ...nextFactsGroups: string[][]) {
  const facts = new Set<string>(currentFacts);

  for (const nextFacts of nextFactsGroups) {
    for (const fact of nextFacts) {
      facts.add(fact);
    }
  }

  return Array.from(facts);
}

function isFactLike(value: string) {
  return LOCAL_FACT_HINTS.test(value) || LOCAL_RISK_HINTS.test(value) || /mvp|подтвержд|доказ|работ/i.test(value);
}

function needsFactFollowUp(insights: ClarificationInsights) {
  const concreteFacts = insights.knownFacts.filter((fact) => isFactLike(fact));
  const hasRiskAnchor = concreteFacts.some((fact) => LOCAL_RISK_HINTS.test(fact));

  if (concreteFacts.length === 0) {
    return true;
  }

  if (concreteFacts.length === 1 && !hasRiskAnchor) {
    return true;
  }

  return false;
}

function formatMessageTime(): string {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function createMessage(
  role: ClarificationMessage["role"],
  text: string,
  position: number
): ClarificationMessage {
  return {
    id: `${role}-${position}`,
    role,
    text,
    time: formatMessageTime(),
  };
}
