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

const GENERATE_SYSTEM = `Ты эксперт по деловым презентациям. Твоя задача — сгенерировать содержимое для 6 слайдов по строго заданной структуре.

Структура и формат КАЖДОГО слайда обязательны:

1. Обложка (railTitle: "Обложка")
   — title: название темы или сервиса, до 7 слов
   — subtitle: одна строка — для кого или контекст
   — bullets: 2–3 meta-строки (напр. "Апрель 2026", "команды и руководители")

2. Проблема (railTitle: "Проблема")
   — title: заголовок про проблему, до 6 слов
   — subtitle: суть проблемы одной строкой
   — bullets: РОВНО 3 пункта в формате "ЧИСЛО — описание"
     Примеры: "4–8 ч — на подготовку", "80% — уходит на форму", "x2 — переделок после"
     Числа должны быть конкретными и реалистичными для темы

3. Три шага (railTitle: "Три шага")
   — title: заголовок про процесс, до 6 слов
   — subtitle: одна строка — обещание результата
   — bullets: РОВНО 3 пункта в формате "01 Действие", "02 Действие", "03 Действие"
     Примеры: "01 Расскажи задачу", "02 Ответь на 2–3 вопроса", "03 Получи черновик"

4. Результат (railTitle: "Результат")
   — title: заголовок про итог, до 6 слов
   — subtitle: главный итог одной строкой
   — bullets: 3–4 конкретных пункта — что получает пользователь

5. Для кого (railTitle: "Для кого")
   — title: до 5 слов
   — subtitle: одна строка
   — bullets: РОВНО 3 пункта в формате "Роль — Конкретная задача"
     Примеры: "Разработчик — Собрать ретро за 10 минут", "Тимлид — Показать статус команды"

6. Следующий шаг (railTitle: "След. шаг")
   — title: до 6 слов
   — subtitle: призыв к действию одной строкой
   — bullets: 3 конкретных действия с деталями

Правила:
- Всегда возвращай ровно 6 слайдов
- Тексты на русском, деловые, без воды
- Не используй плейсхолдеры вроде [вставьте текст]
- Числа в слайде 2 — конкретные, реалистичные для темы

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
  "assistantMessage": "Черновик готов. Смотрите слайды — можно уточнять или менять через чат."
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
