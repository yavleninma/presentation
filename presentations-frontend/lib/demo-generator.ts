import type {
  ClarificationSession,
  ColorId,
  PresentationDraft,
  PresentationSlide,
  RegenVariant,
  SlideBlock,
  SlideLayout,
  StorylineModeId,
  TemplateId,
  WorkingDraft,
} from "@/lib/presentation-types";
import {
  clampText,
  extractAudience,
  extractDesiredOutcome,
  extractKeyMessage,
  extractPeriod,
  extractShortFacts,
  extractTopicLabel,
  normalizePrompt,
} from "@/lib/prompt-analysis";

const MODE_COPY: Record<
  StorylineModeId,
  {
    actionLabel: string;
    lead: string;
    reasonTitle: string;
    reasonItems: string[];
    speakerNote: string;
    askTitle: string;
  }
> = {
  progress: {
    actionLabel: "Показать ход",
    lead: "Коротко показываем ход периода и не уходим в лишние ответвления.",
    reasonTitle: "Почему это уже читается",
    reasonItems: [
      "Главный сигнал назван без длинного вступления.",
      "Риск не растворяется внутри общего статуса.",
      "Следующий шаг виден до деталей исполнения.",
    ],
    speakerNote:
      "Сначала покажи, что уже сдвинулось, потом назови один риск и закончи следующим шагом.",
    askTitle: "Следующий шаг",
  },
  structure: {
    actionLabel: "Разложить по сути",
    lead: "Раскладываем ситуацию по сути и быстро снимаем главные вопросы.",
    reasonTitle: "Что уже стало понятнее",
    reasonItems: [
      "Ключевой вывод не спорит с деталями.",
      "Ограничение показано отдельно и не размывает основную линию.",
      "Пустые места остаются честными, а не маскируются общими словами.",
    ],
    speakerNote:
      "Начни с вывода, затем разложи его по двум-трём опорам и только потом переходи к риску.",
    askTitle: "Что нужно понять",
  },
  choice: {
    actionLabel: "Подвести к выбору",
    lead: "Держим разговор на одном следующем выборе и не тонем в устройстве.",
    reasonTitle: "Почему можно идти к выбору",
    reasonItems: [
      "Рабочий сигнал уже собран и не требует длинного захода.",
      "Главный пробел назван честно и не спрятан в мелкий текст.",
      "Следующий шаг упирается в одно согласование, а не в новый круг анализа.",
    ],
    speakerNote:
      "Сначала покажи, что уже работает, потом быстро назови ограничение и верни разговор к нужному согласованию.",
    askTitle: "Что нужно согласовать",
  },
};

export const EXAMPLE_PROMPTS = [
  "Нужно собрать квартальный статус для руководителя: что уже сдвинули, где риск и какой следующий шаг важен сейчас.",
  "Показываем итоги пилота поиска для продуктового руководителя: что уже работает, что пока не доказано и что нужно решить по следующему этапу.",
  "Нужен запрос на ресурс по platform team: что успели сделать, где упёрлись и зачем нужен следующий слот на найм.",
];

export const SCENARIO_CHIPS = [
  {
    id: "quarter",
    label: "Квартальный статус",
    prompt: EXAMPLE_PROMPTS[0],
  },
  {
    id: "pilot",
    label: "Итоги пилота",
    prompt: EXAMPLE_PROMPTS[1],
  },
  {
    id: "resource",
    label: "Запрос на ресурс",
    prompt: EXAMPLE_PROMPTS[2],
  },
] as const;

export const REGEN_ACTIONS: Array<{
  id: StorylineModeId;
  label: string;
}> = [
  { id: "progress", label: MODE_COPY.progress.actionLabel },
  { id: "structure", label: MODE_COPY.structure.actionLabel },
  { id: "choice", label: MODE_COPY.choice.actionLabel },
];

export const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string }> = [
  { id: "strict", label: "Строгий" },
  { id: "rhythm", label: "Ритм" },
  { id: "signal", label: "Сигнал" },
];

export const COLOR_OPTIONS: Array<{ id: ColorId; label: string }> = [
  { id: "cobalt", label: "Кобальт" },
  { id: "graphite", label: "Графит" },
  { id: "sage", label: "Шалфей" },
];

export function buildWorkingDraft(
  rawPrompt: string,
  session: ClarificationSession
): WorkingDraft {
  const transcriptPrompt = normalizePrompt(
    session.transcript
      .filter((message) => message.role === "user")
      .map((message) => message.text)
      .join(" ")
  );
  const sourcePrompt = normalizePrompt(transcriptPrompt || rawPrompt);
  const mode = session.insights.mode;
  const topicLabel = session.insights.topicLabel || extractTopicLabel(sourcePrompt);
  const period = session.insights.period || extractPeriod(sourcePrompt);
  const audience =
    session.insights.audience ??
    extractAudience(sourcePrompt) ??
    "Руководитель направления";
  const keyMessage =
    session.insights.keyMessage ??
    extractKeyMessage(sourcePrompt) ??
    buildFallbackKeyMessage(topicLabel, mode);
  const desiredOutcome =
    session.insights.desiredOutcome ??
    extractDesiredOutcome(sourcePrompt, mode) ??
    buildFallbackOutcome(mode);
  const knownFacts = mergeKnownFacts(
    session.insights.knownFacts,
    extractShortFacts(sourcePrompt)
  );
  const missingFacts = session.insights.missingFacts.slice(
    0,
    session.insights.factCoverage === "enough" ? 2 : 3
  );
  const summary = buildDraftSummary({
    keyMessage,
    audience,
    desiredOutcome,
  });

  return {
    sourcePrompt,
    summary,
    topicLabel,
    audience,
    period,
    mode,
    goal: buildGoal(mode),
    keyMessage,
    desiredOutcome,
    factCoverage: session.insights.factCoverage,
    knownFacts,
    missingFacts,
  };
}

export function buildPresentationDraft(
  workingDraft: WorkingDraft,
  variant: RegenVariant = workingDraft.mode
): PresentationDraft {
  const profile = MODE_COPY[variant];
  const titleBase = `${workingDraft.topicLabel} — ${workingDraft.period}`;
  const contextLine = `${workingDraft.period} • ${workingDraft.audience}`;
  const reasonTone = variant === "choice" ? "warning" : "primary";

  const slides: PresentationSlide[] = [
    {
      id: "cover",
      index: "01",
      shortLabel: "Обложка",
      layout: "cover",
      title: titleBase,
      subtitle: contextLine,
      blocks: [
        {
          id: "goal",
          title: "Зачем этот разговор",
          body: workingDraft.goal,
          tone: "neutral",
        },
        {
          id: "outcome",
          title: "Что должно случиться дальше",
          body: workingDraft.desiredOutcome,
          tone: "primary",
        },
      ],
    },
    {
      id: "summary",
      index: "02",
      shortLabel: "Главный вывод",
      layout: "summary",
      title: workingDraft.keyMessage,
      subtitle: profile.lead,
      blocks: [
        {
          id: "signal",
          title: "Что уже видно",
          items: workingDraft.knownFacts.slice(0, 3),
          tone: "success",
        },
        {
          id: "next",
          title: profile.askTitle,
          body: workingDraft.desiredOutcome,
          tone: reasonTone,
        },
      ],
    },
    {
      id: "changes",
      index: "03",
      shortLabel: "Что изменилось",
      layout: "changes",
      title: `Что изменилось за ${workingDraft.period}`,
      subtitle: profile.actionLabel,
      blocks: [
        {
          id: "already",
          title: "Уже работает",
          items: workingDraft.knownFacts.slice(0, 3),
          tone: "success",
        },
        {
          id: "gap",
          title: "Где ограничение",
          items: workingDraft.missingFacts.slice(0, 3),
          tone: "warning",
          placeholder: true,
        },
        {
          id: "next",
          title: "Следующий шаг",
          items: buildNextStepItems(workingDraft, variant),
          tone: "primary",
        },
      ],
    },
    {
      id: "evidence",
      index: "04",
      shortLabel: "Опоры",
      layout: "evidence",
      title: "На чём держится вывод",
      subtitle: "Только опорные факты и честные пустые места",
      blocks: [
        {
          id: "signal",
          title: "Что уже видно",
          emphasis: buildSignalLine(workingDraft, variant),
          body: buildSignalBody(workingDraft),
          tone: "success",
        },
        {
          id: "missing",
          title: "Чего ещё не хватает",
          items: workingDraft.missingFacts.slice(0, 3),
          tone: "warning",
          placeholder: true,
        },
        {
          id: "reason",
          title: profile.reasonTitle,
          items: profile.reasonItems,
          tone: "primary",
        },
      ],
      speakerNote: profile.speakerNote,
    },
    {
      id: "risks",
      index: "05",
      shortLabel: "Риски",
      layout: "risks",
      title: "Риски и блокеры",
      subtitle: "Что мешает следующему шагу",
      blocks: buildRiskBlocks(workingDraft, variant),
      ask: {
        title: profile.askTitle,
        body: workingDraft.desiredOutcome,
      },
    },
    {
      id: "next-step",
      index: "06",
      shortLabel: "Следующий шаг",
      layout: "next-step",
      title: "Как идём дальше",
      subtitle: "Короткий план на следующий проход",
      blocks: [
        {
          id: "focus",
          title: "На чём держим разговор",
          items: buildNextStepItems(workingDraft, variant),
          tone: "primary",
        },
        {
          id: "deps",
          title: "Что ещё нужно добрать",
          items: workingDraft.missingFacts.slice(0, 3),
          tone: "warning",
          placeholder: true,
        },
      ],
      ask: {
        title: profile.askTitle,
        body: workingDraft.desiredOutcome,
      },
    },
  ];

  return {
    documentTitle: titleBase,
    documentSubtitle: contextLine,
    activeVariant: variant,
    workingDraft,
    slides,
    missingFacts: workingDraft.missingFacts,
    fitPassNotes: [],
  };
}

export function runFitPassOnDraft(draft: PresentationDraft): PresentationDraft {
  const notes = new Set<string>();
  const slides = draft.slides.map((slide) => fitPassSlide(slide, notes));
  const missingFacts = draft.missingFacts
    .slice(0, 3)
    .map((item) => clampText(item, 56));

  return {
    ...draft,
    slides,
    missingFacts,
    fitPassNotes: Array.from(notes),
  };
}

export function regenerateSlide(
  draft: PresentationDraft,
  slideId: SlideLayout,
  variant: RegenVariant
): PresentationDraft {
  const regenerated = buildPresentationDraft(draft.workingDraft, variant);
  const slide = regenerated.slides.find((item) => item.id === slideId);

  if (!slide) {
    return draft;
  }

  const nextDraft: PresentationDraft = {
    ...draft,
    activeVariant: variant,
    slides: draft.slides.map((item) => (item.id === slideId ? slide : item)),
  };

  return runFitPassOnDraft(nextDraft);
}

function fitPassSlide(slide: PresentationSlide, notes: Set<string>) {
  const fittedBlocks = slide.blocks.slice(0, 4).map((block) => {
    const nextBlock: SlideBlock = {
      ...block,
      title: clampText(block.title, 44),
      body: block.body ? clampText(block.body, 168) : undefined,
      emphasis: block.emphasis ? clampText(block.emphasis, 68) : undefined,
      items: block.items?.slice(0, 3).map((item) => clampText(item, 76)),
    };

    if (
      nextBlock.title !== block.title ||
      nextBlock.body !== block.body ||
      nextBlock.emphasis !== block.emphasis ||
      nextBlock.items?.join("|") !== block.items?.join("|")
    ) {
      notes.add("fit-pass укоротил длинные формулировки");
    }

    return nextBlock;
  });

  if (fittedBlocks.length !== slide.blocks.length) {
    notes.add("fit-pass убрал лишние блоки");
  }

  if (slide.blocks.some((block) => block.placeholder)) {
    notes.add("fit-pass сохранил только офисные placeholders");
  }

  return {
    ...slide,
    title: clampText(slide.title, 84),
    subtitle: clampText(slide.subtitle, 72),
    speakerNote: slide.speakerNote ? clampText(slide.speakerNote, 120) : undefined,
    ask: slide.ask
      ? {
          title: clampText(slide.ask.title, 32),
          body: clampText(slide.ask.body, 120),
        }
      : undefined,
    blocks: fittedBlocks,
  };
}

function buildGoal(mode: StorylineModeId) {
  if (mode === "choice") {
    return "Показать рабочий сигнал, назвать ограничение и подвести разговор к одному согласованию.";
  }

  if (mode === "structure") {
    return "Разложить ситуацию по сути, чтобы быстро снять главные вопросы и не потерять ход разговора.";
  }

  return "Зафиксировать статус периода без лишнего шума и оставить понятный следующий шаг.";
}

function buildSignalLine(workingDraft: WorkingDraft, variant: RegenVariant) {
  if (variant === "choice") {
    return "Есть рабочий сигнал. Следующий шаг упирается в одно согласование.";
  }

  if (variant === "structure") {
    return "Сигнал уже виден, но его важно быстро разложить по сути.";
  }

  return "Основной сигнал периода читается без длинного комментария.";
}

function buildSignalBody(workingDraft: WorkingDraft) {
  return clampText(
    `${workingDraft.topicLabel} уже даёт рабочий результат. Главный риск теперь не в поиске идеи, а в том, чтобы честно закрыть недостающую фактуру и перейти к следующему шагу.`,
    168
  );
}

function buildRiskBlocks(
  workingDraft: WorkingDraft,
  variant: RegenVariant
) {
  return [
    {
      id: "resource",
      title: variant === "choice" ? "Что нужно согласовать" : "Главный риск",
      body: workingDraft.desiredOutcome,
      tone: "warning" as const,
    },
    {
      id: "facture",
      title: "Чего пока не хватает",
      items: workingDraft.missingFacts.slice(0, 3),
      tone: "neutral" as const,
      placeholder: true,
    },
    {
      id: "pace",
      title: "Что будет дальше",
      body: "Если не закрыть главный пробел сейчас, следующий проход уйдёт в повторный круг вместо движения вперёд.",
      tone: "primary" as const,
    },
  ];
}

function buildNextStepItems(
  workingDraft: WorkingDraft,
  variant: RegenVariant
) {
  const items = [
    `${MODE_COPY[variant].actionLabel}.`,
    `Держим один главный сигнал по теме «${workingDraft.topicLabel}».`,
    clampText(workingDraft.desiredOutcome, 76),
  ];

  if (workingDraft.factCoverage === "thin") {
    items[1] = "Сразу помечаем, что часть фактуры ещё нужно добрать.";
  }

  return items;
}

function buildFallbackKeyMessage(
  topicLabel: string,
  mode: StorylineModeId
) {
  if (mode === "choice") {
    return `По теме «${topicLabel}» уже есть рабочий сигнал. Дальше нужен один следующий выбор.`;
  }

  if (mode === "structure") {
    return `По теме «${topicLabel}» уже виден результат, но его важно быстро разложить по сути.`;
  }

  return `По теме «${topicLabel}» уже виден ход периода и понятен следующий шаг.`;
}

function buildFallbackOutcome(mode: StorylineModeId) {
  if (mode === "choice") {
    return "Согласовать следующий шаг.";
  }

  if (mode === "structure") {
    return "Снять вопросы по сути.";
  }

  return "Зафиксировать текущее состояние.";
}

function buildDraftSummary({
  keyMessage,
  audience,
  desiredOutcome,
}: {
  keyMessage: string;
  audience: string;
  desiredOutcome: string;
}) {
  return clampText(
    `${keyMessage} Показываем это для ${audience}. После показа нужно: ${desiredOutcome.toLowerCase()}`,
    180
  );
}

function mergeKnownFacts(currentFacts: string[], fallbackFacts: string[]) {
  const facts = new Set<string>(currentFacts);

  for (const fact of fallbackFacts) {
    facts.add(fact);
  }

  return Array.from(facts).slice(0, 4);
}
