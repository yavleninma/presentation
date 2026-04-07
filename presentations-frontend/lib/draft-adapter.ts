import {
  buildSlidesContext,
  DRAFT_API_MODEL,
  DraftApiError,
  parseDraftModelResponse,
  type DraftOpenAIMessage,
} from "@/lib/draft-api";
import { withSessionRevision, withSessionSlides } from "@/lib/draft-session";
import type { DraftChatMessage, DraftSession } from "@/lib/presentation-types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TIMEOUT_MS = 30_000;

const PLAN_SYSTEM = `Ты планируешь структуру рабочей презентации.

На основе материала определи:
1. Оптимальное количество слайдов (от 6 до 20)
2. Тип каждого слайда и его ключевую мысль

Если задано предпочтение по длине (slideCountPreference):
- "short" → 6–8 слайдов
- "medium" → 10–14 слайдов
- "long" → 15–20 слайдов

Доступные типы слайдов:
- cover: обложка
- section-divider: разделитель раздела
- metrics: ключевые числа (2-3 метрики)
- stat-focus: одно крупное число
- steps: шаги процесса (2-4 шага)
- checklist: список фактов (3-5 пунктов)
- comparison: сравнение двух вариантов
- personas: для кого / роли
- features: возможности / действия
- text-block: развёрнутый параграф
- cards-row: 3-5 карточек в ряд
- list-slide: нумерованный список
- timeline: хронология / roadmap
- chart-bar: столбчатая диаграмма
- chart-progress: прогресс-бары
- table-simple: таблица с данными
- image-text: картинка + текст
- quote: цитата / ключевое утверждение
- closing: завершение

Правила:
- Первый слайд всегда cover
- Последний слайд всегда closing
- Без воды и повторений

Верни строго JSON без markdown-обёртки:
{
  "totalSlides": число,
  "plan": [
    { "slideNum": 1, "type": "cover", "keyMessage": "..." },
    { "slideNum": 2, "type": "metrics", "keyMessage": "..." }
  ]
}`;

const GENERATE_SYSTEM = `Ты наполняешь слайды рабочей презентации по готовому плану.

Стиль текста:
- Деловой русский без канцелярита
- Короткие предложения (не длиннее 15 слов)
- Конкретные числа вместо «значительно выросло»
- Глаголы действия вместо отглагольных существительных (плохо: «осуществление внедрения», хорошо: «внедрили»)
- Один тезис — один слайд
- Заголовки — это выводы, не темы (плохо: «Показатели за Q1», хорошо: «Выручка выросла на 23% за Q1»)

Пример хорошего слайда типа "metrics":
{
  "id": "slide-3",
  "layoutType": "metrics",
  "railTitle": "Ключевые метрики",
  "title": "Три показателя, которые изменили картину",
  "subtitle": "Данные за Q1 2026",
  "bullets": [
    "89% — точность классификации обращений (было 64%)",
    "3.2 сек — среднее время ответа бота (было 12 сек)",
    "41% — доля обращений, закрытых без оператора"
  ]
}

Пример хорошего слайда типа "steps":
{
  "id": "slide-4",
  "layoutType": "steps",
  "railTitle": "Три шага",
  "title": "Как запустить за три недели",
  "subtitle": "",
  "bullets": [
    "01 Собрать данные из CRM — 3 дня",
    "02 Настроить модель классификации — 5 дней",
    "03 Провести пилот с командой поддержки — 7 дней"
  ]
}

Пример хорошего слайда типа "checklist":
{
  "id": "slide-5",
  "layoutType": "checklist",
  "railTitle": "Что сделано",
  "title": "За квартал выполнили пять ключевых задач",
  "subtitle": "",
  "bullets": [
    "Перевели 3 процесса на автоматизацию",
    "Сократили время обработки заявки с 4 ч до 40 мин",
    "Обучили 12 сотрудников работе с системой",
    "Интегрировали с корпоративным порталом",
    "Закрыли все критичные замечания из ревью"
  ]
}

Структура обязательна:
- Первый слайд — обложка (layoutType: "cover")
- Последний слайд — завершение (layoutType: "closing")

Для каждого слайда из плана верни:
- id: "slide-1", "slide-2", ... (по порядку)
- layoutType: тип из плана
- railTitle: короткая подпись (2-3 слова)
- title: заголовок-вывод слайда
- subtitle: подзаголовок (опционально)
- bullets: массив строк (содержимое по правилам типа)
- imageQuery: (только для "cover" и "image-text") поисковый запрос на английском

Правила bullets по типам:
- metrics: "ЧИСЛО — описание (контекст)"
- steps: "01 Действие — уточнение"
- timeline: "Период — что произошло"
- chart-bar: "Значение — Название"
- chart-progress: "XX% — Метрика"
- table-simple: первая строка — заголовки через |, далее строки через |

Без плейсхолдеров вроде "[нужна цифра]". Верни строго JSON без markdown-обёртки:
{
  "slides": [...],
  "assistantMessage": "..."
}`;

const REVISE_SYSTEM = `Ты правишь уже собранный рабочий черновик презентации.

Правила:
- сохрани текущее количество слайдов (можно добавить или убрать по запросу пользователя)
- не меняй id слайдов без необходимости
- если просят усилить смысл, меняй именно тексты слайдов, а не объясняй отдельно
- assistantMessage должен коротко сказать, что изменено
- отвечай строго JSON-объектом без markdown

Формат:
{
  "slides": [...],
  "assistantMessage": "..."
}`;

function isTechnicalAssistantMessage(text: string) {
  const normalized = text.trim();

  return (
    /^Не удалось (начать|уточнить|собрать|обработать)/i.test(normalized) ||
    /^Временная ошибка/i.test(normalized) ||
    /^OPENAI_API_KEY/i.test(normalized) ||
    /\(HTTP \d+\)\.?$/i.test(normalized) ||
    /\(OpenAI \d+\)\.?$/i.test(normalized)
  );
}

export function filterMessagesForModel(messages: DraftChatMessage[]) {
  return messages.filter((message) => {
    const text = message.text.trim();
    if (!text) {
      return false;
    }

    if (message.kind === "error") {
      return false;
    }

    if (message.role !== "assistant") {
      return true;
    }

    return !isTechnicalAssistantMessage(text);
  });
}

function buildSessionContext(
  session: DraftSession,
  options: { includeHistory?: boolean } = {},
) {
  const { includeHistory = true } = options;

  const knownFacts = [...(session.workingDraft.knownFacts ?? [])];
  if (session.clarifyAnswers?.data) {
    knownFacts.push(session.clarifyAnswers.data);
  }

  return JSON.stringify(
    {
      sourcePrompt: session.workingDraft.sourcePrompt,
      audience: session.clarifyAnswers?.audience ?? session.workingDraft.audience,
      desiredOutcome: session.clarifyAnswers?.outcome ?? session.workingDraft.desiredOutcome,
      style: session.clarifyAnswers?.style,
      slideCountPreference: session.clarifyAnswers?.length,
      knownFacts,
      missingFacts: session.missingFacts,
      summary: session.summary,
      readyToGenerate: session.readyToGenerate,
      ...(session.uploadedContent
        ? {
            uploadedFileName: session.uploadedFileName,
            uploadedContent: session.uploadedContent.slice(0, 8000),
          }
        : {}),
      ...(includeHistory
        ? { history: filterMessagesForModel(session.messages).slice(-6) }
        : {}),
    },
    null,
    2,
  );
}

function buildPlanMessages(session: DraftSession): DraftOpenAIMessage[] {
  return [
    { role: "system", content: PLAN_SYSTEM },
    {
      role: "user",
      content: `Контекст сессии:\n${buildSessionContext(session, { includeHistory: false })}`,
    },
  ];
}

function buildGenerateMessages(
  session: DraftSession,
  plan: string,
): DraftOpenAIMessage[] {
  return [
    { role: "system", content: GENERATE_SYSTEM },
    {
      role: "user",
      content: `Готовый план:\n${plan}\n\nКонтекст сессии:\n${buildSessionContext(session)}`,
    },
  ];
}

function buildReviseMessages(
  session: DraftSession,
  userMessage: string,
): DraftOpenAIMessage[] {
  const cleanUserMessage = userMessage.trim();
  if (!cleanUserMessage) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нужно сообщение для правки черновика.",
      400,
    );
  }

  const history = filterMessagesForModel(session.messages)
    .map((message) => ({
      role: message.role,
      text: message.text.trim(),
    }))
    .filter((message) => message.text.length > 0);
  const dedupedHistory =
    history.at(-1)?.role === "user" && history.at(-1)?.text === cleanUserMessage
      ? history.slice(0, -1)
      : history;

  return [
    { role: "system", content: REVISE_SYSTEM },
    {
      role: "user",
      content: `Контекст сессии:\n${buildSessionContext(session, { includeHistory: false })}`,
    },
    {
      role: "user",
      content: `Текущие слайды:\n${buildSlidesContext(session.slideTexts)}`,
    },
    ...dedupedHistory.slice(-6).map(
      (message): DraftOpenAIMessage => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.text,
      }),
    ),
    { role: "user", content: cleanUserMessage },
  ];
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function callOpenAI({
  messages,
  operation,
  maxTokens,
}: {
  messages: DraftOpenAIMessage[];
  operation: "plan" | "generate" | "revise";
  maxTokens?: number;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new DraftApiError("INTERNAL_ERROR", "OPENAI_API_KEY не настроен.", 500);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const tokenLimits: Record<typeof operation, number> = {
    plan: 1500,
    generate: 6000,
    revise: 4000,
  };

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DRAFT_API_MODEL,
        messages,
        temperature: 0.7,
        max_completion_tokens: maxTokens ?? tokenLimits[operation],
      }),
    });

    if (!res.ok) {
      throw new DraftApiError(
        "OPENAI_HTTP_ERROR",
        operation === "generate"
          ? `Модель не собрала черновик (OpenAI ${res.status}).`
          : operation === "plan"
            ? `Модель не составила план (OpenAI ${res.status}).`
            : `Модель не обработала правку черновика (OpenAI ${res.status}).`,
        502,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new DraftApiError(
        "OPENAI_EMPTY_RESPONSE",
        operation === "generate"
          ? "Модель не вернула черновик презентации."
          : operation === "plan"
            ? "Модель не вернула план."
            : "Модель не вернула ответ для правки черновика.",
        502,
      );
    }

    return content;
  } catch (error) {
    if (error instanceof DraftApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new DraftApiError(
        operation === "generate"
          ? "GENERATE_TIMEOUT"
          : operation === "plan"
            ? "GENERATE_TIMEOUT"
            : "REVISE_TIMEOUT",
        operation === "generate" || operation === "plan"
          ? "Модель не успела собрать черновик. Попробуйте ещё раз."
          : "Модель не успела обработать правку. Попробуйте ещё раз.",
        504,
      );
    }

    throw new DraftApiError(
      "OPENAI_HTTP_ERROR",
      operation === "generate" || operation === "plan"
        ? "Не удалось получить ответ модели для черновика."
        : "Не удалось получить ответ модели для правки черновика.",
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function parsePlanResponse(content: string): string {
  // Извлекаем JSON из ответа (модель может добавить markdown-обёртку)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return content; // вернём как есть — используется в generate-промпте как строка
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

async function callOpenAIWithRetry(
  params: Parameters<typeof callOpenAI>[0],
  maxRetries = 2,
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callOpenAI(params);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      if (
        err instanceof DraftApiError &&
        [502, 504].includes(err.status)
      ) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  // unreachable, but TypeScript needs this
  throw new DraftApiError("INTERNAL_ERROR", "Unexpected retry exit.", 500);
}

export async function generateDraftSession(session: DraftSession) {
  // Шаг 1: планирование
  const planContent = await callOpenAIWithRetry({
    operation: "plan",
    messages: buildPlanMessages(session),
  });
  const plan = parsePlanResponse(planContent);

  // Шаг 2: наполнение по плану
  const generateContent = await callOpenAIWithRetry({
    operation: "generate",
    messages: buildGenerateMessages(session, plan),
  });
  const parsed = parseDraftModelResponse(
    generateContent,
    "Черновик готов. Смотрите слайды — можно уточнять или менять через чат.",
  );

  return withSessionSlides(session, parsed.slides, parsed.assistantMessage);
}

export async function reviseDraftSession(
  session: DraftSession,
  userMessage: string,
) {
  const content = await callOpenAIWithRetry({
    operation: "revise",
    messages: buildReviseMessages(session, userMessage),
  });
  const parsed = parseDraftModelResponse(content, "Обновил черновик.");

  return withSessionRevision(
    session,
    userMessage,
    parsed.slides,
    parsed.assistantMessage,
  );
}
