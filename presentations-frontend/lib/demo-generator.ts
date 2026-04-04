import type {
  ClarifyDepthId,
  ClarifyFocusId,
  ClarifyState,
  ColorId,
  PresentationDraft,
  PresentationSlide,
  RegenVariant,
  SlideBlock,
  SlideLayout,
  TemplateId,
  WorkingDraft,
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
  "квартальный",
  "статус",
  "команда",
  "команды",
  "проект",
  "проекта",
  "важно",
  "нужен",
  "нужно",
  "период",
  "period",
  "team",
  "show",
  "need",
  "with",
  "from",
  "about",
]);

const VARIANT_LABEL: Record<ClarifyFocusId, string> = {
  update: "апдейт",
  explain: "объяснение",
  decision: "решение",
};

const VARIANT_PROFILE: Record<
  RegenVariant,
  {
    lead: string;
    reasonTitle: string;
    reasonItems: string[];
    speakerNote: string;
    askTitle: string;
  }
> = {
  update: {
    lead: "Фиксируем спокойный статус периода без лишних ответвлений.",
    reasonTitle: "Почему этого уже достаточно",
    reasonItems: [
      "Картина периода держится на одном главном сигнале.",
      "Риск назван отдельно и не размыт по слайду.",
      "Следующий шаг понятен без длинного комментария.",
    ],
    speakerNote:
      "Сначала дай короткий статус, потом назови один риск и закончи следующим шагом.",
    askTitle: "Что подтвердить",
  },
  explain: {
    lead: "Сначала объясняем, на чём держится сигнал, и только потом переходим к риску.",
    reasonTitle: "Почему сигнал можно объяснить",
    reasonItems: [
      "Главный результат уже читается без длинного экскурса.",
      "Ограничение локализовано и не спорит с основным выводом.",
      "Руководителю видно, что именно ещё нужно подтвердить.",
    ],
    speakerNote:
      "Начни с сигнала, затем покажи, из чего он сложен, и только потом переведи разговор к риску.",
    askTitle: "Что нужно уточнить",
  },
  decision: {
    lead: "Держим разговор на решении и не тонем в устройстве.",
    reasonTitle: "Почему решение можно обсуждать сейчас",
    reasonItems: [
      "Сигнал уже рабочий, а не исследовательский.",
      "Главная дыра названа честно и не спрятана в мелкий текст.",
      "Следующий шаг упирается в ресурс, а не в новый виток анализа.",
    ],
    speakerNote:
      "Начни с сигнала, потом назови дыру и быстро верни разговор к решению про ресурс.",
    askTitle: "Какое решение нужно сейчас",
  },
};

export const EXAMPLE_PROMPTS = [
  "Нужно собрать презентацию для руководителя по итогам квартала: что реально сдвинули, где риск, и какое решение нужно сверху.",
  "Собери квартальный статус backend platform team за Q1 2026: снизили MTTR, мигрировали 18 сервисов и упёрлись в найм QA.",
  "Подготовь рабочую презентацию по пилоту поиска: что уже работает, что пока не доказано и зачем нужен ресурс на следующий шаг.",
];

export const SCENARIO_CHIPS = [
  {
    id: "quarter",
    label: "Квартальный статус",
    prompt: EXAMPLE_PROMPTS[0],
  },
  {
    id: "decision",
    label: "Защита решения",
    prompt: EXAMPLE_PROMPTS[2],
  },
  {
    id: "project",
    label: "Итоги проекта",
    prompt:
      "Нужно показать итоги проекта за квартал: что уже работает, какие риски остались и что нужно утвердить на следующий этап.",
  },
  {
    id: "custom",
    label: "Уточнить",
    prompt: "",
  },
] as const;

export const CLARIFY_FOCUS_OPTIONS: Array<{
  id: ClarifyFocusId;
  label: string;
}> = [
  { id: "update", label: "Апдейт" },
  { id: "explain", label: "Объяснить" },
  { id: "decision", label: "Добиться решения" },
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

export function getClarifyQuestion(focus: ClarifyFocusId | null) {
  if (focus === "decision") {
    return "Нужно ли держать разговор на уровне решения, а не в деталях?";
  }

  if (focus === "explain") {
    return "Нужно сначала объяснить сигнал, а потом перейти к риску?";
  }

  return "Держим разговор как короткий статус без ухода в детали?";
}

export function getClarifyDepthOptions(
  focus: ClarifyFocusId | null
): Array<{ id: ClarifyDepthId; label: string }> {
  if (focus === "decision") {
    return [
      { id: "signal", label: "Да, держим решение" },
      { id: "detail", label: "Нет, нужны детали" },
    ];
  }

  if (focus === "explain") {
    return [
      { id: "signal", label: "Да, сначала объяснить" },
      { id: "detail", label: "Нет, идём шире" },
    ];
  }

  return [
    { id: "signal", label: "Да, коротко" },
    { id: "detail", label: "Нет, нужен контекст" },
  ];
}

export function buildWorkingDraft(
  rawPrompt: string,
  clarify: ClarifyState
): WorkingDraft {
  const sourcePrompt = normalizePrompt(rawPrompt);
  const period = extractPeriod(sourcePrompt);
  const audience = extractAudience(sourcePrompt);
  const topicLabel = extractTopicLabel(sourcePrompt);
  const decisionNeeded = extractDecisionNeeded(sourcePrompt, clarify.focus);
  const goal = buildGoal(clarify.focus);
  const missingFacts = buildMissingFacts(sourcePrompt);
  const coreMessage = buildCoreMessage({
    topicLabel,
    focus: clarify.focus,
    decisionNeeded,
    sourcePrompt,
  });

  return {
    sourcePrompt,
    topicLabel,
    audience,
    period,
    focus: clarify.focus,
    depth: clarify.depth,
    goal,
    decisionNeeded,
    coreMessage,
    missingFacts,
  };
}

export function buildPresentationDraft(
  workingDraft: WorkingDraft,
  variant: RegenVariant = workingDraft.focus
): PresentationDraft {
  const profile = VARIANT_PROFILE[variant];
  const shortFacts = extractShortFacts(workingDraft.sourcePrompt);
  const decisionLine = workingDraft.decisionNeeded;
  const contextLine = `${workingDraft.period} • ${workingDraft.audience}`;
  const titleBase = `${workingDraft.topicLabel} — статус за ${workingDraft.period}`;

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
          id: "focus",
          title: "Точка разговора",
          body: decisionLine,
          tone: "primary",
        },
      ],
    },
    {
      id: "summary",
      index: "02",
      shortLabel: "Главный вывод",
      layout: "summary",
      title: workingDraft.coreMessage,
      subtitle: profile.lead,
      blocks: [
        {
          id: "signal",
          title: "Что уже видно",
          items: shortFacts.slice(0, 3),
          tone: "success",
        },
        {
          id: "decision",
          title: profile.askTitle,
          body: decisionLine,
          tone: variant === "decision" ? "warning" : "primary",
        },
      ],
    },
    {
      id: "changes",
      index: "03",
      shortLabel: "Что изменилось",
      layout: "changes",
      title: `Что изменилось за ${workingDraft.period}`,
      subtitle: `Фокус разговора: ${VARIANT_LABEL[variant]}`,
      blocks: [
        {
          id: "already",
          title: "Уже работает",
          items: shortFacts.slice(0, 3),
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
      shortLabel: "Доказательства",
      layout: "evidence",
      title: "На чём держится вывод",
      subtitle: "Только опорные факты и честные пробелы",
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
      blocks: buildRiskBlocks(workingDraft),
      ask: {
        title: "Где нужна помощь",
        body: decisionLine,
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
          title: "На чём держим период",
          items: buildNextStepItems(workingDraft, variant),
          tone: "primary",
        },
        {
          id: "deps",
          title: "Что нужно подтвердить",
          items: workingDraft.missingFacts.slice(0, 3),
          tone: "warning",
          placeholder: true,
        },
      ],
      ask: {
        title: "Решение",
        body: decisionLine,
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
  const missingFacts = draft.missingFacts.slice(0, 3).map((item) => clampText(item, 56));

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
    notes.add("fit-pass сохранил только офисные placeholder’ы");
  }

  return {
    ...slide,
    title: clampText(slide.title, 84),
    subtitle: clampText(slide.subtitle, 72),
    speakerNote: slide.speakerNote ? clampText(slide.speakerNote, 120) : undefined,
    ask: slide.ask
      ? {
          title: clampText(slide.ask.title, 28),
          body: clampText(slide.ask.body, 120),
        }
      : undefined,
    blocks: fittedBlocks,
  };
}

function buildGoal(focus: ClarifyFocusId) {
  if (focus === "decision") {
    return "Показать рабочий сигнал, назвать риск и получить одно решение сверху.";
  }

  if (focus === "explain") {
    return "Коротко объяснить, что уже работает, где ограничение и что делать дальше.";
  }

  return "Зафиксировать статус периода без лишнего шума и оставить понятный следующий шаг.";
}

function buildSignalLine(workingDraft: WorkingDraft, variant: RegenVariant) {
  if (variant === "decision") {
    return "Есть рабочий сигнал. Следующий шаг требует ресурса.";
  }

  if (variant === "explain") {
    return "Сигнал уже виден, но его важно коротко объяснить.";
  }

  return "Основной сигнал периода читается без длинного комментария.";
}

function buildSignalBody(workingDraft: WorkingDraft) {
  return clampText(
    `${workingDraft.topicLabel} уже даёт рабочий результат. Главный риск теперь не в поиске идеи, а в том, чтобы честно закрыть недостающую фактуру и перейти к следующему шагу.`,
    168
  );
}

function buildRiskBlocks(workingDraft: WorkingDraft) {
  return [
    {
      id: "resource",
      title: "Ресурс",
      body: workingDraft.decisionNeeded,
      tone: "warning" as const,
    },
    {
      id: "facture",
      title: "Фактура",
      items: workingDraft.missingFacts.slice(0, 3),
      tone: "neutral" as const,
      placeholder: true,
    },
    {
      id: "pace",
      title: "Темп",
      body: "Если не закрыть главный пробел сейчас, следующий период уйдёт в повторное объяснение вместо движения вперёд.",
      tone: "primary" as const,
    },
  ];
}

function buildNextStepItems(workingDraft: WorkingDraft, variant: RegenVariant) {
  const items = [
    `Держим фокус как ${VARIANT_LABEL[variant]}.`,
    `Оставляем один главный сигнал по теме «${workingDraft.topicLabel}».`,
    clampText(workingDraft.decisionNeeded, 76),
  ];

  if (workingDraft.depth === "detail") {
    items[1] = `Добавляем короткий контекст, но не уводим разговор в устройство решения.`;
  }

  return items;
}

function buildCoreMessage({
  topicLabel,
  focus,
  decisionNeeded,
  sourcePrompt,
}: {
  topicLabel: string;
  focus: ClarifyFocusId;
  decisionNeeded: string;
  sourcePrompt: string;
}) {
  const fragment = extractShortFacts(sourcePrompt)[0];

  if (fragment) {
    if (focus === "decision") {
      return clampText(`${fragment}. Следующий шаг требует решения сверху.`, 84);
    }

    if (focus === "explain") {
      return clampText(`${fragment}. Важно коротко показать, на чём держится сигнал.`, 84);
    }

    return clampText(`${fragment}. Следующий шаг уже читается из статуса периода.`, 84);
  }

  if (focus === "decision") {
    return `По теме «${topicLabel}» уже есть рабочий сигнал. Следующий шаг требует решения сверху.`;
  }

  if (focus === "explain") {
    return `По теме «${topicLabel}» уже виден результат, но его нужно коротко объяснить.`;
  }

  return `По теме «${topicLabel}» уже виден ход периода и понятен следующий шаг.`;
}

function extractDecisionNeeded(
  prompt: string,
  focus: ClarifyFocusId
) {
  if (/ресурс|budget|бюджет|funding|headcount/i.test(prompt)) {
    return "Подтвердить ресурс на следующий шаг.";
  }

  if (/найм|hire|hiring|qa/i.test(prompt)) {
    return "Подтвердить найм на следующий период.";
  }

  if (/priority|приоритет/i.test(prompt)) {
    return "Зафиксировать один верхний приоритет на следующий период.";
  }

  if (/approve|утверд|решени/i.test(prompt) || focus === "decision") {
    return "Подтвердить решение на следующий шаг.";
  }

  return "Согласовать следующий шаг команды.";
}

function buildMissingFacts(prompt: string) {
  const items = [
    /точност|accuracy/i.test(prompt)
      ? "Точность: [подтвердить измерение]"
      : "Точность: [нужна цифра]",
    /latency|время|speed/i.test(prompt)
      ? "Скорость: [подтвердить замер]"
      : "Срок эффекта: [подтвердить]",
    /выборк|coverage|сценар/i.test(prompt)
      ? "Покрытие: [уточнить выборку]"
      : "Покрытие: [уточнить]",
  ];

  return items;
}

function extractShortFacts(prompt: string) {
  const fragments = prompt
    .split(/[.!?;]+/)
    .map((item) => normalizeSentence(item))
    .filter((item) => item.length > 18)
    .slice(0, 3);

  if (fragments.length) {
    return fragments;
  }

  return [
    "Есть движение по главному сценарию периода",
    "Риск уже локализован и назван отдельно",
    "Следующий шаг можно обсуждать без длинного вступления",
  ];
}

function extractTopicLabel(prompt: string) {
  const englishTeamMatch = prompt.match(/([a-z][a-z0-9\s-]{2,30})\s+team/i);

  if (englishTeamMatch?.[1]) {
    return toTitleCase(englishTeamMatch[1]);
  }

  const russianTeamMatch = prompt.match(
    /команд[аы]\s+([а-яёa-z0-9\s-]{2,28})/i
  );

  if (russianTeamMatch?.[1]) {
    return normalizeSentence(russianTeamMatch[1]);
  }

  const keywords = extractKeywords(prompt);

  if (keywords[0]) {
    return normalizeSentence(keywords.slice(0, 2).join(" "));
  }

  return "Команда";
}

function extractAudience(prompt: string) {
  if (/cto|техническ[а-я]*\s+директор/i.test(prompt)) {
    return "CTO";
  }

  if (/ceo|генеральн[а-я]*\s+директор/i.test(prompt)) {
    return "CEO";
  }

  if (/руководител|director|head of/i.test(prompt)) {
    return "Руководитель направления";
  }

  return "Руководитель команды";
}

function extractPeriod(prompt: string) {
  const match =
    prompt.match(/\bQ[1-4]\s*20\d{2}\b/i) ??
    prompt.match(/\b[1-4]\s*квартал(?:а)?\s*20\d{2}\b/i) ??
    prompt.match(/\bQ[1-4]\b/i);

  return match?.[0] ?? "текущий период";
}

function extractKeywords(source: string) {
  return source
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .slice(0, 6);
}

function normalizePrompt(rawPrompt: string) {
  return rawPrompt.replace(/\s+/g, " ").trim();
}

function normalizeSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function toTitleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
