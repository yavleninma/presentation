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
  buildStartSummary,
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
  const ready = forcedReady || isReadyToBuild(skeletonReadiness);

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

  const pendingSlot = pickNextSlot(session.insights, session.askedSlots);
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
  const presentationIntent = inferPresentationIntent(sourcePrompt);
  const factCoverage = assessFactCoverage(sourcePrompt);
  const knownFacts = extractKnownFacts(sourcePrompt);
  const missingFacts = resolveMissingFacts(sourcePrompt, factCoverage, knownFacts);
  const audience = extractAudience(sourcePrompt);
  const desiredOutcome = extractDesiredOutcome(sourcePrompt, presentationIntent);
  const skeletonReadiness = buildSkeletonReadiness({
    audience,
    intent: presentationIntent,
    desiredOutcome,
    knownFacts,
    missingFacts,
  });

  return {
    topicLabel: extractTopicLabel(sourcePrompt),
    period: extractPeriod(sourcePrompt),
    audience,
    presentationIntent,
    desiredOutcome,
    keyMessage: extractKeyMessage(sourcePrompt),
    factCoverage,
    knownFacts,
    missingFacts,
    confidence: skeletonReadiness.confidence,
    skeletonReadiness,
  };
}

function mergeAnswerIntoInsights(
  insights: ClarificationInsights,
  answer: string,
  pendingSlot: ClarificationSlot | null
): ClarificationInsights {
  const presentationIntent = updatePresentationIntent(
    insights.presentationIntent,
    answer,
    pendingSlot
  );
  const nextAudience = updateAudience(insights.audience, answer, pendingSlot);
  const nextDesiredOutcome = updateDesiredOutcome(
    insights.desiredOutcome,
    answer,
    presentationIntent,
    pendingSlot
  );
  const nextKeyMessage = insights.keyMessage ?? extractKeyMessage(answer);
  const mergedFacts = updateKnownFacts(insights.knownFacts, answer, pendingSlot);
  const nextFactCoverage = updateFactCoverage(
    insights.factCoverage,
    answer,
    mergedFacts.length
  );
  const nextMissingFacts = updateMissingFacts(
    insights.missingFacts,
    answer,
    nextFactCoverage,
    mergedFacts
  );
  const skeletonReadiness = buildSkeletonReadiness({
    audience: nextAudience,
    intent: presentationIntent,
    desiredOutcome: nextDesiredOutcome,
    knownFacts: mergedFacts,
    missingFacts: nextMissingFacts,
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
  audience,
  intent,
  desiredOutcome,
  knownFacts,
  missingFacts,
}: Omit<SkeletonReadiness, "confidence">): SkeletonReadiness {
  return {
    audience,
    intent,
    desiredOutcome,
    knownFacts,
    missingFacts,
    confidence: calculateSkeletonConfidence({
      audience,
      desiredOutcome,
      knownFacts,
      missingFacts,
    }),
  };
}

function calculateSkeletonConfidence({
  audience,
  desiredOutcome,
  knownFacts,
  missingFacts,
}: Pick<
  SkeletonReadiness,
  "audience" | "desiredOutcome" | "knownFacts" | "missingFacts"
>) {
  let score = 0.2;

  if (audience) {
    score += 0.2;
  }

  if (desiredOutcome) {
    score += 0.25;
  }

  if (knownFacts.length > 0) {
    score += 0.2;
  }

  if (knownFacts.length > 1) {
    score += 0.1;
  }

  if (missingFacts.length > 0) {
    score += 0.05;
  }

  return Math.min(1, score);
}

function isReadyToBuild(readiness: SkeletonReadiness) {
  if (readiness.confidence >= 0.8) {
    return true;
  }

  if (
    readiness.confidence >= 0.65 &&
    Boolean(readiness.desiredOutcome) &&
    readiness.knownFacts.length >= 1
  ) {
    return true;
  }

  if (readiness.confidence >= 0.6 && Boolean(readiness.audience)) {
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

      return insights.knownFacts.length === 0;
    }) ?? null
  );
}

function buildQuestionMessage(
  insights: ClarificationInsights,
  slot: ClarificationSlot | null,
  isFirstAssistantTurn: boolean
) {
  const summary = buildConversationSummary(insights);
  const lead = isFirstAssistantTurn
    ? `Сейчас вижу: ${summary}`
    : `Сейчас вижу так: ${summary}`;

  if (!slot) {
    return `${lead} Этого уже хватает, можно собирать черновик.`;
  }

  if (slot === "audience") {
    return `${lead} Кому это будете показывать?`;
  }

  if (slot === "desiredOutcome") {
    if (insights.presentationIntent === "decision") {
      return `${lead} После показа что нужно согласовать?`;
    }

    if (insights.presentationIntent === "explain") {
      return `${lead} После показа что должно стать понятнее?`;
    }

    return `${lead} После показа что человек должен понять или сделать дальше?`;
  }

  return `${lead} Какие 1-2 факта уже точно можно назвать, а что честно оставим как пробел?`;
}

function buildReadyMessage(
  insights: ClarificationInsights,
  isFirstAssistantTurn: boolean
) {
  const summary = buildConversationSummary(insights);

  if (isFirstAssistantTurn) {
    return `Сейчас вижу: ${summary} Этого уже хватает, можно собирать черновик.`;
  }

  return `Картина собрана: ${summary} Дальше можно идти в черновик.`;
}

function buildConversationSummary(insights: ClarificationInsights) {
  const audience =
    insights.audience?.replace(/\.$/, "") ?? "нужного адресата";
  const keyMessage =
    insights.keyMessage?.replace(/\.$/, "") ??
    buildStartSummary(insights.knownFacts[0] ?? insights.topicLabel).replace(
      /\.$/,
      ""
    );
  const desiredOutcome =
    insights.desiredOutcome?.replace(/\.$/, "") ?? "понятный следующий шаг";

  return clampText(
    `${keyMessage}. Показываем это для ${audience} и держим фокус на ${desiredOutcome.toLowerCase()}.`,
    180
  );
}

function updatePresentationIntent(
  currentIntent: PresentationIntent,
  answer: string,
  pendingSlot: ClarificationSlot | null
) {
  const inferredIntent = inferPresentationIntent(answer);

  if (pendingSlot === "desiredOutcome" && inferredIntent !== "update") {
    return inferredIntent;
  }

  if (currentIntent === "update" && inferredIntent !== "update") {
    return inferredIntent;
  }

  return currentIntent;
}

function updateAudience(
  currentAudience: string | null,
  answer: string,
  pendingSlot: ClarificationSlot | null
) {
  if (currentAudience && pendingSlot !== "audience") {
    return currentAudience;
  }

  const extracted = extractAudience(answer);

  if (extracted) {
    return extracted;
  }

  if (pendingSlot === "audience") {
    return clampText(normalizeSentence(answer), 42);
  }

  return currentAudience;
}

function updateDesiredOutcome(
  currentDesiredOutcome: string | null,
  answer: string,
  intent: PresentationIntent,
  pendingSlot: ClarificationSlot | null
) {
  if (pendingSlot === "desiredOutcome") {
    return clampText(normalizeSentence(answer), 100);
  }

  return currentDesiredOutcome ?? extractDesiredOutcome(answer, intent);
}

function updateKnownFacts(
  currentFacts: string[],
  answer: string,
  pendingSlot: ClarificationSlot | null
) {
  const extracted = extractKnownFacts(answer);

  if (!extracted.length && pendingSlot === "knownFacts") {
    return currentFacts;
  }

  return mergeFacts(currentFacts, extracted).slice(0, 4);
}

function updateFactCoverage(
  currentCoverage: FactCoverageId,
  answer: string,
  factCount: number
) {
  if (factCount >= 2) {
    return "partial";
  }

  const nextCoverage = assessFactCoverage(answer);

  if (currentCoverage === "enough") {
    return "enough";
  }

  return nextCoverage;
}

function updateMissingFacts(
  currentMissingFacts: string[],
  answer: string,
  factCoverage: FactCoverageId,
  facts: string[]
) {
  if (factCoverage === "enough") {
    return [];
  }

  const officePlaceholders = buildMissingFacts(answer);

  if (officePlaceholders.length > 0) {
    return officePlaceholders.slice(0, facts.length > 1 ? 2 : 3);
  }

  return currentMissingFacts.slice(0, facts.length > 1 ? 2 : 3);
}

function extractKnownFacts(source: string) {
  return source
    .split(/[.!?;]+/)
    .map((item) => normalizeSentence(item))
    .filter((item) => item.length > 18)
    .slice(0, 3);
}

function resolveMissingFacts(
  sourcePrompt: string,
  factCoverage: FactCoverageId,
  knownFacts: string[]
) {
  if (factCoverage === "enough") {
    return [];
  }

  const placeholders = buildMissingFacts(sourcePrompt);

  return placeholders.slice(0, knownFacts.length > 1 ? 2 : 3);
}

function mergeFacts(currentFacts: string[], nextFacts: string[]) {
  const facts = new Set<string>(currentFacts);

  for (const fact of nextFacts) {
    facts.add(fact);
  }

  return Array.from(facts);
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
  };
}
