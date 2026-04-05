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
  const audience =
    session.insights.audience ??
    extractAudience(sourcePrompt) ??
    "Руководитель направления";
  const desiredOutcome =
    session.insights.desiredOutcome ??
    extractDesiredOutcome(sourcePrompt, presentationIntent) ??
    buildFallbackOutcome(presentationIntent);
  const knownFacts = uniqueLines([
    ...session.insights.knownFacts,
    ...extractPromptFacts(sourcePrompt),
  ]).slice(0, 3);
  const missingFacts =
    session.insights.missingFacts.length > 0
      ? session.insights.missingFacts.slice(0, 3)
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
  const visibleSlideTitles = tuple6(
    makeTitlesUnique(slidePlan.map((entry) => buildVisibleTitle(seed, entry)))
  );

  return {
    ...seed,
    slidePlan,
    visibleSlideTitles,
  };
}

export function buildPresentationDraft(
  workingDraft: WorkingDraft,
  options: { documentTitle?: string } = {}
): PresentationDraft {
  const slides = workingDraft.slidePlan.map((entry, index) =>
    buildPresentationSlide(entry, workingDraft.visibleSlideTitles[index], workingDraft)
  );
  const draft: PresentationDraft = {
    documentTitle: options.documentTitle ?? buildDocumentTitle(workingDraft),
    documentSubtitle: `${extractPeriod(workingDraft.sourcePrompt)} · ${workingDraft.audience}`,
    workingDraft,
    slides,
    debug: {
      currentWorkingDraft: workingDraft,
      hiddenSlidePlan: workingDraft.slidePlan,
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
  const nextSlidePlan = tuple6(
    replaceAt(draft.workingDraft.slidePlan, slotIndex, nextEntry)
  );
  const nextTitles = replaceAt(
    draft.workingDraft.visibleSlideTitles,
    slotIndex,
    buildVisibleTitle(
      { ...draft.workingDraft, slidePlan: nextSlidePlan } as WorkingDraft,
      nextEntry
    )
  );
  const nextWorkingDraft: WorkingDraft = {
    ...draft.workingDraft,
    slidePlan: makeTitlesAlignedPlan(nextSlidePlan),
    visibleSlideTitles: tuple6(makeTitlesUnique(nextTitles)),
  };
  const nextVisibleSlide = buildPresentationSlide(
    nextWorkingDraft.slidePlan[slotIndex],
    nextWorkingDraft.visibleSlideTitles[slotIndex],
    nextWorkingDraft
  );
  const fitted = fitSlide(nextVisibleSlide, nextWorkingDraft);

  return {
    ...draft,
    workingDraft: nextWorkingDraft,
    slides: draft.slides.map((slide) => (slide.id === slideId ? fitted.slide : slide)),
    debug: {
      ...draft.debug,
      currentWorkingDraft: nextWorkingDraft,
      hiddenSlidePlan: nextWorkingDraft.slidePlan,
      chosenTransformIds: {
        ...draft.debug.chosenTransformIds,
        [slideId]: transformId,
      },
      fitPassResultBySlide: {
        ...draft.debug.fitPassResultBySlide,
        [slideId]: fitted.fit,
      },
    },
  };
}

function buildSlidePlanEntry(
  workingDraft: WorkingDraftSeed | WorkingDraft,
  slideFunctionId: SlideFunctionId,
  slotId: SlideSlotId,
  lastTransformId: HiddenTransformId | null
): WorkingDraftSlidePlanEntry {
  const transformId = lastTransformId ?? intentToTransform(workingDraft.presentationIntent);
  const coreMessage = buildCoreMessage(workingDraft, slideFunctionId);
  const blocks = buildBlocks(workingDraft, slideFunctionId, transformId, coreMessage);

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

  return {
    id: slideId,
    slotId: entry.slotId,
    slideFunctionId: entry.slideFunctionId,
    canvasLayoutId: entry.canvasLayoutId,
    index: String(entry.slotId).padStart(2, "0"),
    railTitle: clampText(title, 44),
    railRhythm: entry.blockPlan.map(blockTone).slice(0, 4),
    title,
    subtitle: buildSubtitle(entry.slideFunctionId, workingDraft),
    blocks: entry.blockPlan,
    drawerActions: buildActionLabels(entry.slideFunctionId, workingDraft),
    lastTransformId: entry.lastTransformId,
  };
}

function fitSlide(slide: PresentationSlide, workingDraft: WorkingDraft) {
  let titleShortened = false;
  let textCompressed = false;
  let blockTrimmed = false;
  const notes: string[] = [];

  const title = clampText(slide.title, 78);
  if (title !== slide.title) {
    titleShortened = true;
    notes.push("fit-pass сократил заголовок");
  }

  const subtitle = clampText(slide.subtitle, 84);
  if (subtitle !== slide.subtitle) {
    textCompressed = true;
    notes.push("fit-pass сократил подзаголовок");
  }

  const blocks = slide.blocks.slice(0, 3).map((block) => {
    const next = {
      ...block,
      title: clampText(block.title, 34),
      body: clampText(block.body, block.placeholder ? 92 : 150),
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
      drawerActions: slide.drawerActions.map((action) => ({
        ...action,
        label: clampText(action.label, 32),
      })),
    },
    fit: {
      slideId: slide.id,
      overflowWidthRisk: title.length > 72 || blocks.some((block) => block.title.length > 30),
      overflowHeightRisk: totalChars > 440,
      titleShortened,
      textCompressed,
      blockTrimmed,
      secondaryMoved: false,
      placeholderVisible:
        blocks.every((block) => !block.placeholder) || blocks.some((block) => block.placeholder),
      iconConsistent: blocks.every((block) => Boolean(block.icon)),
      contrastSafe: ["slate", "indigo", "teal", "sand"].includes(workingDraft.colorThemeId),
      rhythmSafe: blocks.length <= 3,
      repaired: titleShortened || textCompressed || blockTrimmed,
      notes,
    } satisfies FitPassResult,
  };
}

function buildVisibleTitle(
  workingDraft: WorkingDraftSeed | WorkingDraft,
  entry: WorkingDraftSlidePlanEntry
) {
  const topic = extractTopicLabel(workingDraft.sourcePrompt);

  if (entry.slideFunctionId === "open_topic") {
    if (hasResourceIntent(workingDraft)) {
      return clampText(`Почему нужен ресурс по ${lowerLead(topic)}`, 68);
    }

    if (/квартальн[а-яёa-z-]*\s+статус/i.test(workingDraft.sourcePrompt)) {
      return clampText(`Что важно в статусе по ${lowerLead(topic)}`, 68);
    }

    return clampText(`Почему говорим о ${lowerLead(topic)}`, 68);
  }

  if (entry.slideFunctionId === "main_point") {
    const keyMessage = extractKeyMessage(workingDraft.sourcePrompt) ?? entry.coreMessage;
    return isUsefulTitle(keyMessage)
      ? clampText(cleanLine(keyMessage), 68)
      : clampText(`Что уже видно по ${lowerLead(topic)}`, 68);
  }

  if (entry.slideFunctionId === "movement") {
    return /квартальн[а-яёa-z-]*\s+статус/i.test(workingDraft.sourcePrompt)
      ? "Что реально сдвинулось за период"
      : clampText(`Что уже сдвинулось по ${lowerLead(topic)}`, 68);
  }

  if (entry.slideFunctionId === "evidence") {
    return hasResourceIntent(workingDraft)
      ? "Чем подтверждаем запрос"
      : clampText(`На чём держится вывод по ${lowerLead(topic)}`, 68);
  }

  if (entry.slideFunctionId === "tension") {
    const riskLine = findRiskLine(workingDraft.sourcePrompt);
    return riskLine && isUsefulTitle(riskLine)
      ? clampText(cleanLine(riskLine), 68)
      : hasResourceIntent(workingDraft)
        ? "Что держит запрос на паузе"
        : "Что мешает пройти дальше";
  }

  return hasResourceIntent(workingDraft)
    ? "Какой запрос нужен сейчас"
    : clampText(cleanLine(workingDraft.desiredOutcome), 68);
}

function buildCoreMessage(
  workingDraft: WorkingDraftSeed | WorkingDraft,
  slideFunctionId: SlideFunctionId
) {
  const topic = extractTopicLabel(workingDraft.sourcePrompt);
  const firstFact = workingDraft.knownFacts[0];

  if (slideFunctionId === "open_topic") {
    return hasResourceIntent(workingDraft)
      ? `Следующий шаг по теме «${topic}» упирается в ресурс.`
      : `Нужно коротко открыть разговор по теме «${topic}».`;
  }

  if (slideFunctionId === "main_point") {
    return firstFact
      ? cleanLine(firstFact)
      : `По теме «${topic}» уже есть рабочий вывод.`;
  }

  if (slideFunctionId === "movement") {
    return firstFact
      ? `По теме «${topic}» уже видно движение.`
      : `Нужно показать, что по теме «${topic}» уже сдвинулось.`;
  }

  if (slideFunctionId === "evidence") {
    return firstFact
      ? `Главный вывод по теме «${topic}» держится на названных фактах.`
      : `Для разговора по теме «${topic}» не хватает одной опоры.`;
  }

  if (slideFunctionId === "tension") {
    return findRiskLine(workingDraft.sourcePrompt)
      ? cleanLine(findRiskLine(workingDraft.sourcePrompt)!)
      : cleanLine(workingDraft.desiredOutcome);
  }

  return cleanLine(workingDraft.desiredOutcome);
}

function buildBlocks(
  workingDraft: WorkingDraftSeed | WorkingDraft,
  slideFunctionId: SlideFunctionId,
  transformId: HiddenTransformId,
  coreMessage: string
) {
  const facts = linesOrPlaceholder(
    workingDraft.knownFacts,
    "Уточнить 1-2 факта, которые уже можно назвать."
  );
  const gaps = linesOrPlaceholder(
    workingDraft.missingFacts,
    "Пробелы по фактуре пока не зафиксированы."
  );
  const tension = cleanLine(findRiskLine(workingDraft.sourcePrompt) ?? workingDraft.desiredOutcome);
  const nextReason = hasResourceIntent(workingDraft)
    ? "Без этого запрос останется без движения."
    : "Без этого следующий шаг снова уйдёт в уточнения.";

  if (slideFunctionId === "open_topic") {
    return transformId === "decision_next"
      ? [
          block("open-1", "focus", "flag", "Почему разговор сейчас", coreMessage),
          block("open-2", "decision", "arrow", "Что нужно после показа", workingDraft.desiredOutcome),
        ]
      : [
          block("open-1", transformId === "breakdown_explain" ? "focus" : "movement", transformId === "breakdown_explain" ? "spark" : "trend", transformId === "breakdown_explain" ? "Что происходит" : "Что уже видно", coreMessage),
          block("open-2", "decision", "arrow", transformId === "breakdown_explain" ? "Что важно понять" : "Куда это ведёт", workingDraft.desiredOutcome),
        ];
  }

  if (slideFunctionId === "main_point") {
    return [
      block("main-1", "focus", "spark", "Главный вывод", coreMessage),
      block("main-2", transformId === "status_shift" ? "movement" : "proof", transformId === "status_shift" ? "trend" : "file", transformId === "status_shift" ? "Что изменилось" : "Короткая опора", facts.body, facts.placeholder),
      block("main-3", transformId === "decision_next" ? "decision" : "constraint", transformId === "decision_next" ? "arrow" : "shield", transformId === "decision_next" ? "Какой шаг отсюда следует" : "Где остаётся напряжение", transformId === "decision_next" ? workingDraft.desiredOutcome : tension),
    ];
  }

  if (slideFunctionId === "movement") {
    return [
      block("move-1", "movement", "trend", "Что уже сдвинулось", facts.body, facts.placeholder),
      block("move-2", "constraint", "gap", transformId === "decision_next" ? "Что держит следующий шаг" : "Что ещё не закрыто", transformId === "decision_next" ? tension : gaps.body, transformId === "decision_next" ? false : gaps.placeholder),
      block("move-3", transformId === "decision_next" ? "decision" : "focus", transformId === "decision_next" ? "flag" : "spark", transformId === "decision_next" ? "Какой шаг нужен дальше" : "Что это меняет сейчас", transformId === "decision_next" ? workingDraft.desiredOutcome : nextReason),
    ];
  }

  if (slideFunctionId === "evidence") {
    return [
      block("evidence-1", "proof", "file", "На чём держится вывод", facts.body, facts.placeholder),
      block("evidence-2", transformId === "decision_next" ? "decision" : "focus", transformId === "decision_next" ? "flag" : "spark", transformId === "decision_next" ? "Что это позволяет просить" : "Почему этого уже хватает", transformId === "decision_next" ? workingDraft.desiredOutcome : "Этого уже хватает для первого разговора без догадок."),
      block("evidence-3", "constraint", "gap", "Что ещё стоит подтвердить", gaps.body, gaps.placeholder),
    ];
  }

  if (slideFunctionId === "tension") {
    return [
      block("tension-1", "constraint", "shield", transformId === "status_shift" ? "Что держит ситуацию" : "Что мешает пройти дальше", tension),
      block("tension-2", "constraint", "gap", transformId === "status_shift" ? "Где не хватает опоры" : "Чего не хватает", gaps.body, gaps.placeholder),
      block("tension-3", transformId === "breakdown_explain" ? "proof" : "decision", transformId === "breakdown_explain" ? "clock" : "flag", transformId === "breakdown_explain" ? "Почему это держит разговор" : "Какой шаг это требует", transformId === "breakdown_explain" ? nextReason : workingDraft.desiredOutcome),
    ];
  }

  return transformId === "status_shift"
    ? [
        block("next-1", "decision", "arrow", "Следующий шаг", workingDraft.desiredOutcome),
        block("next-2", "constraint", "gap", "Что ещё нужно добрать", gaps.body, gaps.placeholder),
      ]
    : [
        block("next-1", "decision", "flag", "Какой шаг нужен сейчас", workingDraft.desiredOutcome),
        block("next-2", "constraint", "gap", "Что должно быть на руках", gaps.body, gaps.placeholder),
        block("next-3", "proof", "file", transformId === "decision_next" ? "Что этим закрываем" : "Почему это следующий ход", nextReason),
      ];
}

function buildActionLabels(
  slideFunctionId: SlideFunctionId,
  workingDraft: WorkingDraftSeed | WorkingDraft
): SlideActionLabel[] {
  const requestLabel = /ресурс|найм/i.test(workingDraft.desiredOutcome)
    ? "Сформулировать запрос на ресурс"
    : /бюджет/i.test(workingDraft.desiredOutcome)
      ? "Сформулировать запрос на бюджет"
      : "Сформулировать запрос точнее";
  const labels: Record<SlideFunctionId, Record<HiddenTransformId, string>> = {
    open_topic: {
      status_shift: "Собрать заход короче",
      breakdown_explain: "Уточнить контекст",
      decision_next: "Показать, зачем сейчас",
    },
    main_point: {
      status_shift: "Сделать вывод жёстче",
      breakdown_explain: "Разложить по сути",
      decision_next: "Подвести к решению",
    },
    movement: {
      status_shift: "Показать, что сдвинулось",
      breakdown_explain: "Разобрать движение",
      decision_next: "Связать со следующим шагом",
    },
    evidence: {
      status_shift: "Собрать в 3 опоры",
      breakdown_explain: "Пояснить, на чём вывод",
      decision_next: "Показать, что этого достаточно",
    },
    tension: {
      status_shift: "Показать, что мешает",
      breakdown_explain: "Разобрать ограничение",
      decision_next: requestLabel,
    },
    next_step: {
      status_shift: "Свести к одному ходу",
      breakdown_explain: "Показать, что ещё добрать",
      decision_next: "Подвести к выбору",
    },
  };

  return (["status_shift", "breakdown_explain", "decision_next"] as const).map(
    (transformId) => ({
      id: `${slideFunctionId}-${transformId}`,
      label: labels[slideFunctionId][transformId],
      transformId,
    })
  );
}

function buildSubtitle(
  slideFunctionId: SlideFunctionId,
  workingDraft: WorkingDraftSeed | WorkingDraft
) {
  if (slideFunctionId === "open_topic") {
    return `${extractPeriod(workingDraft.sourcePrompt)} · ${workingDraft.audience}`;
  }

  if (slideFunctionId === "main_point") {
    return "Главный смысл без лишнего захода.";
  }

  if (slideFunctionId === "movement") {
    return "То, что уже можно показывать без догадок.";
  }

  if (slideFunctionId === "evidence") {
    return "Опоры и честные пробелы по фактуре.";
  }

  if (slideFunctionId === "tension") {
    return "Ограничение, которое держит разговор.";
  }

  return "Один следующий шаг вместо нового круга обсуждения.";
}

function buildDocumentTitle(workingDraft: WorkingDraft) {
  const topic = extractTopicLabel(workingDraft.sourcePrompt);

  if (hasResourceIntent(workingDraft)) {
    return clampText(`Запрос на ресурс: ${topic}`, 72);
  }

  if (/квартальн[а-яёa-z-]*\s+статус/i.test(workingDraft.sourcePrompt)) {
    return clampText(`Квартальный статус: ${topic}`, 72);
  }

  if (/итог[аи]\s+пилот/i.test(workingDraft.sourcePrompt)) {
    return clampText(`Итоги пилота: ${topic}`, 72);
  }

  return clampText(topic, 72);
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
  return sourcePrompt
    .split(/[.!?;]+/)
    .map((item) => cleanLine(item))
    .filter((item) => item.length > 18)
    .slice(0, 3);
}

function linesOrPlaceholder(lines: string[], fallback: string) {
  const cleaned = uniqueLines(lines).slice(0, 3);

  if (cleaned.length === 0) {
    return { body: fallback, placeholder: true };
  }

  return { body: cleaned.join("\n"), placeholder: false };
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
    body: cleanLine(body, true),
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

function findRiskLine(sourcePrompt: string): string | null {
  const match =
    sourcePrompt.match(
      /([^.!?]*(?:риск|мешает|блокер|упёрл[а-я]*|застрял[а-я]*|не хватает|найм)[^.!?]*)/i
    ) ??
    sourcePrompt.match(/([^.!?]*(?:ресурс|найм|бюджет|согласовать)[^.!?]*)/i);

  return match?.[1]?.trim() ?? null;
}

function lowerLead(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function isUsefulTitle(value?: string | null) {
  if (!value) {
    return false;
  }

  return !/^(нужно|нужен|нужна|нужны|надо|собрать|подготовить|показать)\b/i.test(
    cleanLine(value)
  );
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const cleaned = cleanLine(line, true);
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

function makeTitlesAlignedPlan(slidePlan: WorkingDraft["slidePlan"]) {
  return slidePlan;
}

function makeTitlesUnique(titles: readonly string[]) {
  const seen = new Set<string>();

  return titles.map((title) => {
    const normalized = title.toLowerCase();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      return title;
    }

    const next = clampText(`${title} сейчас`, 68);
    seen.add(next.toLowerCase());
    return next;
  });
}

function tuple6<T>(items: readonly T[]): SixSlotTuple<T> {
  return items as SixSlotTuple<T>;
}
