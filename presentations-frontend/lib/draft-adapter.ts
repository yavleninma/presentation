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

const GENERATE_SYSTEM = `Ты собираешь рабочую презентацию из уже прояснённой задачи.

Нужно вернуть ровно 6 слайдов и короткий ответ пользователю.

Структура слайдов обязательна:

1. Обложка (railTitle: "Обложка")
   - title: короткое название темы
   - subtitle: для кого или в каком контексте это показываем
   - bullets: 2-3 опорные строки

2. Проблема (railTitle: "Проблема")
   - title: главный узкий участок
   - subtitle: почему это важно сейчас
   - bullets: ровно 3 пункта в формате "ЧИСЛО — смысл"

3. Три шага (railTitle: "Три шага")
   - title: как идём
   - subtitle: что даёт этот ход
   - bullets: ровно 3 пункта в формате "01 ...", "02 ...", "03 ..."

4. Результат (railTitle: "Результат")
   - title: что уже стало лучше
   - subtitle: один главный вывод
   - bullets: 3-4 конкретных пункта

5. Для кого (railTitle: "Для кого")
   - title: кому это нужно
   - subtitle: одна строка про роль или задачу
   - bullets: ровно 3 пункта в формате "Роль — задача"

6. След. шаг (railTitle: "След. шаг")
   - title: какой следующий шаг
   - subtitle: что нужно сделать после этой презентации
   - bullets: 3 конкретных действия

Правила:
- отвечай на русском
- без воды, без плейсхолдеров, без markdown
- верни строго JSON-объект
- id слайдов: slide-1 ... slide-6
- используй те же смысловые опоры, что уже собраны в сессии

Формат:
{
  "slides": [...],
  "assistantMessage": "..."
}`;

const REVISE_SYSTEM = `Ты правишь уже собранный рабочий черновик презентации.

Правила:
- сохрани ровно 6 слайдов
- не меняй id слайдов: slide-1 ... slide-6
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

  return JSON.stringify(
    {
      sourcePrompt: session.workingDraft.sourcePrompt,
      audience: session.workingDraft.audience,
      desiredOutcome: session.workingDraft.desiredOutcome,
      knownFacts: session.workingDraft.knownFacts,
      missingFacts: session.missingFacts,
      summary: session.summary,
      readyToGenerate: session.readyToGenerate,
      ...(includeHistory
        ? { history: filterMessagesForModel(session.messages).slice(-6) }
        : {}),
    },
    null,
    2,
  );
}

function buildGenerateMessages(session: DraftSession): DraftOpenAIMessage[] {
  return [
    { role: "system", content: GENERATE_SYSTEM },
    {
      role: "user",
      content: `Контекст сессии:\n${buildSessionContext(session)}`,
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

async function callOpenAI({
  messages,
  operation,
}: {
  messages: DraftOpenAIMessage[];
  operation: "generate" | "revise";
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new DraftApiError("INTERNAL_ERROR", "OPENAI_API_KEY не настроен.", 500);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

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
        max_completion_tokens: 2000,
      }),
    });

    if (!res.ok) {
      throw new DraftApiError(
        "OPENAI_HTTP_ERROR",
        operation === "generate"
          ? `Модель не собрала черновик (OpenAI ${res.status}).`
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
        operation === "generate" ? "GENERATE_TIMEOUT" : "REVISE_TIMEOUT",
        operation === "generate"
          ? "Модель не успела собрать черновик. Попробуйте ещё раз."
          : "Модель не успела обработать правку. Попробуйте ещё раз.",
        504,
      );
    }

    throw new DraftApiError(
      "OPENAI_HTTP_ERROR",
      operation === "generate"
        ? "Не удалось получить ответ модели для черновика."
        : "Не удалось получить ответ модели для правки черновика.",
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateDraftSession(session: DraftSession) {
  const content = await callOpenAI({
    operation: "generate",
    messages: buildGenerateMessages(session),
  });
  const parsed = parseDraftModelResponse(
    content,
    "Черновик готов. Смотрите слайды — можно уточнять или менять через чат.",
  );

  return withSessionSlides(session, parsed.slides, parsed.assistantMessage);
}

export async function reviseDraftSession(
  session: DraftSession,
  userMessage: string,
) {
  const content = await callOpenAI({
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
