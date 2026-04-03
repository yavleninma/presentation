import {
  ManagementSlideRole,
  MeetingScenarioId,
  PresentationBrief,
  PresentationFormatId,
  PresentationLengthId,
  SlideArchetype,
  SlideLayoutType,
  SlideRegenerationIntent,
} from "@/types/presentation";

export interface ScenarioDefinition {
  id: MeetingScenarioId;
  name: string;
  shortName: string;
  description: string;
  audienceHint: string;
  desiredOutcomeHint: string;
  thesisHint: string;
  askHint: string;
  sourceHint: string;
  promptSeed: string;
  defaultSlideCount: number;
  defaultArchetypes: SlideArchetype[];
}

export const DEFAULT_REGEN_INTENTS: SlideRegenerationIntent[] = [
  "keep-meaning",
  "make-shorter",
  "make-more-visual",
  "make-stricter",
  "focus-on-numbers",
];

export const slideRoleLabels: Record<ManagementSlideRole, string> = {
  inform: "Знакомит",
  explain: "Объясняет",
  compare: "Сравнивает",
  justify: "Подкрепляет",
  escalate: "Подсвечивает риск",
  recommend: "Ведёт к выводу",
  decide: "Подводит к решению",
  close: "Завершает",
};

export const archetypeLabels: Record<SlideArchetype, string> = {
  "headline-verdict": "Главный акцент",
  "kpi-dashboard-commentary": "Цифры и вывод",
  "progress-vs-plan": "Статус и динамика",
  "risk-heatmap": "Риски",
  "options-matrix": "Сравнение",
  "budget-waterfall": "Экономика",
  "roadmap-milestones": "План и этапы",
  "incident-timeline": "Ход событий",
  "dependency-map": "Связи и блокеры",
  "decision-slide": "Финальный вывод",
  "executive-summary": "Короткое резюме",
  "appendix-detail": "Дополнительный блок",
};

export const slideLayoutLabels: Record<SlideLayoutType, string> = {
  title: "Титульный",
  section: "Раздел",
  content: "Содержание",
  "two-columns": "Две колонки",
  "image-text": "Визуал и текст",
  kpi: "Ключевые цифры",
  timeline: "Ход по этапам",
  quote: "Цитата",
  "full-image": "Полноэкранный визуал",
  "thank-you": "Финальный",
};

export const regenerationIntentLabels: Record<
  SlideRegenerationIntent,
  string
> = {
  "keep-meaning": "Сохранить смысл",
  "make-shorter": "Сделать короче",
  "make-more-visual": "Сделать визуальнее",
  "make-stricter": "Сделать строже",
  "focus-on-numbers": "Акцент на цифрах",
  custom: "Своё указание",
};

export const presentationFormatLabels: Record<PresentationFormatId, string> = {
  report: "Отчёт",
  idea: "Идея",
  education: "Обучение",
  talk: "Доклад",
};

export const presentationLengthLabels: Record<PresentationLengthId, string> = {
  short: "Короткая",
  medium: "Средняя",
  detailed: "Развёрнутая",
};

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    id: "simple-presentation",
    name: "Быстрый черновик",
    shortName: "Черновик",
    description:
      "Лёгкий режим для красивой русскоязычной презентации: одна мысль на входе, аккуратная структура на выходе.",
    audienceHint: "Команда, клиент или аудитория презентации",
    desiredOutcomeHint:
      "Быстро получить понятный черновик и доработать его дальше в диалоге.",
    thesisHint: "Например: как запустить новый продукт без лишних рисков",
    askHint:
      "Например: помочь понять идею, принять решение или объяснить тему шаг за шагом",
    sourceHint:
      "Коротко опишите тему, факты, цифры или заметки. Если материалов нет, достаточно одной мысли.",
    promptSeed:
      "Собирай презентацию как красивый и живой черновик: ясный вход, ритм, аккуратные слайды, без бюрократического тона.",
    defaultSlideCount: 7,
    defaultArchetypes: [
      "headline-verdict",
      "executive-summary",
      "progress-vs-plan",
      "options-matrix",
      "kpi-dashboard-commentary",
      "roadmap-milestones",
      "decision-slide",
    ],
  },
  {
    id: "steering-committee",
    name: "Комитет",
    shortName: "Комитет",
    description: "Спрятанный продвинутый режим для управленческого пакета.",
    audienceHint: "Руководство, спонсоры, PMO",
    desiredOutcomeHint: "Собрать управленческую позицию для встречи.",
    thesisHint: "Что сейчас главное в ситуации",
    askHint: "Какое решение или действие нужно от аудитории",
    sourceHint: "Факты, статусы, риски, заметки и исходные материалы",
    promptSeed:
      "Строй материал как управленческий пакет: кратко, доказательно и с ясным выводом.",
    defaultSlideCount: 7,
    defaultArchetypes: [
      "headline-verdict",
      "progress-vs-plan",
      "risk-heatmap",
      "decision-slide",
      "appendix-detail",
    ],
  },
  {
    id: "quarterly-it-review",
    name: "Квартальный обзор ИТ",
    shortName: "Квартал",
    description: "Спрятанный продвинутый режим для квартального обзора.",
    audienceHint: "CEO, COO, CFO, руководство",
    desiredOutcomeHint: "Дать короткий обзор и согласовать фокус следующего периода.",
    thesisHint: "Главный итог квартала в одной мысли",
    askHint: "Какой следующий шаг нужен от руководства",
    sourceHint: "KPI, инициативы, риски и ключевые выводы",
    promptSeed:
      "Строй материал как квартальный обзор: цифры, выводы, риски и следующий шаг.",
    defaultSlideCount: 8,
    defaultArchetypes: [
      "executive-summary",
      "kpi-dashboard-commentary",
      "progress-vs-plan",
      "roadmap-milestones",
      "decision-slide",
    ],
  },
  {
    id: "budget-defense",
    name: "Защита бюджета",
    shortName: "Бюджет",
    description: "Спрятанный продвинутый режим для бюджетной аргументации.",
    audienceHint: "CFO, инвесткомитет, руководство",
    desiredOutcomeHint: "Обосновать инвестицию и предложить понятный выбор.",
    thesisHint: "Почему проект или расход нельзя откладывать",
    askHint: "Какое одобрение нужно получить",
    sourceHint: "Смета, варианты, эффекты, ограничения и риски",
    promptSeed:
      "Строй материал как защиту бюджета: цифры, компромиссы, последствия и вывод.",
    defaultSlideCount: 7,
    defaultArchetypes: [
      "headline-verdict",
      "options-matrix",
      "budget-waterfall",
      "decision-slide",
    ],
  },
  {
    id: "incident-risk-update",
    name: "Инцидент и риск",
    shortName: "Инцидент",
    description: "Спрятанный продвинутый режим для кризисного апдейта.",
    audienceHint: "CIO, COO, риск-комитет, спонсор",
    desiredOutcomeHint: "Честно показать статус и согласовать план действий.",
    thesisHint: "Что произошло и почему это важно",
    askHint: "Какой план нужно утвердить",
    sourceHint: "Таймлайн, impact, root cause, меры и открытые риски",
    promptSeed:
      "Строй материал как честный апдейт по инциденту: без оправданий, с ясным планом.",
    defaultSlideCount: 6,
    defaultArchetypes: [
      "headline-verdict",
      "incident-timeline",
      "risk-heatmap",
      "decision-slide",
    ],
  },
  {
    id: "vendor-decision",
    name: "Выбор платформы",
    shortName: "Выбор",
    description: "Спрятанный продвинутый режим для выбора решения или поставщика.",
    audienceHint: "Архитектурный комитет, закупки, руководство",
    desiredOutcomeHint: "Сравнить варианты и предложить лучший путь.",
    thesisHint: "Какой вариант выглядит сильнее и почему",
    askHint: "Что нужно утвердить",
    sourceHint: "Критерии, варианты, стоимость, риски и ограничения",
    promptSeed:
      "Строй материал как memo по выбору: критерии, trade-offs и рекомендация.",
    defaultSlideCount: 7,
    defaultArchetypes: [
      "headline-verdict",
      "options-matrix",
      "dependency-map",
      "decision-slide",
    ],
  },
  {
    id: "program-recovery",
    name: "Пересборка программы",
    shortName: "Пересборка",
    description: "Спрятанный продвинутый режим для rebaseline и recovery.",
    audienceHint: "Steering committee, sponsor, CFO",
    desiredOutcomeHint: "Показать разрыв и согласовать новый план.",
    thesisHint: "Что нужно признать и как выйти в новую траекторию",
    askHint: "Какой новый baseline или scope нужно утвердить",
    sourceHint: "Baseline, actual, причины, варианты и trade-offs",
    promptSeed:
      "Строй материал как recovery-пакет: честно о разрыве и ясно о новом плане.",
    defaultSlideCount: 8,
    defaultArchetypes: [
      "headline-verdict",
      "progress-vs-plan",
      "options-matrix",
      "decision-slide",
    ],
  },
  {
    id: "update-previous-package",
    name: "Обновление пакета",
    shortName: "Обновление",
    description: "Спрятанный продвинутый режим для обновления существующей презентации.",
    audienceHint: "Та же аудитория, что и у исходной презентации",
    desiredOutcomeHint: "Показать, что изменилось и что делать дальше.",
    thesisHint: "Как изменилась картина по сравнению с прошлой версией",
    askHint: "Что нужно пересмотреть или подтвердить",
    sourceHint: "Предыдущий пакет, новые факты, изменения по метрикам и рискам",
    promptSeed:
      "Строй материал как update-режим: сохрани контекст, но явно покажи изменения.",
    defaultSlideCount: 6,
    defaultArchetypes: [
      "executive-summary",
      "progress-vs-plan",
      "decision-slide",
    ],
  },
];

export const scenarioMap = Object.fromEntries(
  scenarioDefinitions.map((scenario) => [scenario.id, scenario])
) as Record<MeetingScenarioId, ScenarioDefinition>;

export function getScenarioDefinition(
  scenarioId: MeetingScenarioId
): ScenarioDefinition {
  return scenarioMap[scenarioId];
}

export function createEmptyBrief(
  scenarioId: MeetingScenarioId = "simple-presentation"
): PresentationBrief {
  const scenario = getScenarioDefinition(scenarioId);

  return {
    scenarioId,
    meetingName: scenario.name,
    audience: scenario.audienceHint,
    desiredOutcome: scenario.desiredOutcomeHint,
    deadline: "",
    mainThesis: "",
    leadershipAsk: "",
    workingWell: "",
    notWorking: "",
    criticalNumbers: "",
    risks: "",
    dependencies: "",
    sourceMaterial: "",
    presentationFormat: "talk",
    presentationLength: "medium",
    visualTheme: "minimal",
  };
}

export function formatBriefPrompt(brief: PresentationBrief): string {
  return [
    `Сценарий: ${getScenarioDefinition(brief.scenarioId).name}`,
    `Формат: ${presentationFormatLabels[brief.presentationFormat]}`,
    `Объём: ${presentationLengthLabels[brief.presentationLength]}`,
    `Тема оформления: ${brief.visualTheme}`,
    `Тема: ${brief.mainThesis}`,
    `Название: ${brief.meetingName}`,
    `Аудитория: ${brief.audience}`,
    `Цель: ${brief.desiredOutcome}`,
    brief.deadline ? `Дедлайн: ${brief.deadline}` : "",
    `Что должно получиться: ${brief.leadershipAsk}`,
    brief.workingWell ? `Что уже есть: ${brief.workingWell}` : "",
    brief.notWorking ? `Что мешает: ${brief.notWorking}` : "",
    brief.criticalNumbers ? `Ключевые цифры: ${brief.criticalNumbers}` : "",
    brief.risks ? `Риски: ${brief.risks}` : "",
    brief.dependencies ? `Ограничения и зависимости: ${brief.dependencies}` : "",
    `Материалы: ${brief.sourceMaterial}`,
  ]
    .filter(Boolean)
    .join("\n");
}
