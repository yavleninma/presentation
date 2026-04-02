import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  buildOutlinePrompt,
  buildSlideContentPrompt,
  SYSTEM_PROMPT,
} from "@/lib/generation/prompts";
import { searchSingleImage } from "@/lib/images/pexels";
import { SlideContent, SlideLayoutType } from "@/types/presentation";

export const maxDuration = 60;

const MIN_SLIDES = 1;
const MAX_SLIDES = 10;
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RawOutlineSlide = {
  title?: string;
  layout?: SlideLayoutType;
  keyPoints?: string[];
  speakerNotes?: string;
};

function normalizeOutlineSlides(
  rawSlides: RawOutlineSlide[],
  slideCount: number
): Array<{
  title: string;
  layout: SlideLayoutType;
  keyPoints?: string[];
  speakerNotes?: string;
}> {
  const validSlides = rawSlides
    .filter((slide): slide is Required<Pick<RawOutlineSlide, "title" | "layout">> & RawOutlineSlide =>
      typeof slide?.title === "string" &&
      slide.title.trim().length > 0 &&
      typeof slide?.layout === "string"
    )
    .map((slide) => ({
      title: slide.title.trim(),
      layout: slide.layout,
      keyPoints: slide.keyPoints?.filter(Boolean).slice(0, 4),
      speakerNotes: slide.speakerNotes?.trim(),
    }));

  if (slideCount <= 1) {
    const first = validSlides[0];
    return [
      {
        title: first?.title || "Ключевой вывод",
        layout: "title",
        keyPoints: first?.keyPoints,
        speakerNotes: first?.speakerNotes,
      },
    ];
  }

  const thankYouSlide = validSlides.findLast((slide) => slide.layout === "thank-you");
  const bodySlides = validSlides.filter((slide) => slide.layout !== "thank-you");
  const normalized = bodySlides.slice(0, Math.max(slideCount - 1, 1));

  if (!normalized.length) {
    normalized.push({
      title: "Главный вывод",
      layout: "title",
      keyPoints: ["Кратко зафиксируйте главную мысль презентации"],
      speakerNotes: "Коротко задайте контекст и объясните, зачем аудитории этот материал.",
    });
  }

  normalized[0] = {
    ...normalized[0],
    layout: "title",
  };

  while (normalized.length < slideCount - 1) {
    const index = normalized.length + 1;
    normalized.push({
      title: `Вывод ${index}`,
      layout: index % 2 === 0 ? "content" : "section",
      keyPoints: [
        "Соберите один важный аргумент в пользу следующего шага",
        "Зафиксируйте ожидаемый эффект для бизнеса",
      ],
      speakerNotes:
        "Кратко свяжите этот слайд с общей логикой презентации и обозначьте переход к следующему блоку.",
    });
  }

  return [
    ...normalized.slice(0, slideCount - 1),
    thankYouSlide || {
      title: "Спасибо!",
      layout: "thank-you",
      keyPoints: ["Подведите итог и обозначьте следующий шаг"],
      speakerNotes:
        "Закройте презентацию коротким summary и пригласите аудиторию к следующему действию.",
    },
  ];
}

function clampSlideCount(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 10;
  return Math.min(MAX_SLIDES, Math.max(MIN_SLIDES, Math.round(n)));
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

async function generateJSON(
  openai: OpenAI,
  systemPrompt: string,
  userPrompt: string
): Promise<Record<string, unknown>> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, slideCount: slideCountRaw, language = "ru", templateId = "sovcombank" } =
      body;
    const slideCount = clampSlideCount(slideCountRaw ?? 10);

    if (!topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    const openai = getOpenAI();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
          );
        };

        try {
          send("phase", "outline-review");
          send("thinking", {
            message: "Анализирую запрос и собираю narrative презентации",
            detail: "Определяю структуру, плотность контента и баланс между текстом и визуалом.",
            progress: 6,
          });
          send("researching", {
            message: "Готовлю план и ключевые тезисы",
            detail: "Собираю outline, секции и speaker notes для будущих слайдов.",
            progress: 14,
          });

          const outlinePrompt = buildOutlinePrompt(topic, slideCount, language);
          const outlineData = await generateJSON(
            openai,
            SYSTEM_PROMPT,
            outlinePrompt
          );

          const outlineSlides = normalizeOutlineSlides(
            (outlineData.slides as RawOutlineSlide[]) ?? [],
            slideCount
          );
          const presentationTitle = (outlineData.title as string) ?? topic;
          const normalizedOutline = {
            title: presentationTitle,
            slides: outlineSlides,
          };

          send("outline", normalizedOutline);
          const slides = [];

          send("researching", {
            message: "План готов — начинаю собирать слайды по одному",
            detail: `${outlineSlides.length} слайдов, ${new Set(outlineSlides.map((slide) => slide.layout)).size} типов layout.`,
            progress: 22,
          });

          for (let i = 0; i < outlineSlides.length; i++) {
            const os = outlineSlides[i];
            const progress = Math.round(24 + (i / Math.max(outlineSlides.length, 1)) * 66);

            send("phase", "generating");
            send("slide_start", {
              message: `Генерирую слайд ${i + 1} из ${outlineSlides.length}`,
              detail: `«${os.title}»`,
              progress,
              slideIndex: i + 1,
              totalSlides: outlineSlides.length,
              slideTitle: os.title,
            });

            const slidePrompt = buildSlideContentPrompt(
              os.title,
              os.layout,
              os.keyPoints,
              presentationTitle,
              i,
              outlineSlides.length
            );

            const slideContent = await generateJSON(
              openai,
              SYSTEM_PROMPT,
              slidePrompt
            );

            const {
              speakerNotes,
              ...contentFields
            } = slideContent as SlideContent & { speakerNotes?: string };
            const normalizedContent = contentFields as SlideContent;

            const imageQuery = normalizedContent.imageQuery;
            if (imageQuery && !normalizedContent.imageUrl) {
              const size =
                os.layout === "full-image" ? "large2x" : "landscape";
              send("image_search", {
                message: `Подбираю визуал для слайда ${i + 1}`,
                detail: `Поисковый запрос: ${imageQuery}`,
                progress: Math.min(progress + 6, 92),
                slideIndex: i + 1,
                totalSlides: outlineSlides.length,
                slideTitle: os.title,
              });
              const imageUrl = await searchSingleImage(imageQuery, size);
              if (imageUrl) {
                normalizedContent.imageUrl = imageUrl;
              }
            }

            const slide = {
              id: crypto.randomUUID(),
              order: i,
              layout: os.layout,
              content: normalizedContent,
              notes:
                speakerNotes?.trim() ||
                os.speakerNotes?.trim() ||
                os.keyPoints?.join("; ") ||
                "",
            };

            slides.push(slide);
            send("slide", slide);
          }

          send("phase", "polishing");
          send("polishing", {
            message: "Финализирую презентацию",
            detail: "Проверяю notes, изображения и общую консистентность стиля перед выдачей.",
            progress: 96,
          });
          await sleep(450);

          const presentation = {
            id: crypto.randomUUID(),
            title: presentationTitle,
            prompt: topic,
            templateId,
            language,
            slides,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          send("phase", "complete");
          send("presentation", presentation);
        } catch (err) {
          send("error", {
            message: err instanceof Error ? err.message : "Generation failed",
          });
          send("phase", "error");
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
