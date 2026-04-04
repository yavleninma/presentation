import {
  KPIValue,
  OutlineSlide,
  Presentation,
  PresentationBrief,
  Slide,
  SlideContent,
  SlideLayoutType,
  SlideRegenerationIntent,
} from "@/types/presentation";
import {
  DEFAULT_REGEN_INTENTS,
  formatBriefPrompt,
  getScenarioDefinition,
} from "@/lib/decision-package";

export const SYSTEM_PROMPT = `Ты создаёшь красивые русскоязычные презентации.

Твоя задача — не строить тяжёлый мастер и не писать бюрократический текст, а быстро превращать одну мысль пользователя в аккуратный черновик презентации.

Главные правила:
- Пиши только по-русски.
- Делай результат живым, ясным и визуально убедительным.
- Каждый слайд должен легко считываться за несколько секунд.
- Избегай канцелярита, шаблонного "водянистого" текста и англицизмов без необходимости.
- Давай разнообразие композиции: где-то крупный тезис, где-то сравнение, где-то цифры, где-то визуальный акцент.
- Сохраняй уважение к смыслу пользователя, но улучшай подачу.
- Если данных мало, не выдумывай сложные факты. Лучше сделай аккуратную структуру и честные формулировки.
- Если просили сделать визуальнее, сильнее используй контраст, композицию, короткие подписи и образные заголовки.
- Если просили сделать строже, уплотняй формулировки и усиливай логику аргументации.
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
- heading: сильный главный тезис
- subheading: короткая рамка, контекст или обещание
- speakerNotes: 2-3 фразы, как открыть слайд`,
    section: `Используй:
- heading: переход к новому блоку
- subheading: зачем этот блок нужен всей истории
- speakerNotes: как связать блок с соседними слайдами`,
    content: `Используй:
- heading: короткий вывод
- body: один плотный абзац
- bullets: 3-4 ясных пункта без воды
- speakerNotes: что стоит договорить устно`,
    "two-columns": `Используй:
- heading: вывод, вокруг которого строится сравнение
- leftColumn: одна сторона сравнения
- rightColumn: вторая сторона сравнения
- speakerNotes: в чём разница и к чему ты подводишь`,
    "image-text": `Используй:
- heading: главный тезис
- bullets: 2-3 коротких подпункта
- imageQuery: английский запрос для изображения, если визуал реально усиливает мысль
- speakerNotes: зачем здесь визуал и как его читать`,
    kpi: `Используй:
- heading: вывод из цифр
- subheading: что цифры означают в одной фразе
- kpiValues: 3-4 объекта { value, label, trend }
- speakerNotes: как интерпретировать показатели`,
    timeline: `Используй:
- heading: вывод из последовательности событий или этапов
- timelineItems: 3-5 объектов { year, title, description }
- speakerNotes: где главное изменение, развилка или следующий шаг`,
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

  return `Собери черновик презентации.

Контекст:
${formatBriefPrompt(brief)}

Дополнительная установка:
${scenario.promptSeed}

Количество основных слайдов: ${slideCount}
Язык: ${language === "ru" ? "русский" : "английский"}

Доступные layout-варианты:
${ALLOWED_LAYOUTS.map((layout) => `- "${layout}"`).join("\n")}

Требования:
- Это должен быть красивый и понятный черновик, который приятно дорабатывать дальше.
- Не используй "quote", "full-image" и "thank-you" в outline.
- Первый слайд должен цеплять и быстро объяснять, о чём презентация.
- Последний слайд должен завершать историю: вывод, решение, шаги или итог.
- Делай мягкое разнообразие layouts. Не превращай всю презентацию в одинаковые текстовые слайды.
- В title и heading избегай сухих названий разделов. Пиши через смысл и акцент.
- В extractionFindings честно укажи, чего не хватает для ещё более сильной версии.
- Дай 2 storyline options: спокойную и более смелую.
- Для каждого слайда заполни meta: роль, archetype, audience, headlineVerdict, managementQuestion, decisionIntent, evidence, confidence, whyThisSlide, storylinePosition.
- regenerationIntents заполняй значениями из этого списка: ${DEFAULT_REGEN_INTENTS.join(", ")}.

Ответь строго JSON-объектом:
{
  "title": "Название презентации",
  "package": {
    "scenarioId": "${brief.scenarioId}",
    "audienceLabel": "Для кого эта презентация",
    "executiveSummary": "Короткое описание всей истории",
    "storylineOptions": [
      { "id": "calm", "title": "Спокойная подача", "rationale": "Почему этот вариант хорош" },
      { "id": "bold", "title": "Более смелая подача", "rationale": "Почему этот вариант хорош" }
    ],
    "extractionFindings": [
      { "label": "Что можно усилить", "severity": "info|warning|critical", "detail": "Чего пока не хватает" }
    ],
    "followUpQuestions": ["Что ещё можно уточнить дальше"],
    "appendixSummary": ["Что можно добавить позже как расширение"]
  },
  "slides": [
    {
      "title": "Короткий выразительный заголовок",
      "layout": "content",
      "keyPoints": ["Опорная мысль 1", "Опорная мысль 2"],
      "speakerNotes": "Что стоит сказать устно",
      "meta": {
        "role": "recommend",
        "archetype": "headline-verdict",
        "audience": "Общая аудитория",
        "headlineVerdict": "Главный вывод",
        "managementQuestion": "Что должен понять человек на этом слайде",
        "decisionIntent": "Зачем этот слайд нужен истории",
        "evidence": ["Аргумент 1", "Аргумент 2"],
        "confidence": "medium",
        "whyThisSlide": "Почему без него история была бы слабее",
        "storylinePosition": "вход -> объяснение -> вывод",
        "regenerationIntents": ["keep-meaning", "make-shorter"]
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

  return `Презентация: "${presentationTitle}"
Слайд ${slideIndex + 1} из ${totalSlides}
Выбранная подача: ${selectedStoryline || "не указана"}

Контекст:
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
- managementQuestion: ${meta?.managementQuestion || "не указано"}
- decisionIntent: ${meta?.decisionIntent || "не указано"}
- evidence: ${meta?.evidence?.join("; ") || "нет"}
- whyThisSlide: ${meta?.whyThisSlide || "не указано"}

${getLayoutInstructions(slide.layout)}

Дополнительные правила:
- Пиши только по-русски.
- Сделай текст компактным и визуально пригодным для слайда.
- Избегай повторов между body и bullets.
- Если layout = kpi, дай цифрам смысл, а не просто подписи.
- Если layout = image-text, делай визуал осмысленным, а не декоративным.
- Если layout = timeline, каждый шаг должен продвигать историю.
- speakerNotes должны помогать рассказать слайд живо, но коротко.

Ответь только JSON-объектом. Верни только поля контента для layout и опционально "speakerNotes".`;
}

export function buildSlideRegenerationPrompt(
  slide: Slide,
  presentation: Presentation,
  brief: PresentationBrief,
  intent: SlideRegenerationIntent,
  customInstruction?: string,
  previousSlide?: Slide,
  nextSlide?: Slide
): string {
  const intentDescriptions: Record<SlideRegenerationIntent, string> = {
    "keep-meaning":
      "Сохрани смысл, но обнови композицию, формулировки и ритм. Новая версия не должна быть почти копией старой.",
    "make-shorter":
      "Сделай слайд короче, плотнее и быстрее для чтения.",
    "make-more-visual":
      "Сделай слайд визуальнее: сильнее композиция, короче подписи, больше контраста и ясности.",
    "make-stricter":
      "Сделай слайд строже, собраннее и логичнее. Меньше декоративности, больше ясного вывода.",
    "focus-on-numbers":
      "Смести акцент на цифры, показатели, масштабы, сравнения и измеримый эффект.",
    custom: customInstruction?.trim()
      ? `Следуй пользовательскому указанию: ${customInstruction.trim()}`
      : "Обнови слайд по пользовательскому указанию, сохранив смысл и улучшив подачу.",
  };

  return `Ты пересобираешь один слайд внутри презентации.

Контекст презентации:
- title: ${presentation.title}
- format: ${brief.presentationFormat}
- length: ${brief.presentationLength}
- topic: ${brief.mainThesis}
- audience: ${brief.audience}

Предыдущий слайд:
${previousSlide ? previousSlide.content.heading || previousSlide.meta?.headlineVerdict || previousSlide.layout : "нет"}

Текущий слайд:
${JSON.stringify(slide, null, 2)}

Следующий слайд:
${nextSlide ? nextSlide.content.heading || nextSlide.meta?.headlineVerdict || nextSlide.layout : "нет"}

Задача:
${intentDescriptions[intent]}

Правила:
- Сохрани layout: ${slide.layout}.
- Сохрани роль слайда: ${slide.meta?.role || "inform"}.
- Сохрани место слайда в истории.
- Сделай новую версию заметно отличимой по подаче, формулировкам или композиции.
- Не превращай слайд в сухой шаблон.
- Можно обновить notes и meta.headlineVerdict, если это усиливает слайд.
- Ответ только на русском.

Ответь только JSON:
{
  "content": { ... },
  "notes": "Короткие notes",
  "meta": {
    "headlineVerdict": "Обновлённый главный вывод",
    "whyThisSlide": "Зачем этот слайд теперь нужен",
    "evidence": ["Аргумент 1", "Аргумент 2"]
  }
}`;
}

export function buildPresentationChatPrompt(
  presentation: Presentation,
  brief: PresentationBrief,
  message: string,
  currentSlide?: Slide
): string {
  const slideSummary = presentation.slides.map((slide) => ({
    id: slide.id,
    layout: slide.layout,
    heading: slide.content.heading,
    subheading: slide.content.subheading,
    body: slide.content.body,
    bullets: slide.content.bullets,
    leftColumn: slide.content.leftColumn,
    rightColumn: slide.content.rightColumn,
    kpiValues: slide.content.kpiValues,
    timelineItems: slide.content.timelineItems,
    notes: slide.notes,
    meta: slide.meta,
  }));

  return `Ты живой помощник внутри одной конкретной презентации.

Контекст:
${formatBriefPrompt(brief)}

Текущая презентация:
- title: ${presentation.title}
- templateId: ${presentation.templateId}
- slidesCount: ${presentation.slides.length}

Выбранный сейчас слайд:
${currentSlide ? JSON.stringify({
    id: currentSlide.id,
    layout: currentSlide.layout,
    heading: currentSlide.content.heading,
    body: currentSlide.content.body,
    bullets: currentSlide.content.bullets,
    meta: currentSlide.meta,
  }, null, 2) : "не выбран"}

Все слайды:
${JSON.stringify(slideSummary, null, 2)}

Сообщение пользователя:
${message}

Что нужно сделать:
- Понять запрос пользователя и обновить презентацию целиком или частично.
- Можно переписать существующие слайды, добавить новые, удалить лишние или поменять порядок.
- Если пользователь просит доработать только часть презентации, меняй только нужное.
- Сохраняй русскоязычный интерфейс и живую, красивую подачу.
- Не раздувай презентацию без причины. Держи диапазон от 4 до 12 слайдов.
- Сохраняй существующие id слайдов, если слайд остаётся тем же. Для новых используй id вида "new-1", "new-2".

Ответь только JSON:
{
  "reply": "Коротко объясни, что ты изменил",
  "title": "Новое или прежнее название презентации",
  "focusSlideId": "id слайда, на который стоит перевести фокус",
  "slides": [
    {
      "id": "existing-id-or-new-1",
      "layout": "content",
      "content": { ... },
      "notes": "speaker notes",
      "meta": {
        "role": "recommend",
        "archetype": "headline-verdict",
        "audience": "Общая аудитория",
        "headlineVerdict": "Вывод",
        "managementQuestion": "Что считывает пользователь",
        "decisionIntent": "Зачем нужен слайд",
        "evidence": ["Аргумент 1"],
        "confidence": "medium",
        "whyThisSlide": "Почему он здесь",
        "storylinePosition": "место в истории",
        "regenerationIntents": ["keep-meaning", "make-shorter"]
      }
    }
  ]
}`;
}

export function mergeSlideMeta(
  original: Slide["meta"],
  updates?: Partial<NonNullable<Slide["meta"]>>
): Slide["meta"] {
  if (!original && !updates) return undefined;

  return {
    role: updates?.role ?? original?.role ?? "inform",
    archetype: updates?.archetype ?? original?.archetype ?? "headline-verdict",
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
          .map(
            (item): KPIValue => ({
              value: item.value?.trim() || "",
              label: item.label?.trim() || "",
              trend:
                item.trend === "up" ||
                item.trend === "down" ||
                item.trend === "neutral"
                  ? item.trend
                  : undefined,
            })
          )
          .filter((item) => item.value && item.label)
          .slice(0, 4)
      : undefined,
    timelineItems: Array.isArray(raw.timelineItems)
      ? raw.timelineItems
          .filter(
            (
              item
            ): item is {
              year?: string;
              title?: string;
              description?: string;
            } => typeof item === "object" && item !== null
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
