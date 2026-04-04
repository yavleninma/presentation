import type {
  BuildStage,
  OutlineStep,
  PresentationDraft,
  PresentationSlide,
  RequestUnderstanding,
  SlideMetric,
  SlidePanel,
} from "@/lib/presentation-types";

const STOP_WORDS = new Set([
  "за",
  "для",
  "что",
  "чтобы",
  "если",
  "где",
  "когда",
  "или",
  "как",
  "это",
  "эта",
  "этот",
  "надо",
  "нужно",
  "очень",
  "команда",
  "статус",
  "квартальный",
  "нужен",
  "собери",
  "подготовь",
  "покажи",
  "quarterly",
  "status",
  "team",
  "with",
  "from",
  "into",
  "about",
  "show",
  "need",
  "please",
  "presentation",
]);

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

const CANONICAL_OUTLINE: OutlineStep[] = [
  {
    id: "cover",
    index: "01",
    title: "Обложка",
    purpose: "Команда, период и контекст разговора.",
  },
  {
    id: "summary",
    index: "02",
    title: "Главный вывод и запрос к руководителю",
    purpose: "Ключевой вывод периода и одно решение сверху.",
  },
  {
    id: "metrics",
    index: "03",
    title: "Ключевые метрики",
    purpose: "Фактура по стабильности, скорости и нагрузке.",
  },
  {
    id: "work",
    index: "04",
    title: "Что сделали за период",
    purpose: "Основные результаты команды.",
  },
  {
    id: "risks",
    index: "05",
    title: "Риски и блокеры",
    purpose: "Ограничения, которые влияют на следующий шаг.",
  },
  {
    id: "next-step",
    index: "06",
    title: "Фокус следующего периода",
    purpose: "Приоритеты, зависимости и решение.",
  },
];

const BUILD_STAGES: BuildStage[] = [
  { id: "understand", title: "Понял задачу", detail: "" },
  { id: "outline", title: "Собрал план", detail: "" },
  { id: "rhythm", title: "Подбираю визуальный ритм", detail: "" },
  { id: "slides", title: "Генерирую слайды", detail: "" },
];

export function buildPresentationDraft(rawPrompt: string): PresentationDraft {
  const prompt = normalizePrompt(rawPrompt);
  const fragments = extractFragments(prompt);
  const numbers = extractNumbers(prompt);
  const keywords = extractKeywords(prompt);
  const understanding = buildUnderstanding(prompt, fragments);
  const summaryTitle = buildSummaryTitle(understanding.team, prompt);
  const leadershipAsk = buildLeadershipAsk(prompt, keywords);
  const missingFacts = buildMissingFacts(numbers, prompt);
  const documentTitle = `${understanding.team}: квартальный статус`;
  const documentSubtitle = `${understanding.period} • ${understanding.audience}`;
  const summaryBullets = buildSummaryBullets(fragments, leadershipAsk);
  const metrics = buildMetrics(numbers, keywords);
  const workPanels = buildWorkPanels(fragments, keywords, numbers, understanding.team);
  const riskPanels = buildRiskPanels(prompt, keywords);
  const nextPanels = buildNextStepPanels(keywords, leadershipAsk, prompt);

  const slides: PresentationSlide[] = [
    {
      id: "cover",
      index: "01",
      shortLabel: "Обложка",
      layout: "cover",
      eyebrow: understanding.period,
      title: documentTitle,
      subtitle: "Прогресс, риски и следующий шаг",
      lead: `Материал для ${understanding.audience.toLowerCase()}.`,
      bullets: [
        `Команда: ${understanding.team}`,
        `Период: ${understanding.period}`,
        `Фокус: ${understanding.goal}`,
      ],
    },
    {
      id: "summary",
      index: "02",
      shortLabel: "Главный вывод",
      layout: "summary",
      eyebrow: "Главный вывод",
      title: summaryTitle,
      subtitle: "Ключевой вывод периода",
      lead:
        fragments[0] ??
        `${understanding.team} показала прогресс по основным задачам периода и требует одного управленческого решения.`,
      bullets: summaryBullets,
      ask: {
        title: "Запрос к руководителю",
        body: leadershipAsk,
      },
      missingFacts,
    },
    {
      id: "metrics",
      index: "03",
      shortLabel: "Метрики",
      layout: "metrics",
      eyebrow: "Ключевые метрики",
      title: `Ключевые метрики ${understanding.period}`,
      subtitle: "Стабильность, скорость и нагрузка",
      lead:
        "Метрики показывают текущий ритм работы команды и зоны, где нужен следующий шаг.",
      metrics,
      missingFacts,
    },
    {
      id: "work",
      index: "04",
      shortLabel: "Что сделали",
      layout: "work",
      eyebrow: `Что сделали за ${understanding.period}`,
      title: `Что сделали за ${understanding.period}`,
      subtitle: "Основные результаты команды",
      lead:
        "Период собран вокруг нескольких результатов, которые уже влияют на скорость и устойчивость работы.",
      panels: workPanels,
    },
    {
      id: "risks",
      index: "05",
      shortLabel: "Риски",
      layout: "risks",
      eyebrow: "Риски и блокеры",
      title: "Риски и блокеры",
      subtitle: "Что ограничивает следующий шаг",
      lead:
        "Следующий период упрётся в несколько ограничений, если их не закрыть сейчас.",
      panels: riskPanels,
      ask: {
        title: "Где нужен шаг сверху",
        body: leadershipAsk,
      },
    },
    {
      id: "next-step",
      index: "06",
      shortLabel: "Следующий период",
      layout: "next-step",
      eyebrow: "Фокус следующего периода",
      title: "Фокус следующего периода",
      subtitle: "Приоритеты, зависимости и решение",
      lead:
        "Следующий период требует короткого фокуса и одного понятного решения сверху.",
      panels: nextPanels,
      ask: {
        title: "Решение",
        body: leadershipAsk,
      },
      missingFacts,
    },
  ];

  return {
    documentTitle,
    documentSubtitle,
    scenarioLabel: "Квартальный статус команды",
    understanding,
    outline: CANONICAL_OUTLINE,
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
    .filter((item) => item.length > 12 && !isDirectiveFragment(item))
    .slice(0, 6);
}

function isDirectiveFragment(fragment: string) {
  return /^(собери|подготовь|нужен|сделай|покажи)\b/i.test(fragment.trim());
}

function extractNumbers(prompt: string) {
  const matches = prompt.match(
    /\b\d+[.,]?\d*\s?(?:%|x|ч|час(?:а|ов)?|дн(?:я|ей)?|мин(?:ут)?|сервис(?:а|ов)?|релиз(?:а|ов)?|инцидент(?:а|ов)?|тикет(?:а|ов)?|эпик(?:а|ов)?|чел(?:овек|.)?)?\b/gi
  );

  return Array.from(new Set(matches ?? [])).slice(0, 4);
}

function extractKeywords(prompt: string) {
  return prompt
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .slice(0, 8);
}

function buildUnderstanding(
  prompt: string,
  fragments: string[]
): RequestUnderstanding {
  return {
    period: extractPeriod(prompt),
    team: extractTeam(prompt),
    audience: extractAudience(prompt),
    goal: extractGoal(prompt),
    tone: extractTone(prompt),
    sourceSummary:
      fragments[0] ??
      "Команда просит собрать квартальный статус с прогрессом, рисками и следующим шагом.",
  };
}

function extractPeriod(prompt: string) {
  const match =
    prompt.match(/\bQ[1-4]\s*20\d{2}\b/i) ??
    prompt.match(/\b[1-4]\s*квартал(?:а)?\s*20\d{2}\b/i) ??
    prompt.match(/\bQ[1-4]\b/i);

  return match?.[0] ?? "Текущий период";
}

function extractTeam(prompt: string) {
  const match =
    prompt.match(/(?:команд[аы]|team)\s+([^,.!]+)/i) ??
    prompt.match(/([^,.!]{3,40})\s+team/i);

  if (!match?.[1]) {
    return "Команда продукта";
  }

  return toTitleCase(
    trimLabel(match[1])
      .replace(/\bза\s+q[1-4].*/i, "")
      .replace(/\bдля\s+.*/i, "")
      .replace(/\bпо\s+итогам.*/i, "")
      .trim()
  );
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
  if (/риск|blocker|блокер/i.test(prompt)) {
    return "Показать прогресс, риски и следующий шаг.";
  }

  if (/решени|budget|priority|hire|найм/i.test(prompt)) {
    return "Показать прогресс и получить решение по следующему шагу.";
  }

  return "Показать прогресс, риски и следующий шаг.";
}

function extractTone(prompt: string) {
  if (/коротк|короче|short/i.test(prompt)) {
    return "Строгий и короткий";
  }

  if (/board|совет|директор/i.test(prompt)) {
    return "Строгий и руководительский";
  }

  return "Строгий и рабочий";
}

function trimLabel(value: string) {
  return value
    .replace(/\s+/g, " ")
    .split(/(?:\s+-\s+|\s+\|\s+)/)[0]
    .trim();
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSummaryTitle(team: string, prompt: string) {
  if (/найм|hire|hiring/i.test(prompt)) {
    return `${team} удержала темп, но следующий период упирается в найм`;
  }

  if (/бюджет|budget/i.test(prompt)) {
    return `${team} удержала темп, но следующий период зависит от бюджета`;
  }

  if (/приоритет|priority/i.test(prompt)) {
    return `${team} показала прогресс, но требует одного приоритета сверху`;
  }

  return `${team} показала прогресс и требует одного решения на следующий период`;
}

function buildLeadershipAsk(prompt: string, keywords: string[]) {
  if (/найм|hire|hiring/i.test(prompt)) {
    return "Подтвердить найм или перераспределить ресурс, чтобы не просел следующий период.";
  }

  if (/бюджет|budget/i.test(prompt)) {
    return "Подтвердить бюджет следующего периода и не сдвигать критический фокус вправо.";
  }

  if (/приоритет|priority/i.test(prompt)) {
    return "Зафиксировать один верхний приоритет периода и снять конкурирующие ожидания.";
  }

  const keyword = keywords[0] ?? "ключевому направлению";
  return `Подтвердить следующий шаг по ${keyword} и убрать неопределённость на уровне руководителя.`;
}

function buildMissingFacts(numbers: string[], prompt: string) {
  const facts = [
    numbers[0] ? null : "Нужна цифра по стабильности.",
    numbers[1] ? null : "Нужна цифра по скорости поставки.",
    /найм|budget|бюджет|приоритет|priority/i.test(prompt)
      ? null
      : "Уточнить решение, которое нужно от руководителя.",
  ].filter(Boolean);

  return facts.slice(0, 3) as string[];
}

function buildSummaryBullets(fragments: string[], leadershipAsk: string) {
  const bullets = fragments
    .slice(0, 3)
    .map((item) => normalizeSentence(item))
    .slice(0, 3);

  while (bullets.length < 3) {
    const fallback = [
      "Прогресс по ключевым задачам есть и требует короткой фактуры по цифрам.",
      "Риски названы отдельно и влияют на следующий период уже сейчас.",
      leadershipAsk,
    ][bullets.length];

    bullets.push(fallback);
  }

  return bullets;
}

function buildMetrics(numbers: string[], keywords: string[]): SlideMetric[] {
  const labels = [
    "Стабильность",
    "Скорость поставки",
    "Нагрузка команды",
    "Риск периода",
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
            ? "Нужна цифра, чтобы показать устойчивость периода."
            : index === 1
              ? "Нужна цифра, чтобы показать скорость поставки."
              : index === 2
                ? "Нужна цифра, чтобы показать текущую нагрузку."
                : "Нужна короткая фактура по главному риску периода.",
        tone: tones[index],
        placeholder: true,
      };
    }

    return {
      label,
      value,
      note:
        index === 0
          ? "Показывает текущую устойчивость сервиса и процессов."
          : index === 1
            ? "Показывает ритм поставки и скорость изменений."
            : index === 2
              ? "Показывает, насколько напряжён текущий объём работы."
              : `Связан с темой ${keywords[0] ?? "следующего периода"}.`,
      tone: tones[index],
    };
  });
}

function buildWorkPanels(
  fragments: string[],
  keywords: string[],
  numbers: string[],
  team: string
): SlidePanel[] {
  const titles = ["Поставка", "Стабильность", "Команда"];
  const fallbacks = [
    `${team} удержала движение по ключевым задачам периода.`,
    "Отдельный фокус был на стабильности и снижении операционного шума.",
    "Команда закрывала текущий период без потери фокуса на следующем шаге.",
  ];

  return titles.map((title, index) => ({
    title,
    body: normalizeSentence(fragments[index] ?? fallbacks[index]),
    items: [
      `Фокус: ${keywords[index] ?? defaultKeywordByIndex(index)}.`,
      numbers[index]
        ? `Фактура: ${numbers[index]}.`
        : "Для финальной версии нужна одна цифра.",
    ],
    tone: index === 1 ? "success" : index === 2 ? "warning" : "primary",
  }));
}

function defaultKeywordByIndex(index: number) {
  return ["ключевые поставки", "устойчивость", "ресурс"][index] ?? "фокус периода";
}

function buildRiskPanels(prompt: string, keywords: string[]): SlidePanel[] {
  const resourceRisk = /найм|hire|hiring/i.test(prompt)
    ? "Темп следующего периода зависит от закрытия роли, без которой команда упрётся в ресурс."
    : "Есть риск перегруза, если следующий период останется без одного явного приоритета.";

  const qualityRisk = /qa|quality|flaky|тест/i.test(prompt)
    ? "Качество уже влияет на скорость поставки и требует отдельного решения по проверкам."
    : "Нужна короткая фактура по качеству, чтобы риск не остался общим словом.";

  const dependencyRisk = /миграц|migration|platform|infra|инфра/i.test(prompt)
    ? "Инфраструктурный переход может съесть внимание команды, если не ограничить объём."
    : "Есть внешняя зависимость, которая влияет на ход следующего периода.";

  return [
    {
      title: "Ресурс",
      body: resourceRisk,
      items: [
        "Влияние: проседает фокус следующего периода.",
        "Что нужно: закрепить один ресурсный шаг.",
      ],
      tone: "warning",
      badge: "Средний",
    },
    {
      title: "Качество",
      body: qualityRisk,
      items: [
        "Влияние: замедляется скорость поставки.",
        "Что нужно: назвать одну цифру и один шаг по качеству.",
      ],
      tone: "danger",
      badge: "Высокий",
    },
    {
      title: "Зависимость",
      body: dependencyRisk,
      items: [
        `Влияние: тормозит направление ${keywords[0] ?? "следующего периода"}.`,
        "Что нужно: вынести решение на уровень руководителя.",
      ],
      tone: "primary",
      badge: "Нужен шаг сверху",
    },
  ];
}

function buildNextStepPanels(
  keywords: string[],
  leadershipAsk: string,
  prompt: string
): SlidePanel[] {
  const firstFocus = keywords[0] ?? "ключевой фокус периода";
  const secondFocus = keywords[1] ?? "качество";
  const thirdFocus = keywords[2] ?? "скорость поставки";

  return [
    {
      title: "Приоритеты",
      body: "Следующий период должен быть собран вокруг короткого набора задач, а не вокруг длинного списка ожиданий.",
      items: [
        `Удержать фокус по ${firstFocus}.`,
        `Дожать фактуру по ${secondFocus}.`,
        `Не просадить ритм по ${thirdFocus}.`,
      ],
      tone: "primary",
    },
    {
      title: "Зависимости",
      body:
        /найм|hire|budget|бюджет|priority|приоритет/i.test(prompt)
          ? "У следующего периода уже есть одна внешняя зависимость, которую нужно закрыть заранее."
          : "Команда зависит не только от себя, и это лучше зафиксировать до старта следующего периода.",
      items: [
        "Один управленческий приоритет.",
        "Один внешний шаг по ресурсу, бюджету или очередности.",
      ],
      tone: "warning",
    },
    {
      title: "Решение",
      body: leadershipAsk,
      items: ["После этого решения можно переводить статус в точечные правки и финальную отдачу."],
      tone: "success",
    },
  ];
}

function normalizeSentence(value: string) {
  const trimmed = value.trim();
  const sentence = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
