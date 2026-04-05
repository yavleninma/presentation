import type {
  ClarificationSession,
  ColorThemeId,
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
  SlideToneId,
  TemplateIconPackId,
  TemplateId,
  WorkingDraft,
  WorkingDraftSlidePlanEntry,
} from "@/lib/presentation-types";
import {
  buildMissingFacts,
  buildPromptSignals,
  clampText,
  extractAudience,
  extractDesiredOutcome,
  extractKeyMessage,
  extractPeriod,
  extractTopicLabel,
  normalizePrompt,
} from "@/lib/prompt-analysis";

const DEFAULT_TEMPLATE: TemplateId = "strict";
const DEFAULT_COLOR_THEME: ColorThemeId = "slate";

const SLOT_MAP: Array<{ id: SlideId; slotId: SlideSlotId; fn: SlideFunctionId }> = [
  { id: "slide-1", slotId: 1, fn: "open_topic" },
  { id: "slide-2", slotId: 2, fn: "main_point" },
  { id: "slide-3", slotId: 3, fn: "movement" },
  { id: "slide-4", slotId: 4, fn: "evidence" },
  { id: "slide-5", slotId: 5, fn: "tension" },
  { id: "slide-6", slotId: 6, fn: "next_step" },
];

const TEMPLATE_ICON_PACKS: Record<TemplateId, TemplateIconPackId> = {
  strict: "outline",
  cards: "solid-minimal",
  briefing: "duotone-minimal",
};

export const EXAMPLE_PROMPTS = [
  "Нужно собрать квартальный статус для руководителя: что уже сдвинули, где риск и какой следующий шаг важен сейчас.",
  "Показываем итоги пилота поиска для продуктового руководителя: что уже работает, что пока не доказано и что нужно решить по следующему этапу.",
  "Нужен запрос на ресурс по platform team: что успели сделать, где упёрлись и зачем нужен следующий слот на найм.",
];

export const SCENARIO_CHIPS = [
  { id: "quarter", label: "Квартальный статус", prompt: EXAMPLE_PROMPTS[0] },
  { id: "pilot", label: "Итоги пилота", prompt: EXAMPLE_PROMPTS[1] },
  { id: "resource", label: "Запрос на ресурс", prompt: EXAMPLE_PROMPTS[2] },
] as const;

export const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string }> = [
  { id: "strict", label: "Строго" },
  { id: "cards", label: "Карточки" },
  { id: "briefing", label: "Briefing" },
];

export const COLOR_OPTIONS: Array<{ id: ColorThemeId; label: string }> = [
  { id: "slate", label: "Slate" },
  { id: "indigo", label: "Indigo" },
  { id: "teal", label: "Teal" },
  { id: "sand", label: "Sand" },
];

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

export function buildWorkingDraft(
  rawPrompt: string,
  session: ClarificationSession,
  appearance: { templateId?: TemplateId; colorThemeId?: ColorThemeId } = {}
): WorkingDraft {
  const transcriptPrompt = normalizePrompt(
    session.transcript
      .filter((message) => message.role === "user")
      .map((message) => message.text)
      .join(" ")
  );
  const sourcePrompt = normalizePrompt(transcriptPrompt || rawPrompt);
  const presentationIntent = session.insights.presentationIntent;
  const promptSignals = buildPromptSignals(sourcePrompt, presentationIntent);
  const audience =
    session.insights.audience ??
    promptSignals.audience ??
    extractAudience(sourcePrompt) ??
    "Руководитель направления";
  const desiredOutcome =
    session.insights.desiredOutcome ??
    promptSignals.desiredOutcome ??
    extractDesiredOutcome(sourcePrompt, presentationIntent) ??
    buildFallbackOutcome(presentationIntent);
  const knownFacts = uniqueLines([
    ...session.insights.knownFacts,
    ...promptSignals.knownFacts,
  ]).slice(0, 3);
  const missingFacts =
    session.insights.missingFacts.length > 0
      ? session.insights.missingFacts.slice(0, 3)
      : promptSignals.missingFacts.length > 0
        ? promptSignals.missingFacts.slice(0, 3)
        : buildMissingFacts(sourcePrompt).slice(0, 3);

  const seed: WorkingDraftSeed = {
    sourcePrompt,
    audience,
    presentationIntent,
    desiredOutcome,
    knownFacts,
    missingFacts,
    confidence: session.insights.confidence,
    templateId: appearance.templateId ?? DEFAULT_TEMPLATE,
    colorThemeId: appearance.colorThemeId ?? DEFAULT_COLOR_THEME,
  };
  const slidePlan = tuple6(
    SLOT_MAP.map(({ slotId, fn }) => buildSlidePlanEntry(seed, fn, slotId, null))
  );

  return normalizeWorkingDraft({
    ...seed,
    slidePlan,
    visibleSlideTitles: tuple6(["", "", "", "", "", ""]),
  });
}

export function buildPresentationDraft(
  workingDraft: WorkingDraft,
  options: { documentTitle?: string } = {}
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
  return buildPresentationDraft(
    {
      ...draft.workingDraft,
      templateId: appearance.templateId ?? draft.workingDraft.templateId,
      colorThemeId: appearance.colorThemeId ?? draft.workingDraft.colorThemeId,
    },
    { documentTitle: draft.documentTitle }
  );
}

export function runFitPassOnDraft(draft: PresentationDraft): PresentationDraft {
  const chosenTransformIds = {} as PresentationDraft["debug"]["chosenTransformIds"];
  const fitPassResultBySlide =
    {} as PresentationDraft["debug"]["fitPassResultBySlide"];
  const slides = draft.slides.map((slide, index) => {
    const result = fitSlide(slide, draft.workingDraft);
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
  });
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
  const blocks = buildBlocks(signals, slideFunctionId, transformId, coreMessage);

  return {
    slotId,
    slideFunctionId,
    canvasLayoutId:
      slideFunctionId === "open_topic"
        ? "hero"
        : slideFunctionId === "tension" || slideFunctionId === "next_step"
          ? "stack"
          : "split",
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

  return {
    id: slideId,
    slotId: entry.slotId,
    slideFunctionId: entry.slideFunctionId,
    canvasLayoutId: entry.canvasLayoutId,
    index: String(entry.slotId).padStart(2, "0"),
    railTitle: clampText(title, 44),
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

function fitSlide(slide: PresentationSlide, workingDraft: WorkingDraft) {
  let titleShortened = false;
  let textCompressed = false;
  let blockTrimmed = false;
  let actionShortened = false;
  const notes: string[] = [];

  const title = clampText(slide.title, 78);
  if (title !== slide.title) {
    titleShortened = true;
    notes.push("fit-pass сократил заголовок");
  }

  const subtitle = slide.subtitle ? clampText(slide.subtitle, 84) : "";
  if (subtitle !== slide.subtitle) {
    textCompressed = true;
    notes.push("fit-pass сократил подзаголовок");
  }

  const blocks = slide.blocks.slice(0, 3).map((block) => {
    const next = {
      ...block,
      title: clampText(block.title, 34),
      body: clampText(block.body, block.placeholder ? 96 : 156),
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
    const label = clampText(action.label, 32);

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
      railTitle: clampText(title, 44),
      railRhythm: blocks.map(blockTone).slice(0, 4),
      blocks,
      drawerActions,
    },
    fit: {
      slideId: slide.id,
      overflowWidthRisk: title.length > 72 || blocks.some((block) => block.title.length > 30),
      overflowHeightRisk: totalChars > 440,
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
  coreMessage: string
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
  const supportSummary =
    signals.facts.length > 1
      ? "Опора уже есть, добираем только пробелы."
      : "Есть один рабочий сигнал, но его ещё нужно укрепить.";

  if (slideFunctionId === "open_topic") {
    if (transformId === "decision_next") {
      return [
        block("open-1", "focus", "flag", "Что важно сейчас", coreMessage),
        block("open-2", "proof", "file", "Что уже подтверждено", facts.body, facts.placeholder),
        block("open-3", "decision", "arrow", "Что нужно согласовать", signals.desiredOutcome),
      ];
    }

    if (transformId === "breakdown_explain") {
      return [
        block("open-1", "focus", "spark", "О чём разговор", coreMessage),
        block("open-2", "proof", "file", "Что уже известно", facts.body, facts.placeholder),
        block("open-3", "decision", "arrow", "Что должно стать ясно", signals.desiredOutcome),
      ];
    }

    return [
      block("open-1", "movement", "trend", "Что уже видно", progressLines.body, progressLines.placeholder),
      block("open-2", "constraint", "shield", "Где держит", pressureLine),
      block("open-3", "decision", "arrow", "Куда это ведёт", signals.desiredOutcome),
    ];
  }

  if (slideFunctionId === "main_point") {
    return [
      block("main-1", "focus", "spark", "Ключевой вывод", coreMessage),
      block(
        "main-2",
        transformId === "status_shift" ? "movement" : "proof",
        transformId === "status_shift" ? "trend" : "file",
        transformId === "status_shift" ? "Что уже подтверждено" : "На чём это держится",
        facts.body,
        facts.placeholder
      ),
      block(
        "main-3",
        transformId === "decision_next" ? "decision" : "constraint",
        transformId === "decision_next" ? "arrow" : "shield",
        transformId === "decision_next" ? "Что нужно согласовать" : "Что держит дальше",
        transformId === "decision_next" ? signals.desiredOutcome : pressureLine
      ),
    ];
  }

  if (slideFunctionId === "movement") {
    return [
      block("move-1", "movement", "trend", "Что уже сдвинули", progressLines.body, progressLines.placeholder),
      block(
        "move-2",
        transformId === "breakdown_explain" ? "proof" : "constraint",
        transformId === "breakdown_explain" ? "file" : "gap",
        transformId === "breakdown_explain" ? "За счёт чего" : "Что ещё держит",
        transformId === "breakdown_explain" ? facts.body : gaps.body,
        transformId === "breakdown_explain" ? facts.placeholder : gaps.placeholder
      ),
      block(
        "move-3",
        transformId === "decision_next" ? "decision" : "focus",
        transformId === "decision_next" ? "flag" : "spark",
        transformId === "decision_next" ? "Какой шаг открывается" : "Что это меняет сейчас",
        transformId === "decision_next" ? signals.desiredOutcome : nextReason
      ),
    ];
  }

  if (slideFunctionId === "evidence") {
    return [
      block("evidence-1", "proof", "file", "Что уже подтверждено", facts.body, facts.placeholder),
      block(
        "evidence-2",
        transformId === "decision_next" ? "decision" : "focus",
        transformId === "decision_next" ? "flag" : "spark",
        transformId === "decision_next" ? "Что это позволяет просить" : "Почему этого уже хватает",
        transformId === "decision_next" ? signals.desiredOutcome : supportSummary
      ),
      block("evidence-3", "constraint", "gap", "Что ещё проверить", gaps.body, gaps.placeholder),
    ];
  }

  if (slideFunctionId === "tension") {
    return [
      block(
        "tension-1",
        "constraint",
        "shield",
        transformId === "status_shift" ? "Главный риск" : "Где упёрлись",
        pressureLine
      ),
      block("tension-2", "constraint", "gap", "Чего не хватает", gaps.body, gaps.placeholder),
      block(
        "tension-3",
        transformId === "breakdown_explain" ? "proof" : "decision",
        transformId === "breakdown_explain" ? "clock" : "flag",
        transformId === "breakdown_explain" ? "Почему это держит разговор" : "Что нужно снять сейчас",
        transformId === "breakdown_explain" ? nextReason : signals.desiredOutcome
      ),
    ];
  }

  return [
    block(
      "next-1",
      "decision",
      transformId === "status_shift" ? "arrow" : "flag",
      transformId === "decision_next" ? "Что нужно согласовать" : "Какой шаг нужен",
      signals.desiredOutcome
    ),
    block(
      "next-2",
      transformId === "breakdown_explain" ? "proof" : "constraint",
      transformId === "breakdown_explain" ? "file" : "gap",
      transformId === "breakdown_explain" ? "Что уже на руках" : "Что ещё добрать",
      transformId === "breakdown_explain" ? facts.body : gaps.body,
      transformId === "breakdown_explain" ? facts.placeholder : gaps.placeholder
    ),
    block("next-3", "proof", "file", "Почему сейчас", nextReason),
  ];
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

  if (entry.slideFunctionId === "tension" && signals.primaryGap) {
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
    .filter((item) => /\b(?:риск|блокер|упёр|застрял|не хватает|мешает|найм|ресурс|бюджет|latency|coverage|срок)\b/i.test(item))
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

  return !/^(нужно|нужен|нужна|нужны|собери|собрать|подготовь|подготовить|покажи|показать|показываем|это\s+mvp|это\s+сервис|для\s+реального\s+разговора)\b/i.test(
    cleaned
  );
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

    if (isUsefulContentLine(cleaned)) {
      return cleaned;
    }
  }

  return null;
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

  return /риск|блокер|упёр|застрял|не подтвержден|не дожм|не хватает|мешает|ресурс|найм|срок|coverage|latency/i.test(
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
  if (/[A-Z]/.test(topic) && /[a-z]/.test(topic)) {
    return topic;
  }

  return topic.charAt(0).toLowerCase() + topic.slice(1);
}
