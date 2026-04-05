import { NextRequest, NextResponse } from "next/server";
import type { DraftChatMessage, SlideTextEntry, SlideId } from "@/lib/presentation-types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-5.4-mini";

const SLIDE_IDS: SlideId[] = [
  "slide-1",
  "slide-2",
  "slide-3",
  "slide-4",
  "slide-5",
  "slide-6",
];

const GENERATE_SYSTEM = `Ты эксперт по деловым презентациям. Твоя задача — сгенерировать содержимое для 6 слайдов презентации на русском языке.

Структура всегда такая:
1. Обложка — тема, контекст
2. Контекст — текущая ситуация, исходная точка
3. Суть — главная идея, ключевое предложение
4. Доказательство — факты, результаты, данные
5. Риски / барьеры — что мешает, что важно учесть
6. Следующий шаг — конкретное действие, дедлайн, призыв

Правила:
- Всегда возвращай ровно 6 слайдов в JSON
- Даже если данных мало — заполни слайды правдоподобным деловым содержанием, не используй плейсхолдеры вроде [вставьте текст]
- Тексты лаконичные, без воды в буллетах (не более 10 слов на пункт)
- 3–4 буллета на слайд
- title — не длиннее 7 слов
- subtitle — одно предложение-подзаголовок

Отвечай строго в JSON без markdown-оберток:
{
  "slides": [
    {
      "id": "slide-1",
      "railTitle": "Обложка",
      "title": "...",
      "subtitle": "...",
      "bullets": ["...", "...", "..."]
    },
    ...
  ],
  "assistantMessage": "Вот черновик из 6 слайдов. Можете уточнять или редактировать прямо здесь."
}`;

const CHAT_SYSTEM = `Ты помощник по деловой презентации. У пользователя есть черновик из 6 слайдов, и он может задавать вопросы или просить изменения.

Правила:
- Если пользователь просит что-то изменить в слайдах — верни обновлённый массив slides с изменениями
- Если пользователь просто общается — верни slides без изменений
- Не добавляй и не удаляй слайды, всегда возвращай ровно 6
- Тексты деловые, лаконичные, без плейсхолдеров
- assistantMessage — краткий ответ пользователю на русском

Отвечай строго в JSON без markdown-оберток:
{
  "slides": [...],
  "assistantMessage": "..."
}`;

function parseJsonFromText(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function validateSlides(raw: unknown): SlideTextEntry[] {
  if (!Array.isArray(raw)) throw new Error("slides is not array");

  return SLIDE_IDS.map((id, i) => {
    const item = (raw[i] ?? {}) as Record<string, unknown>;
    return {
      id,
      railTitle: typeof item.railTitle === "string" ? item.railTitle : `Слайд ${i + 1}`,
      title: typeof item.title === "string" ? item.title : "",
      subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
      bullets: Array.isArray(item.bullets)
        ? (item.bullets as unknown[]).filter((b) => typeof b === "string") as string[]
        : [],
    };
  });
}

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_completion_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mode: "generate" | "chat";
      prompt?: string;
      userMessage?: string;
      history?: DraftChatMessage[];
      slides?: SlideTextEntry[];
    };

    if (body.mode === "generate") {
      const prompt = body.prompt ?? "";
      const content = await callOpenAI([
        { role: "system", content: GENERATE_SYSTEM },
        {
          role: "user",
          content: `Тема презентации: ${prompt || "Бизнес-обзор"}`,
        },
      ]);

      const parsed = parseJsonFromText(content) as { slides: unknown; assistantMessage: unknown };
      const slides = validateSlides(parsed.slides);
      const assistantMessage =
        typeof parsed.assistantMessage === "string"
          ? parsed.assistantMessage
          : "Черновик готов. Редактируйте слайды или уточняйте через чат.";

      return NextResponse.json({ slides, assistantMessage });
    }

    if (body.mode === "chat") {
      const history = body.history ?? [];
      const slides = body.slides ?? [];
      const userMessage = body.userMessage ?? "";

      const historyMessages = history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const slidesJson = JSON.stringify(slides, null, 2);

      const content = await callOpenAI([
        { role: "system", content: CHAT_SYSTEM },
        {
          role: "user",
          content: `Текущие слайды:\n${slidesJson}\n\nСообщение пользователя: ${userMessage}`,
        },
        ...historyMessages.slice(-6),
        {
          role: "user",
          content: userMessage,
        },
      ]);

      const parsed = parseJsonFromText(content) as { slides: unknown; assistantMessage: unknown };
      const updatedSlides = validateSlides(parsed.slides ?? slides);
      const assistantMessage =
        typeof parsed.assistantMessage === "string"
          ? parsed.assistantMessage
          : "Готово.";

      return NextResponse.json({ slides: updatedSlides, assistantMessage });
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  } catch (err) {
    console.error("[api/draft]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
