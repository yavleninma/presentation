import type {
  BuildStage,
  PresentationDraft,
  PresentationSlide,
  SlideMetric,
  SlidePanel,
  WorkingDraft,
} from "@/lib/presentation-types";

const STOP_WORDS = new Set([
  "для",
  "что",
  "чтобы",
  "если",
  "когда",
  "или",
  "как",
  "это",
  "эта",
  "этот",
  "надо",
  "нужно",
  "очень",
  "собери",
  "подготовь",
  "покажи",
  "сделай",
  "рабочую",
  "рабочий",
  "презентацию",
  "квартальный",
  "статус",
  "quarterly",
  "status",
  "with",
  "from",
  "about",
  "show",
  "need",
  "please",
  "presentation",
]);

const CANONICAL_OUTLINE = [
  {
    id: "cover",
    title: "Обложка",
    purpose: "Период, аудитория и фокус разговора.",
  },
  {
    id: "summary",
    title: "Главный вывод и запрос",
    purpose: "Один вывод периода и решение, которое нужно сейчас.",
  },
  {
    id: "metrics",
    title: "Ключевые метрики",
    purpose: "Цифры, по которым видно ход работы.",
  },
  {
    id: "work",
    title: "Что сделали за период",
    purpose: "Главные результаты команды без длинного отчёта.",
  },
  {
    id: "risks",
    title: "Риски и блокеры",
    purpose: "Что тормозит следующий шаг и где нужна помощь.",
  },
  {
    id: "next-step",
    title: "Следующий период",
    purpose: "Короткий план, зависимости и точка решения.",
  },
] as const;

const BUILD_STAGES: BuildStage[] = [
  { id: "understand", title: "Понял задачу", detail: "" },
  { id: "outline", title: "Собрал план", detail: "" },
  { id: "rhythm", title: "Собираю ритм слайдов", detail: "" },
  { id: "slides", title: "Готовлю черновик", detail: "" },
];

export const EXAMPLE_PROMPTS = [
  "Собери квартальный статус backend platform team за Q1 2026: снизили MTTR, мигрировали 18 сервисов и упёрлись в найм QA.",
  "Нужен квартальный статус команды продукта за 1 квартал 2026 для CTO: что сделали, где риски и какое решение нужно сверху.",
  "Подготовь рабочую презентацию по итогам квартала для руководителя направления: прогресс, блокеры и следующий шаг.",
];

export const SCREEN_FLOW = [
  { id: "start", title: "Запрос" },
  { id: "understanding", title: "Понимание" },
  { id: "outline", title: "План" },
  { id: "building", title: "Сборка" },
  { id: "editor", title: "Черновик" },
] as const;

export function buildWorkingDraft(rawPrompt: string): WorkingDraft {
  const prompt = normalizePrompt(rawPrompt);
  const fragments = extractFragments(prompt);
  const numbers = extractNumbers(prompt);
  const keywords = extractKeywords(prompt);
  const audience = extractAudience(prompt);
  const period = extractPeriod(prompt);
  const goal = extractGoal(prompt);
  const decisionNeeded = extractDecisionNeeded(prompt, keywords);
  const coreMessage = buildCoreMessage(fragments, keywords, decisionNeeded);
  const openQuestions = buildOpenQuestions(numbers, prompt, decisionNeeded);

  return {
    audience,
    period,
    goal,
    decisionNeeded,
    coreMessage,
    outline: CANONICAL_OUTLINE.map((item) => ({
      id: item.id,
      title: item.title,
      purpose: item.purpose,
      bullets: buildOutlineBullets({
        outlineId: item.id,
        fragments,
        numbers,
        keywords,
        audience,
        period,
        goal,
        decisionNeeded,
        coreMessage,
        openQuestions,
      }),
    })),
    openQuestions,
  };
}

export function buildPresentationDraft(workingDraft: WorkingDraft): PresentationDraft {
  const serializedDraft = serializeWorkingDraft(workingDraft);
  const numbers = extractNumbers(serializedDraft);
  const keywords = extractKeywords(serializedDraft);
  const decisionText =
    workingDraft.decisionNeeded ?? "Зафиксировать один следующий шаг на период.";

  const documentTitle = buildDocumentTitle(workingDraft);
  const documentSubtitle = `${workingDraft.period} • ${workingDraft.audience}`;
  const missingFacts = workingDraft.openQuestions;

  const slides: PresentationSlide[] = [
    {
      id: "cover",
      index: "01",
      shortLabel: "Обложка",
      layout: "cover",
      eyebrow: workingDraft.period,
      title: documentTitle,
      subtitle: "Фокус разговора",
      lead: workingDraft.coreMessage,
      bullets: [
        `Аудитория: ${workingDraft.audience}`,
        `Цель: ${workingDraft.goal}`,
        workingDraft.decisionNeeded
          ? `Решение: ${workingDraft.decisionNeeded}`
          : "Решение: уточним после первого черновика",
      ],
    },
    {
      id: "summary",
      index: "02",
      shortLabel: "Главный вывод",
      layout: "summary",
      eyebrow: "Главный вывод",
      title: trimSentence(workingDraft.coreMessage),
      subtitle: "Главный вывод периода",
      lead: workingDraft.goal,
      bullets: getOutlineBullets(workingDraft, "summary"),
      ask: {
        title: "Что нужно решить",
        body: decisionText,
      },
      missingFacts,
    },
    {
      id: "metrics",
      index: "03",
      shortLabel: "Метрики",
      layout: "metrics",
      eyebrow: "Ключевые метрики",
      title: `Ключевые метрики ${workingDraft.period}`,
      subtitle: "Что подтверждает вывод",
      lead: "На этом слайде держим только те цифры, которые помогают быстро понять прогресс и риск.",
      metrics: buildMetrics(numbers, keywords),
      missingFacts,
    },
    {
      id: "work",
      index: "04",
      shortLabel: "Что сделали",
      layout: "work",
      eyebrow: `Что сделали за ${workingDraft.period}`,
      title: `Что сделали за ${workingDraft.period}`,
      subtitle: "Главные результаты команды",
      lead: "Показываем только те результаты, по которым уже можно говорить о движении вперёд.",
      panels: buildWorkPanels(workingDraft),
    },
    {
      id: "risks",
      index: "05",
      shortLabel: "Риски",
      layout: "risks",
      eyebrow: "Риски и блокеры",
      title: "Риски и блокеры",
      subtitle: "Что мешает следующему шагу",
      lead: "Риски лучше назвать отдельно, чем прятать их внутрь общего статуса.",
      panels: buildRiskPanels(workingDraft, keywords),
      ask: {
        title: "Где нужна помощь",
        body: decisionText,
      },
      missingFacts,
    },
    {
      id: "next-step",
      index: "06",
      shortLabel: "Следующий период",
      layout: "next-step",
      eyebrow: "Следующий период",
      title: "Следующий период",
      subtitle: "Приоритеты и точка решения",
      lead: "Следующий шаг должен помещаться в короткий список действий и зависимостей.",
      panels: buildNextStepPanels(workingDraft),
      ask: {
        title: "Решение",
        body: decisionText,
      },
      missingFacts,
    },
  ];

  return {
    documentTitle,
    documentSubtitle,
    scenarioLabel: "Рабочая презентация",
    workingDraft,
    buildStages: BUILD_STAGES,
    slides,
    missingFacts,
  };
}

function normalizePrompt(rawPrompt: string) {
  return rawPrompt.replace(/\s+/g, " ").trim();
}

function extractFragments(prompt: string) {
  return prompt
    .split(/[\n.;:!?]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 14 && !isDirectiveFragment(item))
    .slice(0, 6);
}

function isDirectiveFragment(fragment: string) {
  return /^(собери|подготовь|нужен|сделай|покажи)\b/i.test(fragment.trim());
}

function extractNumbers(source: string) {
  const matches = source.match(
    /\b\d+[.,]?\d*\s?(?:%|x|ч|час(?:а|ов)?|дн(?:я|ей)?|мин(?:ут)?|сервис(?:а|ов)?|релиз(?:а|ов)?|инцидент(?:а|ов)?|тикет(?:а|ов)?|эпик(?:а|ов)?|чел(?:овек|.)?)?\b/gi
  );

  return Array.from(new Set(matches ?? [])).slice(0, 4);
}

function extractKeywords(source: string) {
  return source
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .slice(0, 8);
}

function extractPeriod(prompt: string) {
  const match =
    prompt.match(/\bQ[1-4]\s*20\d{2}\b/i) ??
    prompt.match(/\b[1-4]\s*квартал(?:а)?\s*20\d{2}\b/i) ??
    prompt.match(/\bQ[1-4]\b/i);

  return match?.[0] ?? "Текущий период";
}

function extractAudience(prompt: string) {
  if (/cto|техническ(?:ий|ого)\s+директор/i.test(prompt)) {
    return "CTO";
  }

  if (/ceo|генеральн(?:ый|ого)\s+директор/i.test(prompt)) {
    return "CEO";
  }

  if (/руководител|директор|head of/i.test(prompt)) {
    return "Руководитель направления";
  }

  return "Руководитель команды";
}

function extractGoal(prompt: string) {
  if (/решени|budget|бюджет|priority|приоритет|hire|найм/i.test(prompt)) {
    return "Показать прогресс и получить одно решение по следующему шагу.";
  }

  if (/риск|blocker|блокер/i.test(prompt)) {
    return "Показать прогресс, риски и следующий шаг.";
  }

  return "Показать прогресс периода и короткий план дальше.";
}

function extractDecisionNeeded(prompt: string, keywords: string[]) {
  if (/найм|hire|hiring/i.test(prompt)) {
    return "Подтвердить найм на следующий период.";
  }

  if (/бюджет|budget/i.test(prompt)) {
    return "Согласовать бюджет следующего периода.";
  }

  if (/приоритет|priority/i.test(prompt)) {
    return "Зафиксировать один верхний приоритет.";
  }

  if (/решени|approve|утверд/i.test(prompt)) {
    return "Подтвердить решение по следующему шагу.";
  }

  return keywords[0]
    ? `Подтвердить следующий шаг по теме «${keywords[0]}».`
    : undefined;
}

function buildCoreMessage(
  fragments: string[],
  keywords: string[],
  decisionNeeded?: string
) {
  if (fragments[0]) {
    return normalizeSentence(fragments[0]);
  }

  if (decisionNeeded) {
    return `Есть прогресс по периоду, но следующий шаг зависит от решения: ${trimSentence(decisionNeeded).toLowerCase()}.`;
  }

  return `Есть прогресс по ${keywords[0] ?? "главным задачам периода"}, и теперь важно коротко зафиксировать следующий шаг.`;
}

function buildOpenQuestions(
  numbers: string[],
  prompt: string,
  decisionNeeded?: string
) {
  const questions = [
    numbers[0] ? null : "Добавить одну цифру по результату периода.",
    numbers[1] ? null : "Добавить одну цифру по скорости или качеству.",
    decisionNeeded
      ? null
      : /решени|budget|бюджет|priority|приоритет|hire|найм/i.test(prompt)
        ? "Уточнить формулировку решения, которое нужно согласовать."
        : "Уточнить, какое решение или следующий шаг нужен после статуса.",
  ].filter(Boolean);

  return questions.slice(0, 3) as string[];
}

function buildOutlineBullets({
  outlineId,
  fragments,
  numbers,
  keywords,
  audience,
  period,
  goal,
  decisionNeeded,
  coreMessage,
  openQuestions,
}: {
  outlineId: string;
  fragments: string[];
  numbers: string[];
  keywords: string[];
  audience: string;
  period: string;
  goal: string;
  decisionNeeded?: string;
  coreMessage: string;
  openQuestions: string[];
}) {
  switch (outlineId) {
    case "cover":
      return [
        `Период: ${period}.`,
        `Аудитория: ${audience}.`,
        `Фокус: ${goal}`,
      ];
    case "summary":
      return [
        trimSentence(coreMessage),
        decisionNeeded ?? "Следующий шаг нужно уточнить вместе с руководителем.",
        normalizeSentence(fragments[1] ?? "На втором слайде держим один вывод и один запрос."),
      ];
    case "metrics":
      return [
        numbers[0]
          ? `Взять в слайд ключевую цифру: ${numbers[0]}.`
          : "Нужна первая цифра, которая подтверждает результат периода.",
        numbers[1]
          ? `Добавить вторую опорную цифру: ${numbers[1]}.`
          : "Нужна вторая цифра по скорости, качеству или объёму.",
        `Собрать метрики вокруг темы «${keywords[0] ?? "прогресса"}».`,
      ];
    case "work":
      return [
        normalizeSentence(fragments[0] ?? "Показать 2-3 результата без длинного перечня задач."),
        normalizeSentence(fragments[1] ?? "Оставить только то, что уже влияет на следующий период."),
        normalizeSentence(fragments[2] ?? "Под каждую карточку результата нужна короткая опора."),
      ];
    case "risks":
      return [
        normalizeSentence(fragments[3] ?? "Отдельно назвать главный риск периода."),
        decisionNeeded
          ? `Показать, почему без решения «${trimSentence(decisionNeeded).toLowerCase()}» риск остаётся открытым.`
          : "Показать, где команда зависит от внешнего решения.",
        openQuestions[0] ?? "Отдельно пометить, что ещё нужно уточнить.",
      ];
    case "next-step":
      return [
        `Следующий шаг: ${trimSentence(goal).replace(/\.$/, "").toLowerCase()}.`,
        decisionNeeded ?? "После статуса нужен один подтверждённый следующий шаг.",
        `Фокус периода: ${keywords[0] ?? "ключевое направление"}.`,
      ];
    default:
      return [];
  }
}

function buildDocumentTitle(workingDraft: WorkingDraft) {
  return workingDraft.period === "Текущий период"
    ? "Рабочая презентация"
    : `Статус за ${workingDraft.period}`;
}

function buildMetrics(numbers: string[], keywords: string[]): SlideMetric[] {
  const labels = [
    "Результат",
    "Скорость",
    "Нагрузка",
    "Риск",
  ];

  const tones: SlideMetric["tone"][] = [
    "success",
    "primary",
    "warning",
    "danger",
  ];

  return labels.map((label, index) => {
    const value = numbers[index];

    if (!value) {
      return {
        label,
        value: "Уточнить",
        note:
          index === 0
            ? "Нужна цифра, чтобы показать основной результат периода."
            : index === 1
              ? "Нужна цифра по скорости или времени цикла."
              : index === 2
                ? "Нужна цифра по нагрузке или объёму работы."
                : `Нужна короткая цифра по теме «${keywords[0] ?? "риска"}».`,
        tone: tones[index],
        placeholder: true,
      };
    }

    return {
      label,
      value,
      note:
        index === 0
          ? "Подтверждает основной результат периода."
          : index === 1
            ? "Показывает ритм поставки."
            : index === 2
              ? "Помогает увидеть текущую нагрузку."
              : "Показывает, где остаётся напряжение.",
      tone: tones[index],
    };
  });
}

function buildWorkPanels(workingDraft: WorkingDraft): SlidePanel[] {
  const bullets = getOutlineBullets(workingDraft, "work");

  return [
    {
      title: "Результат 1",
      body: bullets[0] ?? "Показать первый результат периода.",
      items: ["Одна короткая опора.", "Один смысл для руководителя."],
      tone: "primary",
    },
    {
      title: "Результат 2",
      body: bullets[1] ?? "Показать второй результат периода.",
      items: ["Без длинного перечня задач.", "Только то, что влияет на следующий шаг."],
      tone: "success",
    },
    {
      title: "Что важно помнить",
      body: bullets[2] ?? "Отдельно показать, что ещё требует внимания.",
      items: ["Если есть пробел в цифрах, пометить его коротко."],
      tone: "warning",
    },
  ];
}

function buildRiskPanels(workingDraft: WorkingDraft, keywords: string[]): SlidePanel[] {
  const bullets = getOutlineBullets(workingDraft, "risks");

  return [
    {
      title: "Главный риск",
      body: bullets[0] ?? "Нужно отдельно назвать главный риск периода.",
      items: ["Влияние: может замедлить следующий шаг."],
      tone: "danger",
      badge: "Высокий",
    },
    {
      title: "Что зависит снаружи",
      body: bullets[1] ?? "Есть зависимость от внешнего решения.",
      items: [`Тема: ${keywords[0] ?? "следующий период"}.`],
      tone: "warning",
      badge: "Нужен шаг",
    },
    {
      title: "Что ещё уточнить",
      body: bullets[2] ?? "Нужно быстро закрыть один пробел по фактам.",
      items:
        workingDraft.openQuestions.length > 0
          ? workingDraft.openQuestions
          : ["Уточнить один недостающий факт до финальной версии."],
      tone: "primary",
    },
  ];
}

function buildNextStepPanels(workingDraft: WorkingDraft): SlidePanel[] {
  const bullets = getOutlineBullets(workingDraft, "next-step");

  return [
    {
      title: "Приоритеты",
      body: bullets[0] ?? "Следующий шаг должен быть коротким и понятным.",
      items: [
        bullets[2] ?? "Нужен один главный фокус периода.",
      ],
      tone: "primary",
    },
    {
      title: "Зависимости",
      body:
        workingDraft.decisionNeeded ??
        "Нужно заранее назвать, от какого решения зависит следующий период.",
      items:
        workingDraft.openQuestions.length > 0
          ? [workingDraft.openQuestions[0]]
          : ["Если нужна цифра, договориться, кто её приносит."],
      tone: "warning",
    },
    {
      title: "Решение",
      body: bullets[1] ?? "После статуса нужен один подтверждённый следующий шаг.",
      items: ["После этого слайд можно переводить в финальные правки."],
      tone: "success",
    },
  ];
}

function getOutlineBullets(workingDraft: WorkingDraft, outlineId: string) {
  return workingDraft.outline.find((item) => item.id === outlineId)?.bullets ?? [];
}

function serializeWorkingDraft(workingDraft: WorkingDraft) {
  return [
    workingDraft.audience,
    workingDraft.period,
    workingDraft.goal,
    workingDraft.decisionNeeded,
    workingDraft.coreMessage,
    ...workingDraft.outline.flatMap((item) => [
      item.title,
      item.purpose,
      ...item.bullets,
    ]),
    ...workingDraft.openQuestions,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const sentence = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function trimSentence(value: string) {
  return value.trim().replace(/[.!?]+$/, "");
}
