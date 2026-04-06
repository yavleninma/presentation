import type {
  CanvasLayoutId,
  ColorThemeId,
  DraftFitPassStrength,
  FitPassResult,
  HiddenTransformId,
  PresentationDraft,
  PresentationSlide,
  SixSlotTuple,
  SlideActionLabel,
  SlideBlock,
  SlideFunctionId,
  SlideId,
  SlideSlotId,
  SlideTextEntry,
  SlideToneId,
  TemplateIconPackId,
  TemplateId,
  WorkingDraft,
  WorkingDraftSlidePlanEntry,
} from "@/lib/presentation-types";
import {
  COLOR_OPTIONS,
  EXAMPLE_PROMPTS,
  SCENARIO_CHIPS,
  START_SCREEN_ENABLED_SCENARIO_ID,
  TEMPLATE_OPTIONS,
} from "@/lib/presentation-options";
import {
  buildPromptSignals,
  clampText,
  extractKeyMessage,
  extractPeriod,
  extractTopicLabel,
  normalizePrompt,
} from "@/lib/prompt-analysis";
export {
  COLOR_OPTIONS,
  EXAMPLE_PROMPTS,
  SCENARIO_CHIPS,
  START_SCREEN_ENABLED_SCENARIO_ID,
  TEMPLATE_OPTIONS,
} from "@/lib/presentation-options";

const DEFAULT_TEMPLATE: TemplateId = "cards";
const DEFAULT_COLOR_THEME: ColorThemeId = "indigo";

const SLOT_MAP: Array<{ id: SlideId; slotId: SlideSlotId; fn: SlideFunctionId }> = [
  { id: "slide-1", slotId: 1, fn: "open_topic" },
  { id: "slide-2", slotId: 2, fn: "main_point" },
  { id: "slide-3", slotId: 3, fn: "movement" },
  { id: "slide-4", slotId: 4, fn: "evidence" },
  { id: "slide-5", slotId: 5, fn: "tension" },
  { id: "slide-6", slotId: 6, fn: "next_step" },
];

/** Подписи rail как в макете v3 (Figma Screens / Brand Kit). */
const FIGMA_RAIL_LABEL_BY_SLOT: Record<SlideSlotId, string> = {
  1: "Обложка",
  2: "Проблема",
  3: "Три шага",
  4: "Результат",
  5: "Для кого",
  6: "След. шаг",
};

const TEMPLATE_ICON_PACKS: Record<TemplateId, TemplateIconPackId> = {
  strict: "outline",
  cards: "solid-minimal",
  briefing: "duotone-minimal",
};

type WorkingDraftSeed = Omit<WorkingDraft, "slidePlan" | "visibleSlideTitles">;

type DraftSignals = {
  topic: string;
  topicLower: string;
  period: string;
  audience: string;
  desiredOutcome: string;
  keyMessage: string | null;
  facts: string[];
  gaps: string[];
  primaryFact: string | null;
  secondaryFact: string | null;
  primaryGap: string | null;
  riskLine: string | null;
  hasResourceIntent: boolean;
  specificPeriod: boolean;
  presentationIntent: WorkingDraftSeed["presentationIntent"];
};

export function getTemplateIconPack(templateId: TemplateId) {
  return TEMPLATE_ICON_PACKS[templateId];
}

export function buildWorkingDraftFromPrompt(
  sourcePrompt: string,
  overrides: Partial<
    Pick<
      WorkingDraft,
      | "audience"
      | "presentationIntent"
      | "desiredOutcome"
      | "knownFacts"
      | "missingFacts"
      | "confidence"
      | "templateId"
      | "colorThemeId"
    >
  > = {}
): WorkingDraft {
  const promptSignals = buildPromptSignals(
    sourcePrompt,
    overrides.presentationIntent
  );
  const presentationIntent =
    overrides.presentationIntent ?? promptSignals.presentationIntent;
  const baseSeed: WorkingDraftSeed = {
    sourcePrompt,
    audience: overrides.audience ?? promptSignals.audience ?? "Рабочая аудитория",
    presentationIntent,
    desiredOutcome:
      overrides.desiredOutcome ??
      promptSignals.desiredOutcome ??
      buildFallbackOutcome(presentationIntent),
    knownFacts:
      overrides.knownFacts && overrides.knownFacts.length > 0
        ? overrides.knownFacts.slice(0, 3)
        : promptSignals.knownFacts.slice(0, 3),
    missingFacts:
      overrides.missingFacts && overrides.missingFacts.length > 0
        ? overrides.missingFacts.slice(0, 3)
        : promptSignals.missingFacts.slice(0, 3),
    confidence: overrides.confidence ?? promptSignals.confidence,
    templateId: overrides.templateId ?? DEFAULT_TEMPLATE,
    colorThemeId: overrides.colorThemeId ?? DEFAULT_COLOR_THEME,
  };

  const slidePlan = tuple6(
    SLOT_MAP.map(({ fn, slotId }) =>
      buildSlidePlanEntry(baseSeed, fn, slotId, null)
    )
  );

  return normalizeWorkingDraft({
    ...baseSeed,
    slidePlan,
    visibleSlideTitles: tuple6([
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  });
}

export function buildPresentationDraft(
  workingDraft: WorkingDraft,
  options: {
    documentTitle?: string;
    slideSpeakerNotes?: PresentationDraft["slideSpeakerNotes"];
    fitPassStrength?: DraftFitPassStrength;
  } = {}
): PresentationDraft {
  const normalizedWorkingDraft = normalizeWorkingDraft(workingDraft);
  const slides = normalizedWorkingDraft.slidePlan.map((entry, index) =>
    buildPresentationSlide(
      entry,
      normalizedWorkingDraft.visibleSlideTitles[index],
      normalizedWorkingDraft
    )
  );
  const draft: PresentationDraft = {
    documentTitle: options.documentTitle ?? buildDocumentTitle(normalizedWorkingDraft),
    documentSubtitle: `${extractPeriod(normalizedWorkingDraft.sourcePrompt)} · ${normalizedWorkingDraft.audience}`,
    workingDraft: normalizedWorkingDraft,
    slides,
    slideSpeakerNotes: options.slideSpeakerNotes ?? {},
    fitPassStrength: options.fitPassStrength,
    debug: {
      currentWorkingDraft: normalizedWorkingDraft,
      hiddenSlidePlan: normalizedWorkingDraft.slidePlan,
      chosenTransformIds: {} as PresentationDraft["debug"]["chosenTransformIds"],
      fitPassResultBySlide: {} as PresentationDraft["debug"]["fitPassResultBySlide"],
    },
  };

  return runFitPassOnDraft(draft);
}

export function updateDraftAppearance(
  draft: PresentationDraft,
  appearance: { templateId?: TemplateId; colorThemeId?: ColorThemeId }
): PresentationDraft {
  const nextWorkingDraft = normalizeWorkingDraft({
    ...draft.workingDraft,
    templateId: appearance.templateId ?? draft.workingDraft.templateId,
    colorThemeId: appearance.colorThemeId ?? draft.workingDraft.colorThemeId,
  });

  return runFitPassOnDraft({
    ...draft,
    workingDraft: nextWorkingDraft,
  });
}

export function runFitPassOnDraft(draft: PresentationDraft): PresentationDraft {
  const strength: DraftFitPassStrength = draft.fitPassStrength ?? "strict";
  const chosenTransformIds = {} as PresentationDraft["debug"]["chosenTransformIds"];
  const fitPassResultBySlide =
    {} as PresentationDraft["debug"]["fitPassResultBySlide"];
  const slides = draft.slides.map((slide, index) => {
    const result = fitSlide(slide, draft.workingDraft, strength);
    chosenTransformIds[slide.id] = draft.workingDraft.slidePlan[index].lastTransformId;
    fitPassResultBySlide[slide.id] = result.fit;
    return result.slide;
  });

  return {
    ...draft,
    slides,
    debug: {
      currentWorkingDraft: draft.workingDraft,
      hiddenSlidePlan: draft.workingDraft.slidePlan,
      chosenTransformIds,
      fitPassResultBySlide,
    },
  };
}

export function regenerateSlide(
  draft: PresentationDraft,
  slideId: SlideId,
  transformId: HiddenTransformId
): PresentationDraft {
  const slotIndex = draft.slides.findIndex((slide) => slide.id === slideId);

  if (slotIndex === -1) {
    return draft;
  }

  const currentEntry = draft.workingDraft.slidePlan[slotIndex];
  const nextEntry = buildSlidePlanEntry(
    draft.workingDraft,
    currentEntry.slideFunctionId,
    currentEntry.slotId,
    transformId
  );
  const nextSlidePlan = tuple6(replaceAt(draft.workingDraft.slidePlan, slotIndex, nextEntry));
  const nextWorkingDraft = normalizeWorkingDraft({
    ...draft.workingDraft,
    slidePlan: nextSlidePlan,
  });

  return buildPresentationDraft(nextWorkingDraft, {
    documentTitle: draft.documentTitle,
    slideSpeakerNotes: draft.slideSpeakerNotes,
    fitPassStrength: draft.fitPassStrength,
  });
}

function slideFunctionToLayout(slideFunctionId: SlideFunctionId): CanvasLayoutId {
  switch (slideFunctionId) {
    case "open_topic": return "cover";
    case "main_point": return "metrics";
    case "movement": return "steps";
    case "evidence": return "checklist";
    case "tension": return "personas";
    case "next_step": return "features";
  }
}

function chooseBestLayout(slideFunctionId: SlideFunctionId, signals: DraftSignals): CanvasLayoutId {
  if (slideFunctionId === "main_point") {
    const factLines = signals.facts.filter((f) => f.length > 0);
    const metricValues = extractMetricValues(factLines);
    if (metricValues.length === 1) return "stat-focus";
    return "metrics";
  }

  if (slideFunctionId === "evidence") {
    if (detectComparison(signals)) return "comparison";
    return "checklist";
  }

  if (slideFunctionId === "tension") {
    const audienceParts = splitAudience(signals.audience);
    if (audienceParts.length >= 2) return "personas";
    return "quote";
  }

  return slideFunctionToLayout(slideFunctionId);
}

function detectComparison(signals: DraftSignals): boolean {
  return !!(
    signals.primaryGap &&
    signals.desiredOutcome &&
    !isPlaceholderToken(signals.primaryGap) &&
    !isPlaceholderToken(signals.desiredOutcome) &&
    signals.primaryGap !== signals.desiredOutcome
  );
}

function buildSlidePlanEntry(
  workingDraft: WorkingDraftSeed | WorkingDraft,
  slideFunctionId: SlideFunctionId,
  slotId: SlideSlotId,
  lastTransformId: HiddenTransformId | null
): WorkingDraftSlidePlanEntry {
  const signals = deriveDraftSignals(workingDraft);
  const transformId = lastTransformId ?? intentToTransform(workingDraft.presentationIntent);
  const coreMessage = buildCoreMessage(signals, slideFunctionId);
  const canvasLayoutId = chooseBestLayout(slideFunctionId, signals);
  const blocks = buildBlocks(signals, slideFunctionId, transformId, coreMessage, canvasLayoutId);

  return {
    slotId,
    slideFunctionId,
    canvasLayoutId,
    coreMessage,
    blockPlan: blocks,
    placeholderPlan: blocks.filter((block) => block.placeholder).map((block) => block.body),
    speakerAngle: buildSpeakerAngle(slideFunctionId),
    lastTransformId,
  };
}

function buildPresentationSlide(
  entry: WorkingDraftSlidePlanEntry,
  title: string,
  workingDraft: WorkingDraft
): PresentationSlide {
  const slideId = SLOT_MAP[entry.slotId - 1].id;
  const signals = deriveDraftSignals(workingDraft);
  const railTitle = `${entry.slotId} — ${FIGMA_RAIL_LABEL_BY_SLOT[entry.slotId]}`;

  return {
    id: slideId,
    slotId: entry.slotId,
    slideFunctionId: entry.slideFunctionId,
    canvasLayoutId: entry.canvasLayoutId,
    index: String(entry.slotId).padStart(2, "0"),
    railTitle: clampText(railTitle, 44),
    railRhythm: entry.blockPlan.map(blockTone).slice(0, 4),
    title,
    subtitle: buildSubtitle(signals, entry, title),
    blocks: entry.blockPlan,
    drawerActions: buildActionLabels(signals, entry, title),
    lastTransformId: entry.lastTransformId,
  };
}

function normalizeWorkingDraft(workingDraft: WorkingDraft): WorkingDraft {
  return {
    ...workingDraft,
    visibleSlideTitles: buildVisibleTitles(workingDraft, workingDraft.slidePlan),
  };
}

const FIT_PASS_LIMITS: Record<
  DraftFitPassStrength,
  {
    title: number;
    subtitle: number;
    blockTitle: number;
    blockBody: number;
    blockBodyPlaceholder: number;
    railTitle: number;
    actionLabel: number;
    overflowTitleWidth: number;
    overflowBlockTitleWidth: number;
    overflowHeightChars: number;
  }
> = {
  strict: {
    title: 78,
    subtitle: 84,
    blockTitle: 34,
    blockBody: 156,
    blockBodyPlaceholder: 96,
    railTitle: 44,
    actionLabel: 32,
    overflowTitleWidth: 72,
    overflowBlockTitleWidth: 30,
    overflowHeightChars: 440,
  },
  editor: {
    title: 140,
    subtitle: 220,
    blockTitle: 320,
    blockBody: 900,
    blockBodyPlaceholder: 400,
    railTitle: 96,
    actionLabel: 96,
    overflowTitleWidth: 132,
    overflowBlockTitleWidth: 300,
    overflowHeightChars: 4000,
  },
};

function fitSlide(
  slide: PresentationSlide,
  workingDraft: WorkingDraft,
  strength: DraftFitPassStrength = "strict",
) {
  const L = FIT_PASS_LIMITS[strength];
  let titleShortened = false;
  let textCompressed = false;
  let blockTrimmed = false;
  let actionShortened = false;
  const notes: string[] = [];

  const title = clampText(slide.title, L.title);
  if (title !== slide.title) {
    titleShortened = true;
    notes.push("fit-pass сократил заголовок");
  }

  const subtitle = slide.subtitle ? clampText(slide.subtitle, L.subtitle) : "";
  if (subtitle !== slide.subtitle) {
    textCompressed = true;
    notes.push("fit-pass сократил подзаголовок");
  }

  const maxBlocks =
    slide.canvasLayoutId === "checklist" ? 4 :
    slide.canvasLayoutId === "cover" ? 1 :
    slide.canvasLayoutId === "stat-focus" ? 2 :
    slide.canvasLayoutId === "quote" ? 2 :
    slide.canvasLayoutId === "comparison" ? 2 :
    3;
  const blocks = slide.blocks.slice(0, maxBlocks).map((block) => {
    const next = {
      ...block,
      title: clampText(block.title, L.blockTitle),
      body: clampText(
        block.body,
        block.placeholder ? L.blockBodyPlaceholder : L.blockBody,
      ),
    };

    if (next.title !== block.title || next.body !== block.body) {
      textCompressed = true;
    }

    return next;
  });

  if (blocks.length !== slide.blocks.length) {
    blockTrimmed = true;
    notes.push("fit-pass убрал лишний блок");
  }

  const drawerActions = slide.drawerActions.map((action) => {
    const label = clampText(action.label, L.actionLabel);

    if (label !== action.label) {
      actionShortened = true;
    }

    return {
      ...action,
      label,
    };
  });

  if (actionShortened) {
    notes.push("fit-pass сократил действие");
  }

  const totalChars =
    title.length +
    subtitle.length +
    blocks.reduce((sum, block) => sum + block.title.length + block.body.length, 0);

  return {
    slide: {
      ...slide,
      title,
      subtitle,
      railTitle: clampText(slide.railTitle, L.railTitle),
      railRhythm: blocks.map(blockTone).slice(0, 4),
      blocks,
      drawerActions,
    },
    fit: {
      slideId: slide.id,
      overflowWidthRisk:
        title.length > L.overflowTitleWidth ||
        blocks.some((block) => block.title.length > L.overflowBlockTitleWidth),
      overflowHeightRisk: totalChars > L.overflowHeightChars,
      titleShortened,
      textCompressed,
      blockTrimmed,
      secondaryMoved: false,
      placeholderVisible: blocks.some((block) => block.placeholder)
        ? blocks.some((block) => block.placeholder && block.body.trim().length > 0)
        : true,
      iconConsistent: blocks.every((block) => Boolean(block.icon)),
      contrastSafe: ["slate", "indigo", "teal", "sand"].includes(workingDraft.colorThemeId),
      rhythmSafe: blocks.length <= 3,
      repaired: titleShortened || textCompressed || blockTrimmed || actionShortened,
      notes,
    } satisfies FitPassResult,
  };
}

function buildVisibleTitles(
  workingDraft: WorkingDraftSeed | WorkingDraft,
  slidePlan: readonly WorkingDraftSlidePlanEntry[]
): SixSlotTuple<string> {
  const seen = new Set<string>();
  const signals = deriveDraftSignals(workingDraft);

  return tuple6(
    slidePlan.map((entry) => {
      const candidates = buildVisibleTitleCandidates(signals, entry);
      const chosen =
        candidates.find((candidate) => {
          const key = normalizeTitleKey(candidate);
          return key.length > 0 && !seen.has(key);
        }) ?? buildFallbackTitle(signals, entry.slideFunctionId);

      seen.add(normalizeTitleKey(chosen));
      return chosen;
    })
  );
}

function buildVisibleTitleCandidates(
  signals: DraftSignals,
  entry: WorkingDraftSlidePlanEntry
) {
  const candidates: string[] = [];
  const actionObject = detectActionObject(
    signals.desiredOutcome,
    signals.riskLine,
    signals.primaryGap,
    signals.primaryFact
  );
  const progressFact = firstNonRiskFact(signals.secondaryFact, signals.primaryFact);
  const supportFact = firstNonRiskFact(signals.primaryFact, signals.secondaryFact);

  if (entry.slideFunctionId === "open_topic") {
    if (signals.keyMessage && /mvp|инструмент/i.test(signals.keyMessage)) {
      pushTitleCandidate(candidates, `Где ${signals.topicLower} уже похож на продукт`);
      pushTitleCandidate(candidates, `Что уже собрано в ${signals.topic}`);
    }

    if (signals.hasResourceIntent) {
      pushTitleCandidate(candidates, `Почему ${signals.topicLower} упёрся в ресурс`);
    }

    pushTitleCandidate(candidates, titleFromSignal(signals.riskLine));

    if (signals.specificPeriod) {
      pushTitleCandidate(candidates, `Что важно по ${signals.topicLower} за ${signals.period}`);
    }

    pushTitleCandidate(candidates, `Что важно по ${signals.topicLower} сейчас`);
    pushTitleCandidate(candidates, `Какой разговор нужен по ${signals.topicLower}`);
  }

  if (entry.slideFunctionId === "main_point") {
    pushTitleCandidate(candidates, titleFromSignal(signals.keyMessage));
    pushTitleCandidate(candidates, titleFromSignal(signals.primaryFact));
    pushTitleCandidate(candidates, `Главное по ${signals.topicLower}`);
    pushTitleCandidate(candidates, `Что уже видно по ${signals.topicLower}`);
  }

  if (entry.slideFunctionId === "movement") {
    if (progressFact && progressFact !== signals.primaryFact) {
      pushTitleCandidate(candidates, titleFromSignal(progressFact));
    }

    if (signals.specificPeriod) {
      pushTitleCandidate(candidates, `Что сдвинули по ${signals.topicLower} за ${signals.period}`);
    }

    pushTitleCandidate(candidates, `Что уже сдвинулось по ${signals.topicLower}`);
    pushTitleCandidate(candidates, `Как сдвинулся ${signals.topic}`);
  }

  if (entry.slideFunctionId === "evidence") {
    const extraSupportFact = laterNonRiskFact(signals.primaryFact, signals.secondaryFact, signals.facts[2]);

    if (extraSupportFact) {
      pushTitleCandidate(candidates, titleFromSignal(extraSupportFact));
    } else if (supportFact && supportFact !== signals.primaryFact) {
      pushTitleCandidate(candidates, titleFromSignal(supportFact));
    }

    pushTitleCandidate(candidates, titleFromSignal(signals.primaryFact));
    pushTitleCandidate(candidates, `Что уже подтверждено по ${signals.topicLower}`);
    pushTitleCandidate(candidates, `Какая опора уже есть`);
  }

  if (entry.slideFunctionId === "tension") {
    pushTitleCandidate(candidates, titleFromSignal(signals.riskLine));
    pushTitleCandidate(candidates, titleFromSignal(signals.primaryGap));

    if (signals.riskLine && /не подтвержден/i.test(signals.riskLine)) {
      pushTitleCandidate(candidates, `Что ещё не подтверждено по ${signals.topicLower}`);
    }

    if (signals.hasResourceIntent) {
      pushTitleCandidate(candidates, `Что тормозит ${signals.topicLower}`);
    }

    if (signals.keyMessage && /mvp|инструмент/i.test(signals.keyMessage)) {
      pushTitleCandidate(candidates, `Что ещё держит ${signals.topic}`);
    }

    pushTitleCandidate(candidates, `Где ${signals.topicLower} буксует`);
  }

  if (entry.slideFunctionId === "next_step") {
    pushTitleCandidate(candidates, titleFromSignal(signals.desiredOutcome));

    if (actionObject && ["ресурс", "бюджет", "найм"].includes(actionObject)) {
      pushTitleCandidate(candidates, `Какой ${actionObject} нужен сейчас`);
    }

    pushTitleCandidate(candidates, `Какой шаг нужен по ${signals.topicLower}`);
    pushTitleCandidate(candidates, `Что нужно решить по ${signals.topicLower}`);
  }

  return dedupeTitles(candidates);
}

function buildCoreMessage(signals: DraftSignals, slideFunctionId: SlideFunctionId) {
  if (slideFunctionId === "open_topic") {
    if (signals.riskLine) {
      return signals.riskLine;
    }

    if (signals.keyMessage) {
      return signals.keyMessage;
    }

    return `По ${signals.topic} пора договориться о следующем шаге.`;
  }

  if (slideFunctionId === "main_point") {
    return signals.keyMessage ?? signals.primaryFact ?? `По ${signals.topic} уже есть рабочий вывод.`;
  }

  if (slideFunctionId === "movement") {
    return signals.secondaryFact ?? signals.primaryFact ?? `По ${signals.topic} уже есть сдвиг.`;
  }

  if (slideFunctionId === "evidence") {
    return signals.primaryFact ?? `По ${signals.topic} уже есть одна опора.`;
  }

  if (slideFunctionId === "tension") {
    return signals.riskLine ?? signals.primaryGap ?? `Без одной опоры ${signals.topicLower} снова упрётся в паузу.`;
  }

  return signals.desiredOutcome || `По ${signals.topic} нужен один следующий шаг.`;
}

function buildBlocks(
  signals: DraftSignals,
  slideFunctionId: SlideFunctionId,
  transformId: HiddenTransformId,
  coreMessage: string,
  canvasLayoutId: CanvasLayoutId
) {
  const facts = linesOrPlaceholder(signals.facts, defaultFactPlaceholder(signals));
  const gaps = linesOrPlaceholder(signals.gaps, defaultGapPlaceholder(signals));
  const pressureLine = cleanBody(
    signals.riskLine ?? signals.primaryGap ?? defaultGapPlaceholder(signals)
  );
  const progressLines = linesOrPlaceholder(
    compactLines([signals.secondaryFact, signals.primaryFact]),
    defaultFactPlaceholder(signals)
  );
  const nextReason = buildActionReason(signals);

  if (slideFunctionId === "open_topic") {
    return buildCoverBlocks(signals, coreMessage);
  }

  if (slideFunctionId === "main_point") {
    if (canvasLayoutId === "stat-focus") return buildStatFocusBlocks(signals, pressureLine);
    return buildMetricBlocks(signals, facts, pressureLine);
  }

  if (slideFunctionId === "movement") {
    return buildStepBlocks(signals, progressLines, facts, gaps, transformId);
  }

  if (slideFunctionId === "evidence") {
    if (canvasLayoutId === "comparison") return buildComparisonBlocks(signals, facts, gaps);
    return buildChecklistBlocks(signals, facts, gaps);
  }

  if (slideFunctionId === "tension") {
    if (canvasLayoutId === "quote") return buildQuoteBlocks(signals, pressureLine, gaps);
    return buildPersonaBlocks(signals, pressureLine, gaps);
  }

  return buildFeatureBlocks(signals, facts, gaps, nextReason);
}

function buildCoverBlocks(signals: DraftSignals, coreMessage: string): SlideBlock[] {
  return [
    block("cover-1", "focus", "spark", coreMessage, signals.desiredOutcome),
  ];
}

function buildMetricBlocks(
  signals: DraftSignals,
  facts: { body: string; placeholder: boolean },
  pressureLine: string
): SlideBlock[] {
  const factLines = signals.facts.filter((f) => f.length > 0);
  const metricValues = extractMetricValues(factLines);

  if (metricValues.length >= 3) {
    return metricValues.slice(0, 3).map((m, i) => ({
      ...block(`metric-${i + 1}`, "fact", "file", m.label, m.description),
      metric: m.value,
    }));
  }

  if (metricValues.length >= 1) {
    const result: SlideBlock[] = metricValues.slice(0, 2).map((m, i) => ({
      ...block(`metric-${i + 1}`, "fact", "file", m.label, m.description),
      metric: m.value,
    }));
    result.push({
      ...block(`metric-${result.length + 1}`, "constraint", "shield", pressureLine || "Что держит дальше", signals.primaryGap ?? "[нужна опора]"),
      metric: "?",
      placeholder: !signals.primaryGap,
    });
    return result;
  }

  return [
    { ...block("metric-1", "fact", "file", "Ключевое число", facts.body, facts.placeholder), metric: "[N]", placeholder: true },
    { ...block("metric-2", "movement", "trend", "Сдвиг", signals.secondaryFact ?? "[нужна цифра]", !signals.secondaryFact), metric: "[%]", placeholder: true },
    { ...block("metric-3", "constraint", "shield", "Ограничение", pressureLine), metric: "?", placeholder: !signals.riskLine },
  ];
}

function buildStepBlocks(
  signals: DraftSignals,
  progressLines: { body: string; placeholder: boolean },
  facts: { body: string; placeholder: boolean },
  gaps: { body: string; placeholder: boolean },
  transformId: HiddenTransformId
): SlideBlock[] {
  const factLines = signals.facts.filter((f) => f.length > 0);
  const stepBodies = buildStepBodies(signals);

  if (factLines.length >= 3) {
    return factLines.slice(0, 3).map((f, i) => ({
      ...block(`step-${i + 1}`, "movement", "trend", cleanLine(f), stepBodies[i] ?? ""),
      stepNumber: String(i + 1).padStart(2, "0"),
    }));
  }

  if (factLines.length >= 1) {
    const result: SlideBlock[] = factLines.slice(0, 2).map((f, i) => ({
      ...block(`step-${i + 1}`, "movement", "trend", cleanLine(f), stepBodies[i] ?? ""),
      stepNumber: String(i + 1).padStart(2, "0"),
    }));
    const nextStep = signals.desiredOutcome || signals.primaryGap || "[следующий шаг]";
    result.push({
      ...block(`step-${result.length + 1}`, "decision", "arrow", cleanLine(nextStep), stepBodies[result.length] ?? ""),
      stepNumber: String(result.length + 1).padStart(2, "0"),
    });
    return result;
  }

  return [
    { ...block("step-1", "focus", "spark", "Зафиксировать задачу", "Определить границы и ожидания"), stepNumber: "01" },
    { ...block("step-2", "movement", "trend", "Собрать опору", "Факты и цифры для аргументации"), stepNumber: "02" },
    { ...block("step-3", "decision", "arrow", "Принять решение", "Согласовать следующий шаг"), stepNumber: "03" },
  ];
}

function buildStepBodies(signals: DraftSignals): string[] {
  const pool: string[] = [];
  if (signals.desiredOutcome && !isPlaceholderToken(signals.desiredOutcome)) {
    pool.push(cleanBody(signals.desiredOutcome));
  }
  if (signals.primaryGap && !isPlaceholderToken(signals.primaryGap)) {
    pool.push(cleanBody(signals.primaryGap));
  }
  if (signals.audience) {
    pool.push(signals.audience);
  }
  return pool;
}

function buildChecklistBlocks(
  signals: DraftSignals,
  facts: { body: string; placeholder: boolean },
  gaps: { body: string; placeholder: boolean }
): SlideBlock[] {
  const factLines = signals.facts.filter((f) => f.length > 0);
  const gapLines = signals.gaps.filter((g) => g.length > 0);

  const items: SlideBlock[] = [];

  for (const f of factLines.slice(0, 3)) {
    items.push(block(`check-${items.length + 1}`, "proof", "file", cleanBody(f), ""));
  }

  if (items.length < 4 && gapLines.length > 0) {
    items.push({
      ...block(`check-${items.length + 1}`, "constraint", "gap", cleanBody(gapLines[0]), ""),
      placeholder: true,
    });
  }

  if (items.length === 0) {
    return [
      { ...block("check-1", "proof", "file", facts.body, ""), placeholder: facts.placeholder },
      { ...block("check-2", "constraint", "gap", gaps.body, ""), placeholder: gaps.placeholder },
    ];
  }

  return items;
}

function buildPersonaBlocks(
  signals: DraftSignals,
  pressureLine: string,
  gaps: { body: string; placeholder: boolean }
): SlideBlock[] {
  const audienceParts = splitAudience(signals.audience);

  if (audienceParts.length >= 2) {
    return audienceParts.slice(0, 3).map((role, i) => ({
      ...block(`persona-${i + 1}`, "focus", "flag", role, buildPersonaTask(signals, i)),
      tagline: signals.topic,
    }));
  }

  const hasRealRisk = pressureLine && !isPlaceholderToken(pressureLine);
  const riskTitle = hasRealRisk ? pressureLine : "Где упираемся";
  const riskBody = hasRealRisk && signals.primaryGap && pressureLine !== signals.primaryGap
    ? cleanBody(signals.primaryGap)
    : hasRealRisk ? "" : (gaps.placeholder ? "" : gaps.body);
  const factBody = signals.primaryFact ? cleanBody(signals.primaryFact) : "";
  const decisionBody = signals.desiredOutcome ? cleanBody(signals.desiredOutcome) : "";

  return [
    { ...block("persona-1", "constraint", "shield", riskTitle, riskBody), tagline: signals.audience, placeholder: !hasRealRisk },
    { ...block("persona-2", "proof", "file", "Что уже известно", factBody || "[добавить факт]"), tagline: signals.topic, placeholder: !signals.primaryFact },
    { ...block("persona-3", "decision", "flag", "Какое решение нужно", decisionBody || "[уточнить решение]"), tagline: "Решение", placeholder: !signals.desiredOutcome },
  ];
}

function buildFeatureBlocks(
  signals: DraftSignals,
  facts: { body: string; placeholder: boolean },
  gaps: { body: string; placeholder: boolean },
  nextReason: string
): SlideBlock[] {
  return [
    block("feat-1", "decision", "flag", "Следующий шаг", nextReason),
    block("feat-2", "proof", "file", "Что уже на руках", facts.body, facts.placeholder),
    block("feat-3", "constraint", "gap", "Что ещё добрать", gaps.body, gaps.placeholder),
  ];
}

function buildStatFocusBlocks(
  signals: DraftSignals,
  pressureLine: string
): SlideBlock[] {
  const factLines = signals.facts.filter((f) => f.length > 0);
  const metricValues = extractMetricValues(factLines);
  const main = metricValues[0];

  const mainBlock: SlideBlock = {
    ...block("stat-1", "fact", "trend", main.label || "Ключевой показатель", main.description || ""),
    metric: main.value,
  };

  const supportBody = signals.primaryGap
    ? cleanBody(signals.primaryGap)
    : pressureLine || "";

  const supportBlock = block(
    "stat-2",
    "constraint",
    "shield",
    "Что это значит",
    supportBody || cleanBody(signals.desiredOutcome),
    !supportBody
  );

  return [mainBlock, supportBlock];
}

function buildQuoteBlocks(
  signals: DraftSignals,
  pressureLine: string,
  gaps: { body: string; placeholder: boolean }
): SlideBlock[] {
  const quoteBody = cleanBody(
    signals.riskLine ?? pressureLine ?? signals.primaryGap ?? gaps.body
  );
  const attribution = signals.audience || signals.topic;

  const quoteBlock: SlideBlock = {
    ...block(
      "quote-1",
      "constraint",
      "shield",
      "Ключевое препятствие",
      quoteBody || gaps.body,
      !quoteBody
    ),
    tagline: attribution,
  };

  const supportBody = signals.primaryFact ? cleanBody(signals.primaryFact) : "";
  const supportBlock = block(
    "quote-2",
    "proof",
    "file",
    "Что уже известно",
    supportBody || "[добавить факт]",
    !supportBody
  );

  return [quoteBlock, supportBlock];
}

function buildComparisonBlocks(
  signals: DraftSignals,
  facts: { body: string; placeholder: boolean },
  gaps: { body: string; placeholder: boolean }
): SlideBlock[] {
  const leftTitle = signals.primaryGap
    ? cleanLine(signals.primaryGap)
    : "Где упираемся";
  const leftBody = signals.riskLine
    ? cleanBody(signals.riskLine)
    : gaps.body;

  const rightTitle = signals.primaryFact
    ? cleanLine(signals.primaryFact)
    : "Что нужно сделать";
  const rightBody = signals.desiredOutcome
    ? cleanBody(signals.desiredOutcome)
    : facts.body;

  const leftBlock: SlideBlock = {
    ...block("comp-left", "constraint", "shield", leftTitle, leftBody, !signals.primaryGap),
    tagline: "Сейчас",
  };

  const rightBlock: SlideBlock = {
    ...block("comp-right", "movement", "trend", rightTitle, rightBody, !signals.primaryFact),
    tagline: "Нужно",
  };

  return [leftBlock, rightBlock];
}

function extractMetricValues(factLines: string[]): Array<{ value: string; label: string; description: string }> {
  const results: Array<{ value: string; label: string; description: string }> = [];

  for (const line of factLines) {
    const numMatch = line.match(/(\d[\d.,]*\s*(?:%|×|мс|мин|сек|ч|дн|[xк])?)/i);
    if (numMatch) {
      const value = numMatch[1].trim();
      const rest = line.replace(numMatch[0], "").trim().replace(/^[—–\-:,.\s]+/, "");
      const label = cleanLine(rest) || cleanLine(line);
      results.push({
        value,
        label,
        description: "",
      });
    }
  }

  return results;
}

function splitAudience(audience: string): string[] {
  return audience
    .split(/[,;/&+]+|\s+и\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function buildPersonaTask(signals: DraftSignals, index: number): string {
  const tasks = [
    signals.desiredOutcome,
    signals.primaryFact ? cleanBody(signals.primaryFact) : null,
    signals.primaryGap ? cleanBody(signals.primaryGap) : null,
  ].filter(Boolean) as string[];
  return tasks[index] ?? tasks[0] ?? "";
}

function buildActionLabels(
  signals: DraftSignals,
  entry: WorkingDraftSlidePlanEntry,
  title: string
): SlideActionLabel[] {
  const actionObject =
    detectActionObject(signals.desiredOutcome, signals.riskLine, signals.primaryGap) ??
    "решение";

  const statusLabel = buildStatusActionLabel(entry.slideFunctionId, actionObject, signals);
  const explainLabel = buildExplainActionLabel(entry.slideFunctionId);
  const decisionLabel = buildDecisionActionLabel(entry.slideFunctionId, actionObject);

  return [
    { id: `${entry.slideFunctionId}-status_shift`, label: statusLabel, transformId: "status_shift" },
    {
      id: `${entry.slideFunctionId}-breakdown_explain`,
      label: explainLabel,
      transformId: "breakdown_explain",
    },
    {
      id: `${entry.slideFunctionId}-decision_next`,
      label: decisionLabel,
      transformId: "decision_next",
    },
  ];
}

function buildSubtitle(
  signals: DraftSignals,
  entry: WorkingDraftSlidePlanEntry,
  title: string
) {
  if (entry.slideFunctionId === "open_topic") {
    return [signals.specificPeriod ? signals.period : "", signals.audience]
      .filter(Boolean)
      .join(" · ");
  }

  if (entry.slideFunctionId === "tension" && signals.primaryGap && !isPlaceholderToken(signals.primaryGap)) {
    return clampText(cleanBody(signals.primaryGap), 84);
  }

  if (entry.slideFunctionId === "movement" && signals.specificPeriod) {
    return signals.period;
  }

  if (entry.slideFunctionId === "next_step" && isUsefulTitle(signals.desiredOutcome)) {
    return normalizeTitleKey(title) !== normalizeTitleKey(signals.desiredOutcome)
      ? clampText(cleanBody(signals.desiredOutcome), 84)
      : "";
  }

  return "";
}

function buildDocumentTitle(workingDraft: WorkingDraft) {
  const signals = deriveDraftSignals(workingDraft);

  if (signals.hasResourceIntent) {
    return clampText(`Запрос на ресурс: ${signals.topic}`, 72);
  }

  if (/квартальн[а-яёa-z-]*\s+статус/i.test(workingDraft.sourcePrompt)) {
    return clampText(`Квартальный статус: ${signals.topic}`, 72);
  }

  if (/итог[аи]\s+пилот/i.test(workingDraft.sourcePrompt)) {
    return clampText(`Итоги пилота: ${signals.topic}`, 72);
  }

  return clampText(signals.topic, 72);
}

function buildFallbackOutcome(intent: WorkingDraftSeed["presentationIntent"]) {
  if (intent === "decision") {
    return "Согласовать следующий шаг.";
  }

  if (intent === "explain") {
    return "Снять вопросы по сути.";
  }

  return "Зафиксировать текущее состояние.";
}

function buildSpeakerAngle(slideFunctionId: SlideFunctionId) {
  if (slideFunctionId === "open_topic") {
    return "Открыть тему без длинного захода.";
  }

  if (slideFunctionId === "main_point") {
    return "Зафиксировать один главный вывод.";
  }

  if (slideFunctionId === "movement") {
    return "Показать движение, а не перечень действий.";
  }

  if (slideFunctionId === "evidence") {
    return "Дать опору и не добирать лишнего.";
  }

  if (slideFunctionId === "tension") {
    return "Отдельно назвать ограничение и его цену.";
  }

  return "Свести разговор к следующему шагу.";
}

function intentToTransform(intent: WorkingDraftSeed["presentationIntent"]): HiddenTransformId {
  if (intent === "decision") {
    return "decision_next";
  }

  if (intent === "explain") {
    return "breakdown_explain";
  }

  return "status_shift";
}

function hasResourceIntent(workingDraft: WorkingDraftSeed | WorkingDraft) {
  return /ресурс|найм|бюджет/i.test(
    `${workingDraft.sourcePrompt} ${workingDraft.desiredOutcome}`
  );
}

function extractPromptFacts(sourcePrompt: string) {
  return buildPromptSignals(sourcePrompt).knownFacts.slice(0, 3);
}

function linesOrPlaceholder(lines: string[], fallback: string) {
  const cleaned = uniqueLines(lines).slice(0, 3);

  if (cleaned.length === 0) {
    return { body: fallback, placeholder: true };
  }

  return {
    body: cleaned.join("\n"),
    placeholder: cleaned.every((line) => isPlaceholderToken(line)),
  };
}

function block(
  id: string,
  type: SlideBlock["type"],
  icon: SlideBlock["icon"],
  title: string,
  body: string,
  placeholder = false
): SlideBlock {
  return {
    id,
    type,
    icon,
    title: cleanLine(title),
    body: cleanBody(body, true),
    placeholder,
  };
}

function blockTone(block: SlideBlock): SlideToneId {
  if (block.type === "movement") {
    return "success";
  }

  if (block.type === "constraint") {
    return "warning";
  }

  if (block.type === "focus" || block.type === "decision") {
    return "primary";
  }

  return "neutral";
}

function cleanLine(value: string, keepNewLines = false): string {
  if (!value) {
    return "";
  }

  if (keepNewLines) {
    return value
      .split("\n")
      .map((part) => cleanLine(part))
      .filter(Boolean)
      .join("\n");
  }

  return normalizePrompt(value)
    .split(/[.!?]/)[0]
    .replace(/[«»"]/g, "")
    .trim()
    .replace(/\.$/, "");
}

function cleanBody(value: string, keepNewLines = false): string {
  if (!value) {
    return "";
  }

  if (keepNewLines) {
    return value
      .split("\n")
      .map((part) => cleanBody(part))
      .filter(Boolean)
      .join("\n");
  }

  return normalizePrompt(value)
    .replace(/[«»"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!]+$/g, "");
}

function findRiskLine(sourcePrompt: string): string | null {
  const candidates = sourcePrompt
    .split(/[\n.!?;:]+/)
    .flatMap((item) => item.split(/,(?=\s*[а-яёa-z0-9])/i))
    .map((item) => cleanBody(item))
    .filter(Boolean)
    .filter((item) => /\b(?:риск|блокер|упёр|застрял|не хватает|мешает|не доказано|не подтвержден|найм|ресурс|бюджет|latency|coverage|срок)\b/i.test(item))
    .filter((item) => !/^(?:нужно|собери|собрать|покажи|показать)\b/i.test(item))
    .sort((left, right) => right.length - left.length);

  return candidates[0] ?? null;
}

function isUsefulTitle(value?: string | null) {
  if (!value) {
    return false;
  }

  const cleaned = cleanLine(value);

  return (
    !/^(нужно|нужен|нужна|нужны|надо|собрать|подготовить|показать)\b/i.test(cleaned) &&
    !isPlaceholderToken(cleaned)
  );
}

function isUsefulContentLine(value?: string | null) {
  if (!value) {
    return false;
  }

  const cleaned = cleanBody(value);

  if (cleaned.length < 10) {
    return false;
  }

  if (/^(нужно|нужен|нужна|нужны|собери|собрать|подготовь|подготовить|покажи|показать|показываем|это\s+mvp|это\s+сервис|для\s+реального\s+разговора)\b/i.test(cleaned)) {
    return false;
  }

  if (/^(где\s+риск|какой\s+следующий|что\s+уже\s+сдвинули|что\s+реально\s+сдвинули|какое\s+решение\s+нужно|зачем\s+нужен\s+ресурс|что\s+пока\s+не\s+доказано)\b/i.test(cleaned)) {
    return false;
  }

  return true;
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const cleaned = cleanBody(line, true);
    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function replaceAt<T>(items: readonly T[], index: number, value: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function tuple6<T>(items: readonly T[]): SixSlotTuple<T> {
  return items as SixSlotTuple<T>;
}

function deriveDraftSignals(workingDraft: WorkingDraftSeed | WorkingDraft): DraftSignals {
  const promptSignals = buildPromptSignals(
    workingDraft.sourcePrompt,
    workingDraft.presentationIntent
  );
  const topic = cleanBody(promptSignals.topicLabel) || "Рабочая тема";
  const facts = uniqueLines([
    ...workingDraft.knownFacts,
    ...promptSignals.knownFacts,
  ])
    .filter((line) => isUsefulContentLine(line))
    .slice(0, 3);
  const fallbackFacts = promptSignals.knownFacts.length
    ? promptSignals.knownFacts
    : extractPromptFacts(workingDraft.sourcePrompt);
  const mergedFacts = facts.length > 0 ? facts : fallbackFacts;
  const gaps = uniqueLines([
    ...workingDraft.missingFacts,
    ...promptSignals.missingFacts,
  ]).slice(0, 3);
  const keyMessage = firstUsefulSignal(
    promptSignals.keyMessage,
    mergedFacts[0],
    workingDraft.desiredOutcome
  );
  const riskLine = firstUsefulSignal(
    promptSignals.riskLine,
    findRiskLine(workingDraft.sourcePrompt),
    gaps[0],
    /риск|блокер|срок|найм|бюджет|ресурс/i.test(workingDraft.desiredOutcome)
      ? workingDraft.desiredOutcome
      : null
  );
  const period = promptSignals.period;

  return {
    topic,
    topicLower: topicInPhrase(topic),
    period,
    audience: workingDraft.audience,
    desiredOutcome: cleanBody(workingDraft.desiredOutcome),
    keyMessage,
    facts: mergedFacts,
    gaps,
    primaryFact: mergedFacts[0] ?? null,
    secondaryFact: mergedFacts[1] ?? null,
    primaryGap: gaps[0] ?? null,
    riskLine,
    hasResourceIntent: hasResourceIntent(workingDraft),
    specificPeriod: period !== "текущий период",
    presentationIntent: workingDraft.presentationIntent,
  };
}

function buildFallbackTitle(signals: DraftSignals, slideFunctionId: SlideFunctionId) {
  if (slideFunctionId === "open_topic") {
    return clampText(`Что важно по ${signals.topicLower}`, 68);
  }

  if (slideFunctionId === "main_point") {
    return clampText(`Главное по ${signals.topicLower}`, 68);
  }

  if (slideFunctionId === "movement") {
    return clampText(`Что уже сдвинули по ${signals.topicLower}`, 68);
  }

  if (slideFunctionId === "evidence") {
    return clampText(`Что уже подтверждено по ${signals.topicLower}`, 68);
  }

  if (slideFunctionId === "tension") {
    return clampText(`Где ${signals.topicLower} буксует`, 68);
  }

  return clampText(`Какой шаг нужен по ${signals.topicLower}`, 68);
}

function pushTitleCandidate(target: string[], value?: string | null) {
  if (!value) {
    return;
  }

  const candidate = clampText(cleanLine(value), 68);

  if (!candidate || !isUsefulTitle(candidate)) {
    return;
  }

  target.push(candidate);
}

function titleFromSignal(value?: string | null) {
  if (!value) {
    return null;
  }

  const candidate = clampText(cleanLine(value), 68);
  return isUsefulTitle(candidate) ? candidate : null;
}

function normalizeTitleKey(value: string) {
  return cleanLine(value).toLowerCase();
}

function dedupeTitles(titles: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const title of titles) {
    const key = normalizeTitleKey(title);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(title);
  }

  return result;
}

function compactLines(lines: Array<string | null | undefined>) {
  return uniqueLines(lines.filter(Boolean) as string[]);
}

function buildActionReason(signals: DraftSignals) {
  if (signals.hasResourceIntent) {
    return "Без этого запрос снова упрётся в ресурс.";
  }

  if (signals.riskLine) {
    return "Именно это сейчас держит следующий шаг.";
  }

  if (signals.primaryGap) {
    return "Без этого разговор снова уйдёт в уточнения.";
  }

  return "Следующий шаг уже можно формулировать.";
}

function defaultFactPlaceholder(signals: DraftSignals) {
  const actionObject = detectActionObject(signals.primaryGap, signals.desiredOutcome);

  if (actionObject === "срок") {
    return "[подтвердить срок]";
  }

  if (actionObject === "охват") {
    return "[уточнить охват]";
  }

  return "[нужна цифра]";
}

function defaultGapPlaceholder(signals: DraftSignals) {
  const actionObject = detectActionObject(
    signals.desiredOutcome,
    signals.riskLine,
    signals.primaryGap
  );

  if (actionObject === "ресурс" || actionObject === "бюджет" || actionObject === "найм") {
    return "[уточнить объём запроса]";
  }

  if (actionObject === "охват") {
    return "[уточнить охват]";
  }

  if (actionObject === "срок") {
    return "[подтвердить срок]";
  }

  if (actionObject === "этап") {
    return "[уточнить критерий]";
  }

  return "[нужна опора]";
}

function detectActionObject(...values: Array<string | null | undefined>) {
  const source = values.filter(Boolean).join(" ").toLowerCase();

  if (/найм|нанять|engineer|developer|qa/.test(source)) {
    return "найм";
  }

  if (/ресурс/.test(source)) {
    return "ресурс";
  }

  if (/бюджет/.test(source)) {
    return "бюджет";
  }

  if (/срок|deadline|время|latency/.test(source)) {
    return "срок";
  }

  if (/этап/.test(source)) {
    return "этап";
  }

  if (/охват|выборк|coverage/.test(source)) {
    return "охват";
  }

  if (/риск|блокер/.test(source)) {
    return "риск";
  }

  if (/цифр|метрик|показател/.test(source)) {
    return "цифру";
  }

  if (/решени/.test(source)) {
    return "решение";
  }

  if (/шаг/.test(source)) {
    return "шаг";
  }

  return null;
}

function firstUsefulSignal(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const cleaned = cleanBody(value);

    if (isUsefulContentLine(cleaned) && !isDirectiveFragment(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

function isDirectiveFragment(value: string) {
  return /^(что\s+уже|где\s+риск|какой\s+следующий|какое\s+решение|зачем\s+нужен|что\s+пока|что\s+реально|важно\s+показать|что\s+нужно\s+сверху)/i.test(
    cleanBody(value)
  );
}

function buildStatusActionLabel(
  slideFunctionId: SlideFunctionId,
  actionObject: string,
  signals: DraftSignals
) {
  if (slideFunctionId === "open_topic") {
    return signals.riskLine ? "Заострить проблему" : "Собрать заход короче";
  }

  if (slideFunctionId === "main_point") {
    return "Усилить главный вывод";
  }

  if (slideFunctionId === "movement") {
    return "Собрать прогресс короче";
  }

  if (slideFunctionId === "evidence") {
    return "Оставить одну опору";
  }

  if (slideFunctionId === "tension") {
    return actionObject === "срок" ? "Упереть в срок" : "Заострить риск";
  }

  if (actionObject === "найм" || actionObject === "ресурс" || actionObject === "бюджет") {
    return "Собрать один запрос";
  }

  return actionObject === "этап" ? "Свести к одному решению" : "Свести к одному шагу";
}

function buildExplainActionLabel(slideFunctionId: SlideFunctionId) {
  if (slideFunctionId === "open_topic") {
    return "Показать фон";
  }

  if (slideFunctionId === "main_point") {
    return "Показать, на чём держится";
  }

  if (slideFunctionId === "movement") {
    return "Разобрать движение";
  }

  if (slideFunctionId === "evidence") {
    return "Разложить по опорам";
  }

  if (slideFunctionId === "tension") {
    return "Показать, что держит";
  }

  return "Показать, что добрать";
}

function buildDecisionActionLabel(slideFunctionId: SlideFunctionId, actionObject: string) {
  if (slideFunctionId === "tension") {
    if (actionObject === "найм") {
      return "Снять блокер по найму";
    }

    if (actionObject === "ресурс" || actionObject === "бюджет") {
      return "Подвести к ресурсу";
    }

    if (actionObject === "срок") {
      return "Снять риск по сроку";
    }
  }

  if (actionObject === "найм") {
    return "Подвести к найму";
  }

  if (actionObject === "ресурс" || actionObject === "бюджет") {
    return "Подвести к ресурсу";
  }

  if (actionObject === "этап") {
    return "Подвести к этапу";
  }

  if (actionObject === "срок") {
    return "Подвести к сроку";
  }

  return slideFunctionId === "evidence" ? "Связать с решением" : "Подвести к решению";
}

function isPlaceholderToken(value?: string | null) {
  if (!value) {
    return false;
  }

  return /^\[[^\]]+\]$/.test(cleanBody(value));
}

function isRiskSignal(value?: string | null) {
  if (!value) {
    return false;
  }

  return /риск|блокер|упёр|застрял|не подтвержден|не доказано|не дожм|не хватает|мешает|ресурс|найм|срок|coverage|latency/i.test(
    cleanBody(value)
  );
}

function firstNonRiskFact(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value || isRiskSignal(value)) {
      continue;
    }

    return value;
  }

  return null;
}

function laterNonRiskFact(
  current: string | null | undefined,
  ...values: Array<string | null | undefined>
) {
  for (const value of values) {
    if (!value || value === current || isRiskSignal(value)) {
      continue;
    }

    return value;
  }

  return null;
}

function topicInPhrase(topic: string) {
  const firstWord = topic.split(/\s+/)[0] ?? "";
  if (/^[A-ZА-ЯЁ]{2,}$/.test(firstWord)) {
    return topic;
  }

  if (/[A-Z]/.test(topic) && /[a-z]/.test(topic)) {
    return topic;
  }

  return topic.charAt(0).toLowerCase() + topic.slice(1);
}
