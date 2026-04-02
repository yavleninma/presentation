import {
  OutlineSlide,
  Presentation,
  PresentationBrief,
  Slide,
  SlideContent,
  KPIValue,
  SlideLayoutType,
  SlideRegenerationIntent,
} from "@/types/presentation";
import {
  DEFAULT_REGEN_INTENTS,
  formatBriefPrompt,
  getScenarioDefinition,
} from "@/lib/decision-package";

export const SYSTEM_PROMPT = `Ты — AI chief of staff для ИТ-руководителя крупной российской компании.

Твоя задача — не делать "красивые презентации", а собирать управленческие decision packages для CEO, CFO, COO, ExCom, steering committee и инвестиционных комитетов.

Ключевые правила:
- Начинай с управленческого вывода, а не с описания темы.
- Каждый слайд должен делать работу: информировать, объяснять, сравнивать, эскалировать, рекомендовать или подводить к решению.
- Заголовки должны быть verdict-style: не "Статус программы", а "Программа держит результат, но сдвигает критичный milestone".
- Не пиши нейтральный буллет-спам. Каждый пункт либо доказывает, либо объясняет, либо усиливает решение.
- Переводи технический материал в язык бизнеса. Если нужен технический жаргон — убирай его в appendix.
- Показывай риски честно. Не прячь слабые места.
- Для CFO и CEO важны: последствия, деньги, trade-offs, темп, риск, ask.
- Финальный пакет должен помогать принять решение, а не просто "ознакомиться".
`;

const ALLOWED_LAYOUTS: SlideLayoutType[] = [
  "title",
  "section",
  "content",
  "two-columns",
  "image-text",
  "kpi",
  "timeline",
];

function getLayoutInstructions(layout: SlideLayoutType): string {
  const instructions: Record<SlideLayoutType, string> = {
    title: `Используй:
- heading: жёсткий verdict headline
- subheading: короткая рамка встречи или executive summary
- speakerNotes: 2-3 фразы для открытия разговора`,
    section: `Используй:
- heading: verdict перехода к следующему блоку
- subheading: зачем этот блок нужен разговору
- speakerNotes: как связать блок с предыдущим и следующим`,
    content: `Используй:
- heading: verdict headline
- body: 1 короткий абзац с business-meaning
- bullets: 3-4 пункта, каждый — доказательство, риск или рекомендация
- speakerNotes: что нужно проговорить устно, не повторяя текст на слайде`,
    "two-columns": `Используй:
- heading: verdict headline
- leftColumn: вариант A / baseline / проблема / текущий план
- rightColumn: вариант B / recommendation / новый план / целевое состояние
- speakerNotes: в чём trade-off и какой вывод должен сделать руководитель`,
    "image-text": `Используй:
- heading: verdict headline
- bullets: 2-3 тезиса
- imageQuery: английский запрос для stock image только если визуал реально помогает объяснить контекст
- speakerNotes: как визуал поддерживает управленческий тезис`,
    kpi: `Используй:
- heading: verdict headline
- subheading: что означают цифры для бизнеса
- kpiValues: 3-4 объекта { value, label, trend }
- speakerNotes: какие цифры критичны и какой вывод из них следует`,
    timeline: `Используй:
- heading: verdict headline
- timelineItems: 3-5 объектов { year, title, description } для roadmap, incident timeline или rebaseline path
- speakerNotes: где контрольная точка, где срыв, где следующий шаг`,
    quote: "",
    "full-image": "",
    "thank-you": "",
  };

  return instructions[layout];
}

export function buildOutlinePrompt(
  brief: PresentationBrief,
  slideCount: number,
  language: string
): string {
  const scenario = getScenarioDefinition(brief.scenarioId);

  return `Собери decision package для сценария "${scenario.name}".

Контекст:
${formatBriefPrompt(brief)}

Дополнительная установка сценария:
${scenario.promptSeed}

Количество основных слайдов: ${slideCount}
Язык: ${language === "ru" ? "русский" : "английский"}

Доступные visual layouts:
${ALLOWED_LAYOUTS.map((layout) => `- "${layout}"`).join("\n")}

Обязательные требования:
- Это не generic slide deck. Это управленческий пакет для встречи с руководством.
- Не используй layouts "quote", "full-image" и "thank-you".
- Первый слайд должен быстро зафиксировать verdict и stakes.
- Последний основной слайд должен быть decision-oriented: ask, recommendation или next steps.
- Заголовок каждого слайда должен быть утверждением, а не названием темы.
- В пакете должны появиться архетипы, релевантные сценарию: ${scenario.defaultArchetypes.join(", ")}.
- Если в brief есть пробелы или противоречия, вытащи их отдельно в extractionFindings.
- Дай 2-3 storyline options, чтобы пользователь мог выбрать narrative до генерации слайдов.
- Для каждого слайда заполни meta: роль, архетип, аудитория, headlineVerdict, managementQuestion, decisionIntent, evidence, confidence, whyThisSlide, storylinePosition.
- regenerationIntents заполняй списком из этих значений: ${DEFAULT_REGEN_INTENTS.join(", ")}.

Ответь СТРОГО JSON-объектом:
{
  "title": "Название пакета",
  "package": {
    "scenarioId": "${brief.scenarioId}",
    "audienceLabel": "Короткая формулировка аудитории",
    "executiveSummary": "1 короткий абзац executive summary",
    "storylineOptions": [
      { "id": "option-a", "title": "Название storyline", "rationale": "Почему этот narrative сильный" }
    ],
    "extractionFindings": [
      { "label": "Короткий ярлык", "severity": "info|warning|critical", "detail": "Что здесь не хватает или конфликтует" }
    ],
    "followUpQuestions": ["Вопрос 1", "Вопрос 2"],
    "appendixSummary": ["Что стоит вынести в appendix"]
  },
  "slides": [
    {
      "title": "Verdict headline",
      "layout": "content",
      "keyPoints": ["Тезис 1", "Тезис 2", "Тезис 3"],
      "speakerNotes": "Что проговорить устно",
      "meta": {
        "role": "recommend",
        "archetype": "decision-slide",
        "audience": "CFO",
        "headlineVerdict": "Жёсткий headline",
        "managementQuestion": "Какой вопрос этот слайд закрывает",
        "decisionIntent": "Какое решение он двигает",
        "evidence": ["Доказательство 1", "Доказательство 2"],
        "confidence": "medium",
        "whyThisSlide": "Зачем этот слайд в истории",
        "storylinePosition": "контекст -> статус -> риск -> решение",
        "regenerationIntents": ["strengthen-verdict", "rewrite-for-cfo"]
      }
    }
  ]
}`;
}

export function buildSlideContentPrompt(
  slide: OutlineSlide,
  brief: PresentationBrief,
  presentationTitle: string,
  slideIndex: number,
  totalSlides: number,
  selectedStoryline?: string
): string {
  const meta = slide.meta;

  return `Пакет: "${presentationTitle}"
Сценарий: ${getScenarioDefinition(brief.scenarioId).name}
Слайд ${slideIndex + 1} из ${totalSlides}
Выбранный storyline: ${selectedStoryline || "не указан"}

Контекст brief:
${formatBriefPrompt(brief)}

Заготовка слайда:
- title: ${slide.title}
- layout: ${slide.layout}
- keyPoints: ${slide.keyPoints?.join("; ") || "нет"}
- speakerNotes: ${slide.speakerNotes || "нет"}
- role: ${meta?.role || "inform"}
- archetype: ${meta?.archetype || "headline-verdict"}
- audience: ${meta?.audience || brief.audience}
- headlineVerdict: ${meta?.headlineVerdict || slide.title}
- managementQuestion: ${meta?.managementQuestion || "Не указан"}
- decisionIntent: ${meta?.decisionIntent || "Не указан"}
- evidence: ${meta?.evidence?.join("; ") || "нет"}
- whyThisSlide: ${meta?.whyThisSlide || "Не указан"}

${getLayoutInstructions(slide.layout)}

Дополнительные правила:
- heading должен совпадать по смыслу с headlineVerdict и быть жёстким.
- body и bullets должны говорить на языке бизнеса и управления.
- Не делай нейтральных пунктов вида "повысить эффективность" без доказательств.
- Если layout = kpi, под цифрами обязательно должна читаться управленческая интерпретация.
- Если layout = timeline, используй это как incident timeline, roadmap или rebaseline path, а не как декоративную историю.
- speakerNotes должны помогать защищать позицию на встрече.

Ответь только JSON-объектом. Верни только поля контента для layout и опционально "speakerNotes".`;
}

export function buildSlideRegenerationPrompt(
  slide: Slide,
  presentation: Presentation,
  brief: PresentationBrief,
  intent: SlideRegenerationIntent,
  previousSlide?: Slide,
  nextSlide?: Slide
): string {
  const intentDescriptions: Record<SlideRegenerationIntent, string> = {
    tighten: "Сделай формулировки жёстче и собраннее без потери смысла.",
    "shorten-for-execs":
      "Сократи слайд для CEO/CFO: меньше текста, быстрее считываемый вывод.",
    "rewrite-for-cfo":
      "Перепиши под CFO: деньги, trade-offs, downside, управленческие последствия.",
    "remove-jargon":
      "Убери технарский жаргон и оставь бизнес-понятные формулировки.",
    "add-business-impact":
      "Добавь бизнес-эффект: деньги, риск, скорость, SLA, репутация, последствия.",
    "make-risk-clearer":
      "Сделай риск явнее: в чём impact, вероятность, цена бездействия, кто владелец.",
    "strengthen-evidence":
      "Усиль доказательность: убери общие слова, добавь конкретные аргументы и логику.",
    "offer-structure-alternatives":
      "Сделай контент альтернативным и более сильным по структуре, но сохрани тот же layout.",
    "turn-into-decision-slide":
      "Сделай слайд decision-oriented: чёткий ask, recommendation и consequence of no-decision.",
    "strengthen-verdict":
      "Сделай headline более жёстким, однозначным и управленчески сильным.",
  };

  return `Ты обновляешь один слайд внутри decision package, не ломая соседние выводы.

Контекст пакета:
- title: ${presentation.title}
- scenario: ${getScenarioDefinition(brief.scenarioId).name}
- audience: ${brief.audience}
- main thesis: ${brief.mainThesis}
- leadership ask: ${brief.leadershipAsk}

Предыдущий слайд:
${previousSlide ? `${previousSlide.content.heading || previousSlide.meta?.headlineVerdict || previousSlide.layout}` : "нет"}

Текущий слайд:
${JSON.stringify(slide, null, 2)}

Следующий слайд:
${nextSlide ? `${nextSlide.content.heading || nextSlide.meta?.headlineVerdict || nextSlide.layout}` : "нет"}

Намерение перегенерации:
${intentDescriptions[intent]}

Правила:
- Сохрани layout: ${slide.layout}.
- Сохрани роль слайда: ${slide.meta?.role || "inform"}.
- Сохрани место слайда в storyline.
- Обнови heading/body/bullets/kpiValues/timelineItems только в пределах нужного намерения.
- Если нужно, уточни notes и meta.headlineVerdict, но не меняй archetype без крайней необходимости.
- Не превращай слайд в generic bullets.

Ответь только JSON:
{
  "content": { ... },
  "notes": "speaker notes",
  "meta": {
    "headlineVerdict": "обновлённый verdict",
    "whyThisSlide": "обновлённое объяснение при необходимости",
    "evidence": ["..."]
  }
}`;
}

export function mergeSlideMeta(
  original: Slide["meta"],
  updates?: Partial<NonNullable<Slide["meta"]>>
): Slide["meta"] {
  if (!original && !updates) return undefined;

  return {
    role: original?.role ?? "inform",
    archetype: original?.archetype ?? "headline-verdict",
    audience: updates?.audience ?? original?.audience ?? "",
    headlineVerdict:
      updates?.headlineVerdict ?? original?.headlineVerdict ?? "",
    managementQuestion:
      updates?.managementQuestion ?? original?.managementQuestion ?? "",
    decisionIntent: updates?.decisionIntent ?? original?.decisionIntent ?? "",
    evidence: updates?.evidence ?? original?.evidence ?? [],
    confidence: updates?.confidence ?? original?.confidence ?? "medium",
    whyThisSlide: updates?.whyThisSlide ?? original?.whyThisSlide ?? "",
    storylinePosition:
      updates?.storylinePosition ?? original?.storylinePosition ?? "",
    regenerationIntents:
      updates?.regenerationIntents ??
      original?.regenerationIntents ??
      DEFAULT_REGEN_INTENTS,
  };
}

export function normalizeGeneratedContent(
  layout: SlideLayoutType,
  raw: Record<string, unknown>,
  fallbackHeading: string
): SlideContent & { speakerNotes?: string } {
  const speakerNotes =
    typeof raw.speakerNotes === "string" ? raw.speakerNotes.trim() : undefined;

  const content: SlideContent = {
    heading:
      typeof raw.heading === "string" && raw.heading.trim()
        ? raw.heading.trim()
        : fallbackHeading,
    subheading:
      typeof raw.subheading === "string" ? raw.subheading.trim() : undefined,
    body: typeof raw.body === "string" ? raw.body.trim() : undefined,
    bullets: Array.isArray(raw.bullets)
      ? raw.bullets
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 4)
      : undefined,
    imageQuery:
      typeof raw.imageQuery === "string" ? raw.imageQuery.trim() : undefined,
    quoteText:
      typeof raw.quoteText === "string" ? raw.quoteText.trim() : undefined,
    quoteAuthor:
      typeof raw.quoteAuthor === "string" ? raw.quoteAuthor.trim() : undefined,
    quoteRole:
      typeof raw.quoteRole === "string" ? raw.quoteRole.trim() : undefined,
    contactEmail:
      typeof raw.contactEmail === "string"
        ? raw.contactEmail.trim()
        : undefined,
    contactPhone:
      typeof raw.contactPhone === "string"
        ? raw.contactPhone.trim()
        : undefined,
    contactWebsite:
      typeof raw.contactWebsite === "string"
        ? raw.contactWebsite.trim()
        : undefined,
    leftColumn:
      raw.leftColumn && typeof raw.leftColumn === "object"
        ? {
            heading:
              typeof (raw.leftColumn as { heading?: unknown }).heading ===
              "string"
                ? (raw.leftColumn as { heading: string }).heading.trim()
                : undefined,
            bullets: Array.isArray(
              (raw.leftColumn as { bullets?: unknown[] }).bullets
            )
              ? (
                  (raw.leftColumn as { bullets: unknown[] }).bullets as unknown[]
                )
                  .filter((item): item is string => typeof item === "string")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 4)
              : undefined,
          }
        : undefined,
    rightColumn:
      raw.rightColumn && typeof raw.rightColumn === "object"
        ? {
            heading:
              typeof (raw.rightColumn as { heading?: unknown }).heading ===
              "string"
                ? (raw.rightColumn as { heading: string }).heading.trim()
                : undefined,
            bullets: Array.isArray(
              (raw.rightColumn as { bullets?: unknown[] }).bullets
            )
              ? (
                  (raw.rightColumn as { bullets: unknown[] }).bullets as unknown[]
                )
                  .filter((item): item is string => typeof item === "string")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 4)
              : undefined,
          }
        : undefined,
    kpiValues: Array.isArray(raw.kpiValues)
      ? raw.kpiValues
        .filter(
          (item): item is { value?: string; label?: string; trend?: string } =>
            typeof item === "object" && item !== null
        )
        .map((item): KPIValue => ({
          value: item.value?.trim() || "",
          label: item.label?.trim() || "",
          trend:
              item.trend === "up" || item.trend === "down" || item.trend === "neutral"
                ? item.trend
                : undefined,
          }))
          .filter((item) => item.value && item.label)
          .slice(0, 4)
      : undefined,
    timelineItems: Array.isArray(raw.timelineItems)
      ? raw.timelineItems
          .filter(
            (item): item is { year?: string; title?: string; description?: string } =>
              typeof item === "object" && item !== null
          )
          .map((item) => ({
            year: item.year?.trim() || "",
            title: item.title?.trim() || "",
            description: item.description?.trim() || undefined,
          }))
          .filter((item) => item.year && item.title)
          .slice(0, layout === "timeline" ? 5 : 4)
      : undefined,
  };

  return { ...content, speakerNotes };
}
