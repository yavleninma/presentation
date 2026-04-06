import { NextRequest, NextResponse } from "next/server";
import type { DraftChatMessage, SlideTextEntry } from "@/lib/presentation-types";
import {
  buildChatMessages,
  DRAFT_API_MODEL,
  DraftApiError,
  type DraftOpenAIMessage,
  parseDraftModelResponse,
  validateSlides,
} from "@/lib/draft-api";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TIMEOUT_MS = 30_000;

const GENERATE_SYSTEM = `Ты эксперт по деловым презентациям. Твоя задача — сгенерировать содержимое для 6 слайдов по строго заданной структуре.

Структура и формат КАЖДОГО слайда обязательны:

1. Обложка (railTitle: "Обложка")
   — title: название темы или сервиса, до 7 слов
   — subtitle: одна строка — для кого или контекст
   — bullets: 2–3 meta-строки

2. Проблема (railTitle: "Проблема")
   — title: заголовок про проблему, до 6 слов
   — subtitle: суть проблемы одной строкой
   — bullets: РОВНО 3 пункта в формате "ЧИСЛО — описание"

3. Три шага (railTitle: "Три шага")
   — title: заголовок про процесс, до 6 слов
   — subtitle: одна строка — обещание результата
   — bullets: РОВНО 3 пункта в формате "01 Действие", "02 Действие", "03 Действие"

4. Результат (railTitle: "Результат")
   — title: заголовок про итог, до 6 слов
   — subtitle: главный итог одной строкой
   — bullets: 3–4 конкретных пункта

5. Для кого (railTitle: "Для кого")
   — title: до 5 слов
   — subtitle: одна строка
   — bullets: РОВНО 3 пункта в формате "Роль — Конкретная задача"

6. Следующий шаг (railTitle: "След. шаг")
   — title: до 6 слов
   — subtitle: призыв к действию одной строкой
   — bullets: 3 конкретных действия с деталями

Правила:
- Всегда возвращай ровно 6 слайдов
- Для каждого слайда обязательно верни id от slide-1 до slide-6
- Тексты на русском, деловые, без воды
- Не используй плейсхолдеры вроде [вставьте текст]
- Отвечай строго в JSON без markdown-оберток

Формат:
{
  "slides": [
    {
      "id": "slide-1",
      "railTitle": "Обложка",
      "title": "...",
      "subtitle": "...",
      "bullets": ["...", "...", "..."]
    }
  ],
  "assistantMessage": "Черновик готов. Смотрите слайды — можно уточнять или менять через чат."
}`;

const CHAT_SYSTEM = `Ты помощник по деловой презентации. У пользователя есть черновик из 6 слайдов, и он может просить изменения или задавать вопросы.

Правила:
- Если пользователь просит что-то изменить — верни обновленный массив slides
- Если пользователь просто уточняет — можешь оставить slides без изменений
- Не добавляй и не удаляй слайды, всегда возвращай ровно 6
- Для каждого слайда обязательно верни id от slide-1 до slide-6
- Тексты деловые, лаконичные, без плейсхолдеров
- assistantMessage — краткий ответ пользователю на русском
- Отвечай строго в JSON без markdown-оберток

Формат:
{
  "slides": [...],
  "assistantMessage": "..."
}`;

type DraftRequestBody =
  | {
      mode: "generate";
      prompt?: unknown;
    }
  | {
      mode: "chat";
      userMessage?: unknown;
      history?: unknown;
      slides?: unknown;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHistory(history: unknown): DraftChatMessage[] {
  if (history === undefined) {
    return [];
  }

  if (!Array.isArray(history)) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "История draft-чата должна быть массивом сообщений.",
      400,
    );
  }

  return history.map((entry) => {
    if (!isObject(entry)) {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "История draft-чата содержит сообщение неверного формата.",
        400,
      );
    }

    if (entry.role !== "user" && entry.role !== "assistant") {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "История draft-чата содержит неизвестную роль.",
        400,
      );
    }

    if (typeof entry.text !== "string") {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "История draft-чата содержит сообщение без текста.",
        400,
      );
    }

    return {
      role: entry.role,
      text: entry.text,
    };
  });
}

function assertPrompt(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нужен рабочий запрос для генерации черновика.",
      400,
    );
  }

  return value.trim();
}

function assertChatRequest(body: Extract<DraftRequestBody, { mode: "chat" }>) {
  if (body.slides === undefined) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нет текущего черновика для правки.",
      400,
    );
  }

  let slides: SlideTextEntry[];
  try {
    slides = validateSlides(body.slides);
  } catch {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нужен полный набор из 6 слайдов для draft-чата.",
      400,
    );
  }

  const userMessage =
    typeof body.userMessage === "string" ? body.userMessage.trim() : "";
  if (!userMessage) {
    throw new DraftApiError(
      "INVALID_REQUEST",
      "Нужно сообщение для правки черновика.",
      400,
    );
  }

  return {
    slides,
    history: normalizeHistory(body.history),
    userMessage,
  };
}

async function callOpenAI({
  messages,
  operation,
}: {
  messages: DraftOpenAIMessage[];
  operation: "generate" | "chat";
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new DraftApiError(
      "INTERNAL_ERROR",
      "OPENAI_API_KEY не настроен.",
      500,
    );
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
      const errorText = await res.text();
      throw new DraftApiError(
        "OPENAI_HTTP_ERROR",
        operation === "generate"
          ? `Модель не собрала черновик (OpenAI ${res.status}).`
          : `Модель не обработала сообщение draft-чата (OpenAI ${res.status}).`,
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
          : "Модель не вернула ответ для draft-чата.",
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
        operation === "generate" ? "GENERATE_TIMEOUT" : "CHAT_TIMEOUT",
        operation === "generate"
          ? "Модель не успела собрать черновик. Попробуйте ещё раз."
          : "Модель не успела обработать сообщение. Попробуйте ещё раз.",
        504,
      );
    }

    throw new DraftApiError(
      "OPENAI_HTTP_ERROR",
      operation === "generate"
        ? "Не удалось получить ответ модели для черновика."
        : "Не удалось получить ответ модели для draft-чата.",
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = (await req.json()) as unknown;
    if (!isObject(rawBody) || (rawBody.mode !== "generate" && rawBody.mode !== "chat")) {
      throw new DraftApiError(
        "INVALID_REQUEST",
        "Неизвестный режим /api/draft.",
        400,
      );
    }

    const body = rawBody as DraftRequestBody;

    if (body.mode === "generate") {
      const prompt = assertPrompt(body.prompt);
      const content = await callOpenAI({
        operation: "generate",
        messages: [
          { role: "system", content: GENERATE_SYSTEM },
          {
            role: "user",
            content: `Тема презентации: ${prompt}`,
          },
        ],
      });

      return NextResponse.json(
        parseDraftModelResponse(
          content,
          "Черновик готов. Смотрите слайды — можно уточнять или менять через чат.",
        ),
      );
    }

    const { slides, history, userMessage } = assertChatRequest(body);
    const content = await callOpenAI({
      operation: "chat",
      messages: buildChatMessages({
        systemPrompt: CHAT_SYSTEM,
        slides,
        history,
        userMessage,
      }),
    });

    return NextResponse.json(parseDraftModelResponse(content, "Готово."));
  } catch (error) {
    const draftError =
      error instanceof DraftApiError
        ? error
        : new DraftApiError(
            "INTERNAL_ERROR",
            error instanceof Error ? error.message : "Internal error",
            500,
          );

    console.error("[api/draft]", draftError);

    return NextResponse.json(
      { error: draftError.message, code: draftError.code },
      { status: draftError.status },
    );
  }
}
