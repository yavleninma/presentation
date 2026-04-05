import type {
  ClarificationInsights,
  ClarificationSession,
  ClarificationSlot,
  FactCoverageId,
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
  extractShortFacts,
  extractTopicLabel,
  inferStorylineMode,
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
  });
}

export function continueClarification(
  session: ClarificationSession,
  answer: string
): ClarificationSession {
  const nextTranscript = [
    ...session.transcript,
    createMessage("user", normalizeSentence(answer), session.transcript.length + 1),
  ];
  const nextInsights = mergeAnswerIntoInsights(
    session.insights,
    answer,
    session.pendingSlot
  );

  return appendAssistantTurn({
    ...session,
    transcript: nextTranscript,
    insights: nextInsights,
    pendingSlot: null,
  });
}

function appendAssistantTurn(session: ClarificationSession): ClarificationSession {
  const confidence = calculateConfidence(session.insights);
  const forcedReady = session.assistantTurns >= MAX_ASSISTANT_TURNS - 1;
  const ready = forcedReady || isReadyToBuild(session.insights, confidence);

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
  };
}

function analyzePrompt(sourcePrompt: string): ClarificationInsights {
  const mode = inferStorylineMode(sourcePrompt);
  const factCoverage = assessFactCoverage(sourcePrompt);

  return {
    topicLabel: extractTopicLabel(sourcePrompt),
    period: extractPeriod(sourcePrompt),
    mode,
    audience: extractAudience(sourcePrompt),
    keyMessage: extractKeyMessage(sourcePrompt),
    desiredOutcome: extractDesiredOutcome(sourcePrompt, mode),
    factCoverage,
    knownFacts: extractShortFacts(sourcePrompt).slice(0, 3),
    missingFacts: buildMissingFacts(sourcePrompt).slice(
      0,
      factCoverage === "enough" ? 2 : 3
    ),
  };
}

function mergeAnswerIntoInsights(
  insights: ClarificationInsights,
  rawAnswer: string,
  pendingSlot: ClarificationSlot | null
): ClarificationInsights {
  const answer = normalizePrompt(rawAnswer);
  const mode = inferStorylineMode(`${serializeInsights(insights)} ${answer}`) || insights.mode;
  const nextAudience = updateAudience(insights.audience, answer, pendingSlot);
  const nextKeyMessage = updateKeyMessage(insights.keyMessage, answer, pendingSlot);
  const nextDesiredOutcome = updateDesiredOutcome(
    insights.desiredOutcome,
    answer,
    mode,
    pendingSlot
  );
  const nextFactCoverage = updateFactCoverage(
    insights.factCoverage,
    answer,
    pendingSlot
  );
  const facts = mergeFacts(insights.knownFacts, extractShortFacts(answer));
  const missingFacts =
    pendingSlot === "factCoverage" && nextFactCoverage === "enough"
      ? insights.missingFacts.slice(0, 2)
      : insights.missingFacts;

  return {
    ...insights,
    mode,
    audience: nextAudience,
    keyMessage: nextKeyMessage,
    desiredOutcome: nextDesiredOutcome,
    factCoverage: nextFactCoverage,
    knownFacts: facts,
    missingFacts,
  };
}

function calculateConfidence(insights: ClarificationInsights) {
  let score = 0;

  if (insights.audience) {
    score += 1;
  }

  if (insights.keyMessage) {
    score += 1;
  }

  if (insights.desiredOutcome) {
    score += 1;
  }

  if (insights.factCoverage !== "thin") {
    score += 1;
  }

  if (insights.mode === "choice" && insights.desiredOutcome) {
    score += 0.5;
  }

  return score;
}

function isReadyToBuild(insights: ClarificationInsights, confidence: number) {
  if (confidence >= 3) {
    return true;
  }

  if (
    confidence >= 2.5 &&
    Boolean(insights.keyMessage || insights.desiredOutcome)
  ) {
    return true;
  }

  if (
    confidence >= 2 &&
    insights.factCoverage === "enough" &&
    Boolean(insights.keyMessage)
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
    "keyMessage",
    "desiredOutcome",
    "factCoverage",
  ];

  const missing = slotOrder.filter((slot) => {
    if (askedSlots.includes(slot)) {
      return false;
    }

    if (slot === "audience") {
      return !insights.audience;
    }

    if (slot === "keyMessage") {
      return !insights.keyMessage;
    }

    if (slot === "desiredOutcome") {
      return !insights.desiredOutcome;
    }

    return insights.factCoverage === "thin";
  });

  return missing[0] ?? null;
}

function buildQuestionMessage(
  insights: ClarificationInsights,
  slot: ClarificationSlot | null,
  isFirstAssistantTurn: boolean
) {
  const summary = buildConversationSummary(insights);
  const lead = isFirstAssistantTurn
    ? `Понял так: ${summary}`
    : `Держу так: ${summary}`;

  if (!slot) {
    return `${lead} Этого уже хватает, можно собирать черновик.`;
  }

  if (slot === "audience") {
    return `${lead} Кому будете это показывать?`;
  }

  if (slot === "keyMessage") {
    return `${lead} Какой один вывод должен остаться после показа?`;
  }

  if (slot === "desiredOutcome") {
    if (insights.mode === "choice") {
      return `${lead} После показа что нужно согласовать?`;
    }

    if (insights.mode === "structure") {
      return `${lead} После показа что должно стать понятнее?`;
    }

    return `${lead} После показа что человек должен понять или сделать дальше?`;
  }

  return `${lead} Какие факты уже на руках, а что пока оставим как пустое место?`;
}

function buildReadyMessage(
  insights: ClarificationInsights,
  isFirstAssistantTurn: boolean
) {
  const summary = buildConversationSummary(insights);

  if (isFirstAssistantTurn) {
    return `Понял так: ${summary} Этого уже хватает, можно собирать черновик.`;
  }

  return `Теперь картина собрана: ${summary} Дальше можно идти в черновик.`;
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
    `${keyMessage}. Показываем это для ${audience} и держим разговор на ${desiredOutcome.toLowerCase()}.`,
    180
  );
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

function updateKeyMessage(
  currentKeyMessage: string | null,
  answer: string,
  pendingSlot: ClarificationSlot | null
) {
  if (pendingSlot === "keyMessage") {
    return clampText(normalizeSentence(answer), 100);
  }

  return currentKeyMessage ?? extractKeyMessage(answer);
}

function updateDesiredOutcome(
  currentDesiredOutcome: string | null,
  answer: string,
  mode: ClarificationInsights["mode"],
  pendingSlot: ClarificationSlot | null
) {
  if (pendingSlot === "desiredOutcome") {
    return clampText(normalizeSentence(answer), 100);
  }

  return currentDesiredOutcome ?? extractDesiredOutcome(answer, mode);
}

function updateFactCoverage(
  currentCoverage: FactCoverageId,
  answer: string,
  pendingSlot: ClarificationSlot | null
) {
  const nextCoverage = assessFactCoverage(answer);

  if (pendingSlot !== "factCoverage") {
    if (currentCoverage === "enough" || nextCoverage === "thin") {
      return currentCoverage;
    }

    return nextCoverage;
  }

  if (/есть цифры|есть данные|подтверждено|точно есть/i.test(answer)) {
    return "enough";
  }

  if (/нет цифр|пока без цифр|позже добер/i.test(answer)) {
    return "partial";
  }

  return nextCoverage === "thin" ? "partial" : nextCoverage;
}

function mergeFacts(currentFacts: string[], nextFacts: string[]) {
  const uniqueFacts = new Set<string>(currentFacts);

  for (const fact of nextFacts) {
    uniqueFacts.add(fact);
  }

  return Array.from(uniqueFacts).slice(0, 4);
}

function serializeInsights(insights: ClarificationInsights) {
  return [
    insights.topicLabel,
    insights.period,
    insights.audience ?? "",
    insights.keyMessage ?? "",
    insights.desiredOutcome ?? "",
  ].join(" ");
}

function createMessage(
  role: "user" | "assistant",
  text: string,
  index: number
) {
  return {
    id: `${role}-${index}`,
    role,
    text,
  };
}
