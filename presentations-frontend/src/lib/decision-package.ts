import {
  MeetingScenarioId,
  PresentationBrief,
  SlideArchetype,
  ManagementSlideRole,
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
  "strengthen-verdict",
  "shorten-for-execs",
  "rewrite-for-cfo",
  "add-business-impact",
  "make-risk-clearer",
  "remove-jargon",
  "strengthen-evidence",
  "turn-into-decision-slide",
];

export const slideRoleLabels: Record<ManagementSlideRole, string> = {
  inform: "Информирует",
  explain: "Объясняет",
  compare: "Сравнивает",
  justify: "Обосновывает",
  escalate: "Эскалирует",
  recommend: "Рекомендует",
  decide: "Подводит к решению",
  close: "Закрывает разговор",
};

export const archetypeLabels: Record<SlideArchetype, string> = {
  "headline-verdict": "Headline + Verdict",
  "kpi-dashboard-commentary": "KPI Dashboard + Commentary",
  "progress-vs-plan": "Progress vs Plan",
  "risk-heatmap": "Risk Heatmap",
  "options-matrix": "Options Matrix",
  "budget-waterfall": "Budget Waterfall",
  "roadmap-milestones": "Roadmap / Milestones",
  "incident-timeline": "Incident Timeline",
  "dependency-map": "Dependency Map",
  "decision-slide": "Decision Slide",
  "executive-summary": "Executive Summary",
  "appendix-detail": "Appendix Detail",
};

export const regenerationIntentLabels: Record<
  SlideRegenerationIntent,
  string
> = {
  tighten: "Сделать жёстче",
  "shorten-for-execs": "Сократить для топов",
  "rewrite-for-cfo": "Переписать под CFO",
  "remove-jargon": "Убрать технарский жаргон",
  "add-business-impact": "Добавить бизнес-эффект",
  "make-risk-clearer": "Сделать риск явнее",
  "strengthen-evidence": "Усилить доказательность",
  "offer-structure-alternatives": "Предложить 2 структуры",
  "turn-into-decision-slide": "Превратить в decision slide",
  "strengthen-verdict": "Сделать сильнее вывод",
};

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    id: "steering-committee",
    name: "Steering Committee",
    shortName: "Steering",
    description:
      "Ежемесячный пакет по программе: статус, отклонения, риски, зависимости и решения для спонсора.",
    audienceHint: "CIO, бизнес-спонсор, PMO, руководители потоков",
    desiredOutcomeHint:
      "Подтвердить текущий план, снять блокировки и получить решения по красным зонам.",
    thesisHint:
      "Программа держит курс по ключевому результату, но требует решения по двум критичным блокерам.",
    askHint:
      "Утвердить перенос одного milestone, назначить владельца по зависимости и подтвердить ресурс на remediation.",
    sourceHint:
      "Вставьте статусы потоков, KPI, блокеры, решения прошлой встречи и комментарии PMO.",
    promptSeed:
      "Строй материал как steering-committee pack: коротко, жёстко, с выводом и ask на каждом критичном блоке.",
    defaultSlideCount: 7,
    defaultArchetypes: [
      "headline-verdict",
      "progress-vs-plan",
      "kpi-dashboard-commentary",
      "risk-heatmap",
      "dependency-map",
      "decision-slide",
      "appendix-detail",
    ],
  },
  {
    id: "quarterly-it-review",
    name: "Quarterly IT Review",
    shortName: "Quarterly",
    description:
      "Квартальный пакет для CEO/ExCom: результаты, провалы, основные инициативы и следующий квартал.",
    audienceHint: "CEO, COO, CFO, ExCom",
    desiredOutcomeHint:
      "Дать короткий executive view по ИТ-функции и согласовать приоритеты следующего квартала.",
    thesisHint:
      "ИТ выполнило критичные обязательства квартала, но два направления требуют управленческого вмешательства.",
    askHint:
      "Подтвердить приоритет на следующий квартал и согласовать действия по двум зонам риска.",
    sourceHint:
      "Вставьте KPI, major initiatives, квартальные статусы, ключевые риски и lessons learned.",
    promptSeed:
      "Строй материал как quarterly review для топ-менеджмента: цифры, выводы, отклонения и следующая управленческая ставка.",
    defaultSlideCount: 8,
    defaultArchetypes: [
      "executive-summary",
      "kpi-dashboard-commentary",
      "progress-vs-plan",
      "roadmap-milestones",
      "risk-heatmap",
      "dependency-map",
      "decision-slide",
      "appendix-detail",
    ],
  },
  {
    id: "budget-defense",
    name: "Budget Defense",
    shortName: "Budget",
    description:
      "Пакет для защиты бюджета: зачем нужны деньги, какие есть варианты и какой эффект даёт решение.",
    audienceHint: "CFO, инвестиционный комитет, CEO",
    desiredOutcomeHint:
      "Получить одобрение бюджета или нового этапа программы с ясным business case.",
    thesisHint:
      "Без дополнительного финансирования программа теряет целевой эффект, а предложенный вариант окупается за разумный срок.",
    askHint:
      "Одобрить CAPEX/OPEX, выбрать preferred option и зафиксировать expected ROI.",
    sourceHint:
      "Вставьте смету, сценарии, эффект, ограничения, риски, зависимости и прошлые финансовые допущения.",
    promptSeed:
      "Строй материал как budget-defense deck: жёсткий ask, waterfall, trade-offs, downside и рекомендация.",
    defaultSlideCount: 7,
    defaultArchetypes: [
      "headline-verdict",
      "options-matrix",
      "budget-waterfall",
      "kpi-dashboard-commentary",
      "risk-heatmap",
      "decision-slide",
      "appendix-detail",
    ],
  },
  {
    id: "incident-risk-update",
    name: "Incident / Risk Update",
    shortName: "Incident",
    description:
      "Честный пакет для эскалации инцидента или риска: таймлайн, impact, mitigation и следующий ask.",
    audienceHint: "CIO, COO, risk committee, sponsor",
    desiredOutcomeHint:
      "Быстро восстановить контроль над нарративом и согласовать remediation plan.",
    thesisHint:
      "Инцидент локализован, но остаётся один системный риск, который требует решения руководства.",
    askHint:
      "Утвердить remediation plan, владельцев и меры по снижению повторения.",
    sourceHint:
      "Вставьте таймлайн, impact, root cause, статус mitigation, владельцев и открытые риски.",
    promptSeed:
      "Строй материал как incident update: без оправданий, с прозрачным impact и управленческим планом восстановления.",
    defaultSlideCount: 6,
    defaultArchetypes: [
      "headline-verdict",
      "incident-timeline",
      "risk-heatmap",
      "progress-vs-plan",
      "decision-slide",
      "appendix-detail",
    ],
  },
  {
    id: "vendor-decision",
    name: "Architecture / Vendor Decision",
    shortName: "Vendor",
    description:
      "Decision memo по платформе, вендору или migration path с критериями и рекомендацией.",
    audienceHint: "CIO, архитектурный комитет, закупки, инвесткомитет",
    desiredOutcomeHint:
      "Структурировать выбор и получить решение по preferred option.",
    thesisHint:
      "Опция B даёт лучший баланс скорости, риска и total cost, несмотря на более сложный переход.",
    askHint:
      "Утвердить preferred option и зафиксировать boundary conditions для контракта/архитектуры.",
    sourceHint:
      "Вставьте критерии, альтернативы, стоимости, риски, ограничения и требования к миграции.",
    promptSeed:
      "Строй материал как decision memo: чёткие критерии, honest trade-offs и recommendation, которую можно утвердить.",
    defaultSlideCount: 7,
    defaultArchetypes: [
      "headline-verdict",
      "options-matrix",
      "dependency-map",
      "risk-heatmap",
      "roadmap-milestones",
      "decision-slide",
      "appendix-detail",
    ],
  },
  {
    id: "program-recovery",
    name: "Program Recovery / Rebaseline",
    shortName: "Recovery",
    description:
      "Пакет на пересборку программы: gap vs baseline, причины, сценарии восстановления и rebaseline ask.",
    audienceHint: "Steering committee, sponsor, CFO",
    desiredOutcomeHint:
      "Честно показать масштаб проблемы и получить решение по новому базовому плану.",
    thesisHint:
      "Программа не укладывается в исходный baseline и требует controlled reset, чтобы сохранить целевой эффект.",
    askHint:
      "Одобрить новый baseline, снять лишний scope и закрепить критичные зависимости.",
    sourceHint:
      "Вставьте baseline, actual, причины отклонений, сценарии восстановления, ресурсы и trade-offs.",
    promptSeed:
      "Строй материал как recovery pack: без защитного тона, с gap analysis, вариантами и жёстким ask на rebaseline.",
    defaultSlideCount: 8,
    defaultArchetypes: [
      "headline-verdict",
      "progress-vs-plan",
      "risk-heatmap",
      "dependency-map",
      "options-matrix",
      "roadmap-milestones",
      "decision-slide",
      "appendix-detail",
    ],
  },
  {
    id: "update-previous-package",
    name: "Update Previous Package",
    shortName: "Update",
    description:
      "Режим обновления прошлого пакета: что изменилось, что ухудшилось и какие решения нужно пересмотреть.",
    audienceHint: "Та же аудитория, что и в предыдущем пакете",
    desiredOutcomeHint:
      "Сохранить знакомую структуру, но быстро показать изменения и новые решения.",
    thesisHint:
      "С прошлого пакета ключевая картина не изменилась, но появились две новые зоны, требующие обновлённого решения.",
    askHint:
      "Подтвердить, что остаётся в силе, и пересмотреть два решения на основании новых фактов.",
    sourceHint:
      "Вставьте фрагменты прошлого пакета, новые данные, изменения по KPI, рискам и зависимостям.",
    promptSeed:
      "Строй материал как update mode: опирайся на прошлый narrative, но явно маркируй, что изменилось, ухудшилось и требует пересмотра.",
    defaultSlideCount: 6,
    defaultArchetypes: [
      "executive-summary",
      "progress-vs-plan",
      "kpi-dashboard-commentary",
      "risk-heatmap",
      "decision-slide",
      "appendix-detail",
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
  scenarioId: MeetingScenarioId = "steering-committee"
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
  };
}

export function formatBriefPrompt(brief: PresentationBrief): string {
  return [
    `Сценарий: ${getScenarioDefinition(brief.scenarioId).name}`,
    `Встреча: ${brief.meetingName}`,
    `Аудитория: ${brief.audience}`,
    `Желаемый результат: ${brief.desiredOutcome}`,
    brief.deadline ? `Дедлайн: ${brief.deadline}` : "",
    `Главный тезис: ${brief.mainThesis}`,
    `Что должно сделать руководство: ${brief.leadershipAsk}`,
    `Что идёт хорошо: ${brief.workingWell}`,
    `Что идёт плохо: ${brief.notWorking}`,
    `Критичные цифры: ${brief.criticalNumbers}`,
    `Риски: ${brief.risks}`,
    `Зависимости: ${brief.dependencies}`,
    `Исходный материал: ${brief.sourceMaterial}`,
  ]
    .filter(Boolean)
    .join("\n");
}
